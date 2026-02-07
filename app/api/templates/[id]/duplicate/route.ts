import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
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

        // 1. Fetch original template with ALL structure (levels, classifications, scope, sections, items, conditions)
        const originalTemplate = await db.template.findUnique({
            where: { id },
            include: {
                levels: { orderBy: { order: 'asc' } },
                classifications: { orderBy: { order: 'asc' } },
                scopeFields: { orderBy: { order: 'asc' } },
                sections: {
                    include: {
                        items: {
                            include: {
                                conditions: true,
                            },
                            orderBy: { order: 'asc' },
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

        // 2. Create full duplicate in a transaction
        const duplicate = await db.$transaction(async (tx: Prisma.TransactionClient) => {
            // 2a. Create the template with all top-level fields
            const newTemplate = await tx.template.create({
                data: {
                    workspaceId,
                    createdById: session.user.id,
                    name: `${originalTemplate.name} (Cópia)`,
                    folder: originalTemplate.folder,
                    requiresProducerIdentification: originalTemplate.requiresProducerIdentification,
                    isContinuous: originalTemplate.isContinuous,
                    actionPlanPromptId: originalTemplate.actionPlanPromptId,
                    correctionActionPlanPromptId: originalTemplate.correctionActionPlanPromptId,
                    completionActionPlanPromptId: originalTemplate.completionActionPlanPromptId,
                    isLevelBased: originalTemplate.isLevelBased,
                    levelAccumulative: originalTemplate.levelAccumulative,
                    status: 'ACTIVE',
                },
            });

            // 2b. Duplicate levels (old ID -> new ID mapping)
            const levelIdMap: Record<string, string> = {};
            for (const level of originalTemplate.levels) {
                const newLevel = await tx.templateLevel.create({
                    data: {
                        templateId: newTemplate.id,
                        name: level.name,
                        order: level.order,
                    },
                });
                levelIdMap[level.id] = newLevel.id;
            }

            // 2c. Duplicate classifications (old ID -> new ID mapping)
            const classificationIdMap: Record<string, string> = {};
            for (const cls of originalTemplate.classifications) {
                const newCls = await tx.templateClassification.create({
                    data: {
                        templateId: newTemplate.id,
                        name: cls.name,
                        code: cls.code,
                        order: cls.order,
                        requiredPercentage: cls.requiredPercentage,
                    },
                });
                classificationIdMap[cls.id] = newCls.id;
            }

            // 2d. Duplicate scope fields (old ID -> new ID mapping)
            const scopeFieldIdMap: Record<string, string> = {};
            for (const sf of originalTemplate.scopeFields) {
                const newSf = await tx.scopeField.create({
                    data: {
                        templateId: newTemplate.id,
                        name: sf.name,
                        type: sf.type,
                        options: sf.options || [],
                        order: sf.order,
                    },
                });
                scopeFieldIdMap[sf.id] = newSf.id;
            }

            // 2e. Duplicate sections, items, and conditions
            for (const section of originalTemplate.sections) {
                const newSection = await tx.section.create({
                    data: {
                        templateId: newTemplate.id,
                        name: section.name,
                        order: section.order,
                        iterateOverFields: section.iterateOverFields,
                        levelId: section.levelId ? (levelIdMap[section.levelId] || null) : null,
                    },
                });

                for (const item of section.items) {
                    const newItem = await tx.item.create({
                        data: {
                            sectionId: newSection.id,
                            name: item.name,
                            type: item.type,
                            order: item.order,
                            required: item.required,
                            validityControl: item.validityControl,
                            observationEnabled: item.observationEnabled,
                            requestArtifact: item.requestArtifact,
                            artifactRequired: item.artifactRequired,
                            askForQuantity: item.askForQuantity,
                            options: item.options || [],
                            databaseSource: item.databaseSource,
                            classificationId: item.classificationId ? (classificationIdMap[item.classificationId] || null) : null,
                            blocksAdvancementToLevelId: item.blocksAdvancementToLevelId ? (levelIdMap[item.blocksAdvancementToLevelId] || null) : null,
                            allowNA: item.allowNA,
                            responsible: item.responsible,
                            reference: item.reference,
                        },
                    });

                    // Duplicate item conditions
                    if (item.conditions && item.conditions.length > 0) {
                        await tx.itemCondition.createMany({
                            data: item.conditions.map((cond) => ({
                                itemId: newItem.id,
                                scopeFieldId: scopeFieldIdMap[cond.scopeFieldId] || cond.scopeFieldId,
                                operator: cond.operator,
                                value: cond.value,
                                action: cond.action,
                            })),
                        });
                    }
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
