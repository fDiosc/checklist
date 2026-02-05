import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { isSuperAdmin, hasWorkspaceAccess } from "@/lib/workspace-context";

const assignmentSchema = z.object({
    subworkspaceIds: z.array(z.string()),
});

// GET - List template assignments
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: templateId } = await params;

        // Get the template with its workspace info
        const template = await db.template.findUnique({
            where: { id: templateId },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        hasSubworkspaces: true,
                        subworkspaces: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                                logoUrl: true,
                            },
                            orderBy: { name: 'asc' }
                        }
                    }
                },
                assignments: {
                    select: {
                        id: true,
                        workspaceId: true,
                        assignedAt: true,
                        workspace: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            }
                        }
                    }
                }
            }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Check access - must have access to template's workspace
        if (!isSuperAdmin(session) && !hasWorkspaceAccess(session, template.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Return available subworkspaces and current assignments
        return NextResponse.json({
            template: {
                id: template.id,
                name: template.name,
                workspaceId: template.workspaceId,
            },
            parentWorkspace: {
                id: template.workspace.id,
                name: template.workspace.name,
                hasSubworkspaces: template.workspace.hasSubworkspaces,
            },
            availableSubworkspaces: template.workspace.subworkspaces,
            assignments: template.assignments.map(a => ({
                id: a.id,
                workspaceId: a.workspaceId,
                workspaceName: a.workspace.name,
                workspaceSlug: a.workspace.slug,
                assignedAt: a.assignedAt,
            })),
            assignedWorkspaceIds: template.assignments.map(a => a.workspaceId),
        });
    } catch (error) {
        console.error("Error fetching template assignments:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST - Update template assignments (replace all)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: templateId } = await params;
        const body = await req.json();
        const { subworkspaceIds } = assignmentSchema.parse(body);

        // Get the template
        const template = await db.template.findUnique({
            where: { id: templateId },
            include: {
                workspace: {
                    select: {
                        id: true,
                        hasSubworkspaces: true,
                        subworkspaces: {
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Only users with access to the parent workspace can manage assignments
        if (!isSuperAdmin(session) && !hasWorkspaceAccess(session, template.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Validate that all subworkspaceIds are valid subworkspaces of this workspace
        const validSubworkspaceIds = template.workspace.subworkspaces.map(sw => sw.id);
        const invalidIds = subworkspaceIds.filter(id => !validSubworkspaceIds.includes(id));
        
        if (invalidIds.length > 0) {
            return NextResponse.json(
                { error: "Invalid subworkspace IDs", invalidIds },
                { status: 400 }
            );
        }

        // Delete existing assignments and create new ones in a transaction
        await db.$transaction(async (tx) => {
            // Delete all existing assignments for this template
            await tx.templateAssignment.deleteMany({
                where: { templateId }
            });

            // Create new assignments
            if (subworkspaceIds.length > 0) {
                await tx.templateAssignment.createMany({
                    data: subworkspaceIds.map(workspaceId => ({
                        templateId,
                        workspaceId,
                        assignedById: session.user.id,
                    }))
                });
            }
        });

        // Fetch updated assignments
        const updatedAssignments = await db.templateAssignment.findMany({
            where: { templateId },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            assignments: updatedAssignments.map(a => ({
                id: a.id,
                workspaceId: a.workspaceId,
                workspaceName: a.workspace.name,
                workspaceSlug: a.workspace.slug,
                assignedAt: a.assignedAt,
            })),
            assignedWorkspaceIds: updatedAssignments.map(a => a.workspaceId),
        });
    } catch (error) {
        console.error("Error updating template assignments:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid data", details: error.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
