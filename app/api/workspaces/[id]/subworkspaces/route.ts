import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { isSuperAdmin, hasWorkspaceAccess } from "@/lib/workspace-context";

const createSubworkspaceSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    cnpj: z.string().optional(),
    logoUrl: z.string().url().optional(),
});

// GET - List all subworkspaces of a parent workspace
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: parentWorkspaceId } = await params;

        // Only users with access to the parent workspace can see subworkspaces
        if (!hasWorkspaceAccess(session, parentWorkspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Check if the workspace has subworkspaces enabled
        const parentWorkspace = await db.workspace.findUnique({
            where: { id: parentWorkspaceId },
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
                        cnpj: true,
                        createdAt: true,
                        _count: {
                            select: {
                                users: true,
                                checklists: true,
                                producers: true
                            }
                        }
                    },
                    orderBy: { name: 'asc' }
                }
            }
        });

        if (!parentWorkspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        return NextResponse.json({
            parentWorkspace: {
                id: parentWorkspace.id,
                name: parentWorkspace.name,
                hasSubworkspaces: parentWorkspace.hasSubworkspaces
            },
            subworkspaces: parentWorkspace.subworkspaces
        });
    } catch (error) {
        console.error("Error fetching subworkspaces:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// POST - Create a new subworkspace (SuperAdmin only)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can create subworkspaces
        if (!isSuperAdmin(session)) {
            return NextResponse.json(
                { error: "Only SuperAdmin can create subworkspaces" },
                { status: 403 }
            );
        }

        const { id: parentWorkspaceId } = await params;
        const body = await req.json();
        const validatedData = createSubworkspaceSchema.parse(body);

        // Verify parent workspace exists and has subworkspaces enabled
        const parentWorkspace = await db.workspace.findUnique({
            where: { id: parentWorkspaceId },
            select: {
                id: true,
                hasSubworkspaces: true,
                parentWorkspaceId: true
            }
        });

        if (!parentWorkspace) {
            return NextResponse.json({ error: "Parent workspace not found" }, { status: 404 });
        }

        // Cannot create subworkspace of a subworkspace
        if (parentWorkspace.parentWorkspaceId) {
            return NextResponse.json(
                { error: "Cannot create subworkspace of a subworkspace" },
                { status: 400 }
            );
        }

        // Enable hasSubworkspaces if not already enabled
        if (!parentWorkspace.hasSubworkspaces) {
            await db.workspace.update({
                where: { id: parentWorkspaceId },
                data: { hasSubworkspaces: true }
            });
        }

        // Check if slug is unique
        const existingSlug = await db.workspace.findUnique({
            where: { slug: validatedData.slug }
        });

        if (existingSlug) {
            return NextResponse.json(
                { error: "Slug already in use" },
                { status: 400 }
            );
        }

        // Create the subworkspace
        const subworkspace = await db.workspace.create({
            data: {
                name: validatedData.name,
                slug: validatedData.slug,
                cnpj: validatedData.cnpj,
                logoUrl: validatedData.logoUrl,
                parentWorkspaceId: parentWorkspaceId,
                hasSubworkspaces: false // Subworkspaces cannot have their own subworkspaces
            }
        });

        return NextResponse.json(subworkspace);
    } catch (error) {
        console.error("Error creating subworkspace:", error);
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
