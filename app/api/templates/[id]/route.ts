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
    isLevelBased: z.boolean().optional(),
    levelAccumulative: z.boolean().optional(),
    levels: z.array(z.any()).optional(),
    classifications: z.array(z.any()).optional(),
    scopeFields: z.array(z.any()).optional(),
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
                            include: { conditions: true },
                            orderBy: { order: 'asc' },
                        },
                        level: true,
                    },
                    orderBy: { order: "asc" },
                },
                levels: { orderBy: { order: 'asc' } },
                classifications: { orderBy: { order: 'asc' } },
                scopeFields: { orderBy: { order: 'asc' } },
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
            await tx.template.update({
                where: { id },
                data: {
                    name: validatedData.name,
                    folder: validatedData.folder,
                    requiresProducerIdentification: validatedData.requiresProducerIdentification,
                    isContinuous: validatedData.isContinuous,
                    actionPlanPromptId: validatedData.actionPlanPromptId,
                    isLevelBased: validatedData.isLevelBased,
                    levelAccumulative: validatedData.levelAccumulative,
                },
            });

            if (!isUsed) {
                // Rebuild structure: levels, classifications, scope fields, sections, items, conditions
                // Delete in correct order (conditions -> items -> sections, then level-related)
                await tx.itemCondition.deleteMany({ where: { item: { section: { templateId: id } } } });
                await tx.item.deleteMany({ where: { section: { templateId: id } } });
                await tx.section.deleteMany({ where: { templateId: id } });
                await tx.scopeField.deleteMany({ where: { templateId: id } });
                await tx.templateClassification.deleteMany({ where: { templateId: id } });
                await tx.templateLevel.deleteMany({ where: { templateId: id } });

                // Recreate levels
                const levelIdMap: Record<number, string> = {};
                if (body.levels?.length) {
                    for (const level of body.levels) {
                        const created = await tx.templateLevel.create({
                            data: { templateId: id, name: level.name, order: level.order },
                        });
                        levelIdMap[level.order] = created.id;
                    }
                }

                // Recreate classifications
                const classificationIdMap: Record<number, string> = {};
                if (body.classifications?.length) {
                    for (let i = 0; i < body.classifications.length; i++) {
                        const cls = body.classifications[i];
                        const created = await tx.templateClassification.create({
                            data: {
                                templateId: id,
                                name: cls.name,
                                code: cls.code,
                                order: cls.order,
                                requiredPercentage: cls.requiredPercentage ?? 100,
                            },
                        });
                        classificationIdMap[i] = created.id;
                    }
                }

                // Recreate scope fields
                const scopeFieldIdMap: Record<number, string> = {};
                if (body.scopeFields?.length) {
                    for (let i = 0; i < body.scopeFields.length; i++) {
                        const sf = body.scopeFields[i];
                        const created = await tx.scopeField.create({
                            data: {
                                templateId: id,
                                name: sf.name,
                                type: sf.type,
                                options: sf.options || [],
                                order: sf.order,
                            },
                        });
                        scopeFieldIdMap[i] = created.id;
                    }
                }

                // Recreate sections with items and conditions
                if (body.sections?.length) {
                    for (let sIdx = 0; sIdx < body.sections.length; sIdx++) {
                        const section = body.sections[sIdx];
                        const levelId = section.levelIndex != null ? levelIdMap[section.levelIndex] : null;

                        const createdSection = await tx.section.create({
                            data: {
                                templateId: id,
                                name: section.name,
                                iterateOverFields: section.iterateOverFields ?? false,
                                order: section.order ?? sIdx,
                                levelId,
                            },
                        });

                        if (section.items?.length) {
                            for (let iIdx = 0; iIdx < section.items.length; iIdx++) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const item = section.items[iIdx] as any;
                                const classificationId = item.classificationIndex != null
                                    ? classificationIdMap[item.classificationIndex] : null;
                                const blocksAdvancementToLevelId = item.blocksAdvancementToLevelIndex != null
                                    ? levelIdMap[item.blocksAdvancementToLevelIndex] : null;

                                const createdItem = await tx.item.create({
                                    data: {
                                        sectionId: createdSection.id,
                                        name: item.name,
                                        type: item.type,
                                        order: iIdx,
                                        required: item.required ?? true,
                                        validityControl: item.validityControl ?? false,
                                        observationEnabled: item.observationEnabled ?? false,
                                        requestArtifact: item.requestArtifact ?? false,
                                        askForQuantity: item.askForQuantity ?? false,
                                        options: item.options || [],
                                        databaseSource: item.databaseSource || null,
                                        classificationId,
                                        blocksAdvancementToLevelId,
                                        allowNA: item.allowNA ?? false,
                                        responsible: item.responsible || null,
                                        reference: item.reference || null,
                                    },
                                });

                                // Create conditions
                                if (item.conditions?.length) {
                                    for (const cond of item.conditions) {
                                        const scopeFieldId = cond.scopeFieldIndex != null
                                            ? scopeFieldIdMap[cond.scopeFieldIndex]
                                            : cond.scopeFieldId;
                                        if (scopeFieldId) {
                                            await tx.itemCondition.create({
                                                data: {
                                                    itemId: createdItem.id,
                                                    scopeFieldId,
                                                    operator: cond.operator,
                                                    value: cond.value,
                                                    action: cond.action,
                                                },
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Return full template with all relations
            return tx.template.findUnique({
                where: { id },
                include: {
                    sections: {
                        include: {
                            items: {
                                include: { conditions: true },
                                orderBy: { order: 'asc' },
                            },
                            level: true,
                        },
                        orderBy: { order: "asc" },
                    },
                    levels: { orderBy: { order: 'asc' } },
                    classifications: { orderBy: { order: 'asc' } },
                    scopeFields: { orderBy: { order: 'asc' } },
                    _count: { select: { checklists: true } },
                },
            });
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
