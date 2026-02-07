import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getCreateWorkspaceId } from "@/lib/workspace-context";

const itemConditionSchema = z.object({
    scopeFieldId: z.string(), // Will be resolved to actual ID after creation
    scopeFieldIndex: z.number().optional(), // Index reference for creation flow
    operator: z.enum(["EQ", "NEQ", "GT", "LT", "GTE", "LTE"]),
    value: z.string(),
    action: z.enum(["REMOVE", "OPTIONAL"]),
});

const itemSchema = z.object({
    name: z.string(),
    type: z.enum([
        "FILE", "TEXT", "LONG_TEXT", "SINGLE_CHOICE", "MULTIPLE_CHOICE",
        "DATE", "PROPERTY_MAP", "FIELD_SELECTOR", "DROPDOWN_SELECT",
    ]),
    required: z.boolean().optional(),
    validityControl: z.boolean().optional(),
    observationEnabled: z.boolean().optional(),
    requestArtifact: z.boolean().optional(),
    artifactRequired: z.boolean().optional(),
    askForQuantity: z.boolean().optional(),
    options: z.array(z.string()).optional(),
    databaseSource: z.string().nullable().optional(),
    // Level-based fields
    classificationIndex: z.number().nullable().optional(), // Index into classifications array
    blocksAdvancementToLevelIndex: z.number().nullable().optional(), // Index into levels array
    allowNA: z.boolean().optional(),
    responsible: z.string().nullable().optional(),
    reference: z.string().nullable().optional(),
    conditions: z.array(itemConditionSchema).optional(),
});

