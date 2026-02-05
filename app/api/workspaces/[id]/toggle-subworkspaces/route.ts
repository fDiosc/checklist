import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin } from "@/lib/workspace-context";

// POST - Toggle hasSubworkspaces for a workspace (SuperAdmin only)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can toggle subworkspaces
        if (!isSuperAdmin(session)) {
            return NextResponse.json(
                { error: "Only SuperAdmin can manage subworkspace settings" },
                { status: 403 }
            );
        }

        const { id: workspaceId } = await params;
        const body = await req.json();
        const { enabled } = body;

        if (typeof enabled !== 'boolean') {
            return NextResponse.json(
                { error: "enabled must be a boolean" },
                { status: 400 }
            );
        }

        // Verify workspace exists
        const workspace = await db.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                parentWorkspaceId: true,
                _count: {
                    select: { subworkspaces: true }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Cannot enable subworkspaces for a subworkspace
        if (workspace.parentWorkspaceId) {
            return NextResponse.json(
                { error: "Subworkspaces cannot have their own subworkspaces" },
                { status: 400 }
            );
        }

        // Cannot disable if there are existing subworkspaces
        if (!enabled && workspace._count.subworkspaces > 0) {
            return NextResponse.json(
                { error: "Cannot disable subworkspaces while subworkspaces exist. Delete all subworkspaces first." },
                { status: 400 }
            );
        }

        // Update the workspace
        const updatedWorkspace = await db.workspace.update({
            where: { id: workspaceId },
            data: { hasSubworkspaces: enabled }
        });

        return NextResponse.json({
            id: updatedWorkspace.id,
            hasSubworkspaces: updatedWorkspace.hasSubworkspaces
        });
    } catch (error) {
        console.error("Error toggling subworkspaces:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
