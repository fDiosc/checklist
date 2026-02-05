import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hasWorkspaceAccess } from "@/lib/workspace-context";

const updateTemplateSchema = z.object({
    name: z.string().min(1),
    folder: z.string().min(1),
    requiresProducerIdentification: z.boolean().optional(),
    isContinuous: z.boolean().optional(),
    actionPlanPromptId: z.string().nullable().optional(),
    sections: z.array(z.any()).optional(),
});

export async function GET(
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

        const template = await db.template.findUnique({
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
                _count: {
                    select: { checklists: true },
                },
            },
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Check workspace access
        if (!hasWorkspaceAccess(session, template.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(template);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("GET Template Error:", errorMessage);
        return NextResponse.json(
            { error: "Internal server error", details: errorMessage },
            { status: 500 }
        );
    }
}

export async function PATCH(
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

        const body = await req.json();
        const validatedData = updateTemplateSchema.parse(body);

        const templateUsage = await db.template.findUnique({
            where: { id },
            include: { _count: { select: { checklists: true } } },
        });

        if (!templateUsage) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Check workspace access
        if (!hasWorkspaceAccess(session, templateUsage.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const isUsed = templateUsage._count.checklists > 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedTemplate = await db.$transaction(async (tx: any) => {
            const t = await tx.template.update({
                where: { id },
                data: {
                    name: validatedData.name,
                    folder: validatedData.folder,
                    requiresProducerIdentification: validatedData.requiresProducerIdentification,
                    isContinuous: validatedData.isContinuous,
                    actionPlanPromptId: validatedData.actionPlanPromptId,
                },
            });

            if (!isUsed && body.sections) {
                await tx.item.deleteMany({ where: { section: { templateId: id } } });
                await tx.section.deleteMany({ where: { templateId: id } });

                for (const section of body.sections) {
                    const createdSection = await tx.section.create({
                        data: {
                            templateId: id,
                            name: section.name,
                            iterateOverFields: section.iterateOverFields,
                            order: section.order || 0,
                        },
                    });

                    if (section.items && section.items.length > 0) {
                        await tx.item.createMany({
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            data: section.items.map((item: any, iIdx: number) => ({
                                sectionId: createdSection.id,
                                name: item.name,
                                type: item.type,
                                required: item.required ?? true,
                                validityControl: item.validityControl ?? false,
                                observationEnabled: item.observationEnabled ?? false,
                                requestArtifact: item.requestArtifact ?? false,
                                askForQuantity: item.askForQuantity ?? false,
                                options: item.options || [],
                                databaseSource: item.databaseSource || null,
                                order: iIdx,
                            })),
                        });
                    }
                }
            }
            return t;
        });

        return NextResponse.json(updatedTemplate);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("PATCH Template Error:", errorMessage);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error", details: errorMessage }, { status: 500 });
    }
}

export async function DELETE(
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

        // Verificar se template existe e não está em uso
        const template = await db.template.findUnique({
            where: { id },
            include: { _count: { select: { checklists: true } } },
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Check workspace access
        if (!hasWorkspaceAccess(session, template.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (template._count.checklists > 0) {
            return NextResponse.json(
                { error: "Não é possível excluir um template que já foi utilizado em checklists" },
                { status: 400 }
            );
        }

        // Deletar template (sections e items serão deletados em cascata)
        await db.template.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("DELETE Template Error:", errorMessage);
        return NextResponse.json(
            { error: "Internal server error", details: errorMessage },
            { status: 500 }
        );
    }
}
