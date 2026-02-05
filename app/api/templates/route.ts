import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getSubworkspaceFilter, getCreateWorkspaceId } from "@/lib/workspace-context";

const createTemplateSchema = z.object({
    name: z.string().min(1),
    folder: z.string().min(1),
    requiresProducerIdentification: z.boolean().optional(),
    isContinuous: z.boolean().optional(),
    actionPlanPromptId: z.string().nullable().optional(),
    sections: z.array(
        z.object({
            name: z.string(),
            iterateOverFields: z.boolean().optional(),
            items: z.array(
                z.object({
                    name: z.string(),
                    type: z.enum([
                        "FILE",
                        "TEXT",
                        "LONG_TEXT",
                        "SINGLE_CHOICE",
                        "MULTIPLE_CHOICE",
                        "DATE",
                        "PROPERTY_MAP",
                        "FIELD_SELECTOR",
                        "DROPDOWN_SELECT",
                    ]),
                    required: z.boolean().optional(),
                    validityControl: z.boolean().optional(),
                    observationEnabled: z.boolean().optional(),
                    requestArtifact: z.boolean().optional(),
                    artifactRequired: z.boolean().optional(),
                    askForQuantity: z.boolean().optional(),
                    options: z.array(z.string()).optional(),
                    databaseSource: z.string().nullable().optional(),
                })
            ),
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

        const template = await db.template.create({
            data: {
                workspaceId,
                name: validatedData.name,
                folder: validatedData.folder,
                requiresProducerIdentification:
                    validatedData.requiresProducerIdentification ?? false,
                isContinuous: validatedData.isContinuous ?? false,
                actionPlanPromptId: validatedData.actionPlanPromptId,
                createdById: session.user.id,
                sections: {
                    create: validatedData.sections.map((section, sIdx) => ({
                        name: section.name,
                        order: sIdx,
                        iterateOverFields: section.iterateOverFields ?? false,
                        items: {
                            create: section.items.map((item, iIdx) => ({
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
                                databaseSource: item.databaseSource,
                            })),
                        },
                    })),
                },
            },
            include: {
                sections: {
                    include: { items: { orderBy: { order: 'asc' } } },
                    orderBy: { order: "asc" },
                },
            },
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

        // Parent workspace or regular workspace - get own templates only
        // If has subworkspaces, also include all subworkspace templates
        const workspaceIds = userWorkspace.hasSubworkspaces && userWorkspace.subworkspaces.length > 0
            ? [session.user.workspaceId, ...userWorkspace.subworkspaces.map(sw => sw.id)]
            : [session.user.workspaceId];

        const templates = await db.template.findMany({
            where: {
                workspaceId: { in: workspaceIds },
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
            isReadOnly: t.workspaceId !== session.user.workspaceId, // Read-only if from subworkspace
        })));
    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
