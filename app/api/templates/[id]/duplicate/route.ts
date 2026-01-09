import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const { id } = params;
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Fetch original template with all structure
        const originalTemplate = await db.template.findUnique({
            where: { id },
            include: {
                sections: {
                    include: {
                        items: true,
                    },
                    orderBy: { order: "asc" },
                },
            },
        });

        if (!originalTemplate) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // 2. Create duplicate in a transaction
        const duplicate = await db.$transaction(async (tx) => {
            // Create the template
            const newTemplate = await tx.template.create({
                data: {
                    createdById: userId,
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
    } catch (error: any) {
        console.error("Duplication Error:", error?.message || error);
        return NextResponse.json(
            { error: "Internal server error", details: error?.message },
            { status: 500 }
        );
    }
}
