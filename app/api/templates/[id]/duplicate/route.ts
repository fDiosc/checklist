import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hasWorkspaceAccess, getCreateWorkspaceId } from "@/lib/workspace-context";

export async function POST(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params;
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch original template with all structure
        const originalTemplate = await db.template.findUnique({
            where: { id },
            include: {
                sections: {
                    include: {
                        items: {
                            orderBy: { order: 'asc' }
                        },
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!originalTemplate) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Check workspace access
        if (!hasWorkspaceAccess(session, originalTemplate.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const workspaceId = getCreateWorkspaceId(session);

        // 2. Create duplicate in a transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const duplicate = await db.$transaction(async (tx: any) => {
            // Create the template
            const newTemplate = await tx.template.create({
                data: {
                    workspaceId,
                    createdById: session.user.id,
                    name: `${originalTemplate.name} (Cópia)`,
                    folder: originalTemplate.folder,
                    requiresProducerIdentification: originalTemplate.requiresProducerIdentification,
                    status: 'ACTIVE',
                },
            });

            // Duplicate sections and items
            for (const section of originalTemplate.sections) {
                const newSection = await tx.section.create({
                    data: {
                        templateId: newTemplate.id,
                        name: section.name,
                        order: section.order,
                        iterateOverFields: section.iterateOverFields,
                    },
                });

                if (section.items && section.items.length > 0) {
                    await tx.item.createMany({
                        data: section.items.map((item) => ({
                            sectionId: newSection.id,
                            name: item.name,
                            type: item.type,
                            order: item.order,
                            required: item.required,
                            validityControl: item.validityControl,
                            observationEnabled: item.observationEnabled,
                            options: item.options || [],
                        })),
                    });
                }
            }

            return newTemplate;
        });

        return NextResponse.json(duplicate);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Duplication Error:", errorMessage);
        return NextResponse.json(
            { error: "Internal server error", details: errorMessage },
            { status: 500 }
        );
    }
}
