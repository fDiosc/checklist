'use server';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/workspace-context";
import { z } from "zod";

const createWorkspaceSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    slug: z.string().min(1, "Slug é obrigatório").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
    logoUrl: z.string().url().optional().nullable(),
});

// GET /api/workspaces - List workspaces
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can list all workspaces
        if (!isSuperAdmin(session)) {
            // Regular users can only see their own workspace
            if (session.user.workspaceId) {
                const workspace = await db.workspace.findUnique({
                    where: { id: session.user.workspaceId },
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
                return NextResponse.json(workspace ? [workspace] : []);
            }
            return NextResponse.json([]);
        }

        const workspaces = await db.workspace.findMany({
            where: {
                // Only show parent workspaces (not subworkspaces) in main list
                parentWorkspaceId: null
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        producers: true,
                        templates: true,
                        checklists: true,
                        subworkspaces: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(workspaces);
    } catch (error) {
        console.error("Error fetching workspaces:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/workspaces - Create workspace
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can create workspaces
        if (!isSuperAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const validation = createWorkspaceSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ 
                error: "Dados inválidos", 
                details: validation.error.flatten() 
            }, { status: 400 });
        }

        const { name, slug, logoUrl } = validation.data;

        // Check if slug already exists
        const existingWorkspace = await db.workspace.findUnique({
            where: { slug }
        });

        if (existingWorkspace) {
            return NextResponse.json({ error: "Slug já está em uso" }, { status: 400 });
        }

        const workspace = await db.workspace.create({
            data: {
                name,
                slug,
                logoUrl: logoUrl || null,
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

        return NextResponse.json(workspace, { status: 201 });
    } catch (error) {
        console.error("Error creating workspace:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
