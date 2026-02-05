'use server';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/workspace-context";
import { z } from "zod";

const updateWorkspaceSchema = z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
    logoUrl: z.string().url().nullable().optional(),
});

// GET /api/workspaces/[id] - Get single workspace
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const workspace = await db.workspace.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        producers: true,
                        templates: true,
                        checklists: true,
                    }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
        }

        // Non-SuperAdmin can only view their own workspace
        if (!isSuperAdmin(session) && session.user.workspaceId !== id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        return NextResponse.json(workspace);
    } catch (error) {
        console.error("Error fetching workspace:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT /api/workspaces/[id] - Update workspace
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can update workspaces
        if (!isSuperAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const validation = updateWorkspaceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ 
                error: "Dados inválidos", 
                details: validation.error.flatten() 
            }, { status: 400 });
        }

        const existingWorkspace = await db.workspace.findUnique({
            where: { id }
        });

        if (!existingWorkspace) {
            return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
        }

        const { name, slug, logoUrl } = validation.data;

        // Check if slug is being changed and is unique among peers
        if (slug && slug !== existingWorkspace.slug) {
            // Check uniqueness based on workspace type (parent vs subworkspace)
            const slugExists = await db.workspace.findFirst({
                where: {
                    slug,
                    id: { not: id },
                    // If this is a parent workspace, check among other parent workspaces
                    // If this is a subworkspace, check among siblings (same parent)
                    parentWorkspaceId: existingWorkspace.parentWorkspaceId
                }
            });
            if (slugExists) {
                return NextResponse.json({ error: "Slug já está em uso" }, { status: 400 });
            }
        }

        const workspace = await db.workspace.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(slug !== undefined && { slug }),
                ...(logoUrl !== undefined && { logoUrl }),
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        producers: true,
                        templates: true,
                    }
                }
            }
        });

        return NextResponse.json(workspace);
    } catch (error) {
        console.error("Error updating workspace:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/workspaces/[id] - Delete workspace
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can delete workspaces
        if (!isSuperAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        const workspace = await db.workspace.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        users: true,
                        producers: true,
                        templates: true,
                        checklists: true,
                    }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
        }

        // Check if workspace has any resources
        const totalResources = 
            workspace._count.users + 
            workspace._count.producers + 
            workspace._count.templates + 
            workspace._count.checklists;

        if (totalResources > 0) {
            return NextResponse.json({ 
                error: "Não é possível excluir workspace com recursos vinculados. Remova usuários, produtores, templates e checklists primeiro." 
            }, { status: 400 });
        }

        await db.workspace.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting workspace:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