const createTemplateSchema = z.object({
    name: z.string().min(1),
    folder: z.string().min(1),
    requiresProducerIdentification: z.boolean().optional(),
    isContinuous: z.boolean().optional(),
    actionPlanPromptId: z.string().nullable().optional(),
    // Level-based fields
    isLevelBased: z.boolean().optional(),
    levelAccumulative: z.boolean().optional(),
    levels: z.array(z.object({
        name: z.string().min(1),
        order: z.number(),
    })).optional(),
    classifications: z.array(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        order: z.number(),
        requiredPercentage: z.number().min(0).max(100),
    })).optional(),
    scopeFields: z.array(z.object({
        name: z.string().min(1),
        type: z.enum(["NUMBER", "YES_NO", "TEXT", "SELECT"]),
        options: z.array(z.string()).optional(),
        order: z.number(),
    })).optional(),
    sections: z.array(
        z.object({
            name: z.string(),
            iterateOverFields: z.boolean().optional(),
            levelIndex: z.number().nullable().optional(), // Index into levels array
            items: z.array(itemSchema),
        })
    ),
});

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceId = getCreateWorkspaceId(session);
        const body = await req.json();
        const validatedData = createTemplateSchema.parse(body);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const template = await db.$transaction(async (tx: any) => {
            // 1. Create the template
            const t = await tx.template.create({
                data: {
                    workspaceId,
                    name: validatedData.name,
                    folder: validatedData.folder,
                    requiresProducerIdentification: validatedData.requiresProducerIdentification ?? false,
                    isContinuous: validatedData.isContinuous ?? false,
                    actionPlanPromptId: validatedData.actionPlanPromptId,
                    createdById: session.user.id,
                    isLevelBased: validatedData.isLevelBased ?? false,
                    levelAccumulative: validatedData.levelAccumulative ?? false,
                },
            });

            // 2. Create levels (if level-based)
            const levelIdMap: Record<number, string> = {};
            if (validatedData.levels?.length) {
                for (const level of validatedData.levels) {
                    const created = await tx.templateLevel.create({
                        data: { templateId: t.id, name: level.name, order: level.order },
                    });
                    levelIdMap[level.order] = created.id;
                }
            }

            // 3. Create classifications (if level-based)
            const classificationIdMap: Record<number, string> = {};
            if (validatedData.classifications?.length) {
                for (let i = 0; i < validatedData.classifications.length; i++) {
                    const cls = validatedData.classifications[i];
                    const created = await tx.templateClassification.create({
                        data: {
                            templateId: t.id,
                            name: cls.name,
                            code: cls.code,
                            order: cls.order,
                            requiredPercentage: cls.requiredPercentage,
                        },
                    });
                    classificationIdMap[i] = created.id;
                }
            }

            // 4. Create scope fields
            const scopeFieldIdMap: Record<number, string> = {};
            if (validatedData.scopeFields?.length) {
                for (let i = 0; i < validatedData.scopeFields.length; i++) {
                    const sf = validatedData.scopeFields[i];
                    const created = await tx.scopeField.create({
                        data: {
                            templateId: t.id,
                            name: sf.name,
                            type: sf.type,
                            options: sf.options || [],
                            order: sf.order,
                        },
                    });
                    scopeFieldIdMap[i] = created.id;
                }
            }

            // 5. Create sections with items
            for (let sIdx = 0; sIdx < validatedData.sections.length; sIdx++) {
                const section = validatedData.sections[sIdx];
                const levelId = section.levelIndex != null ? levelIdMap[section.levelIndex] : null;

                const createdSection = await tx.section.create({
                    data: {
                        templateId: t.id,
                        name: section.name,
                        order: sIdx,
                        iterateOverFields: section.iterateOverFields ?? false,
                        levelId,
                    },
                });

                for (let iIdx = 0; iIdx < section.items.length; iIdx++) {
                    const item = section.items[iIdx];
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
                            artifactRequired: item.artifactRequired ?? false,
                            askForQuantity: item.askForQuantity ?? false,
                            options: item.options || [],
                            databaseSource: item.databaseSource ?? null,
                            classificationId,
                            blocksAdvancementToLevelId,
                            allowNA: item.allowNA ?? false,
                            responsible: item.responsible ?? null,
                            reference: item.reference ?? null,
                        },
                    });

                    // Create item conditions
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

            // 6. Return full template
            return tx.template.findUnique({
                where: { id: t.id },
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
                },
            });
        });

        return NextResponse.json(template);
    } catch (err: unknown) {
        console.error("Error creating template:", err instanceof Error ? err.message : err);

        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid data", details: err.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: "Internal server error",
                message: err instanceof Error ? err.message : String(err)
            },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");

        const searchFilter = search ? {
            OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { folder: { contains: search, mode: "insensitive" as const } },
            ],
        } : {};

        // SuperAdmin sees all templates
        if (session.user.role === "SUPERADMIN") {
            const templates = await db.template.findMany({
                where: searchFilter,
                include: {
                    _count: {
                        select: { checklists: true, sections: true },
                    },
                    createdBy: {
                        select: { name: true, email: true },
                    },
                    workspace: {
                        select: { name: true, slug: true, parentWorkspaceId: true }
                    }
                },
                orderBy: { createdAt: "desc" },
            });

            return NextResponse.json(templates.map(t => ({
                ...t,
                isAssigned: false,
                isReadOnly: false,
            })));
        }

        if (!session.user.workspaceId) {
            return NextResponse.json({ error: "User has no workspace assigned" }, { status: 403 });
        }

        // Get the user's workspace to check if it's a subworkspace
        const userWorkspace = await db.workspace.findUnique({
            where: { id: session.user.workspaceId },
            select: {
                id: true,
                parentWorkspaceId: true,
                hasSubworkspaces: true,
                subworkspaces: { select: { id: true } }
            }
        });

        if (!userWorkspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // If user is in a subworkspace, get their templates + assigned templates from parent
        if (userWorkspace.parentWorkspaceId) {
            // Get templates owned by this subworkspace
            const ownTemplates = await db.template.findMany({
                where: {
                    workspaceId: session.user.workspaceId,
                    ...searchFilter,
                },
                include: {
                    _count: { select: { checklists: true, sections: true } },
                    createdBy: { select: { name: true, email: true } },
                    workspace: { select: { name: true, slug: true, parentWorkspaceId: true } }
                },
                orderBy: { createdAt: "desc" },
            });

            // Get templates assigned to this subworkspace from parent
            const assignedTemplates = await db.template.findMany({
                where: {
                    assignments: {
                        some: { workspaceId: session.user.workspaceId }
                    },
                    ...searchFilter,
                },
                include: {
                    _count: { select: { checklists: true, sections: true } },
                    createdBy: { select: { name: true, email: true } },
                    workspace: { select: { name: true, slug: true, parentWorkspaceId: true } }
                },
                orderBy: { createdAt: "desc" },
            });

            // Mark assigned templates as read-only
            const allTemplates = [
                ...ownTemplates.map(t => ({ ...t, isAssigned: false, isReadOnly: false })),
                ...assignedTemplates.map(t => ({ ...t, isAssigned: true, isReadOnly: true })),
            ];

            // Sort by createdAt descending
            allTemplates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return NextResponse.json(allTemplates);
        }

        // Parent workspace or regular workspace - get ONLY own templates
        // Subworkspace templates should only appear in the subworkspace view
        const templates = await db.template.findMany({
            where: {
                workspaceId: session.user.workspaceId, // Only own workspace templates
                ...searchFilter,
            },
            include: {
                _count: { select: { checklists: true, sections: true } },
                createdBy: { select: { name: true, email: true } },
                workspace: { select: { name: true, slug: true, parentWorkspaceId: true } },
                assignments: {
                    select: {
                        workspaceId: true,
                        workspace: { select: { name: true, slug: true } }
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(templates.map(t => ({
            ...t,
            isAssigned: false,
            isReadOnly: false, // Own workspace templates are always editable
        })));
    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
