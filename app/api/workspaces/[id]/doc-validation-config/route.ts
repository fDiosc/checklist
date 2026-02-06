import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isSuperAdmin, isAdmin } from "@/lib/workspace-context";
import { z } from "zod";

const updateSchema = z.object({
    aiDocValidationEnabled: z.boolean().optional(),
    aiDocValidationEnabledForSubs: z.boolean().optional(),
    aiDocValidationMode: z.enum(["warn", "block"]).optional(),
});

// GET - Get current doc validation config for a workspace
export async function GET(
    req: Request,
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
            select: {
                id: true,
                name: true,
                aiDocValidationEnabled: true,
                aiDocValidationEnabledForSubs: true,
                aiDocValidationMode: true,
                parentWorkspaceId: true,
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // If it's a subworkspace, also check parent config
        let effectiveEnabled = workspace.aiDocValidationEnabled;
        if (workspace.parentWorkspaceId && !effectiveEnabled) {
            const parent = await db.workspace.findUnique({
                where: { id: workspace.parentWorkspaceId },
                select: { aiDocValidationEnabled: true, aiDocValidationEnabledForSubs: true }
            });
            if (parent?.aiDocValidationEnabled && parent?.aiDocValidationEnabledForSubs) {
                effectiveEnabled = true;
            }
        }

        return NextResponse.json({
            ...workspace,
            effectiveEnabled,
        });
    } catch (error) {
        console.error("Error fetching doc validation config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Update doc validation config
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Check permissions: SuperAdmin can configure any workspace's enabled/enabledForSubs.
        // Admin can only change aiDocValidationMode for their own workspace or subworkspaces.
        const workspace = await db.workspace.findUnique({
            where: { id },
            select: { id: true, parentWorkspaceId: true }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        const body = await req.json();
        const validated = updateSchema.parse(body);

        // SuperAdmin can change everything
        if (isSuperAdmin(session)) {
            const updated = await db.workspace.update({
                where: { id },
                data: validated,
            });
            return NextResponse.json(updated);
        }

        // Admin can change mode and enable/disable for their own workspace (not enabledForSubs)
        if (isAdmin(session)) {
            const isOwnWorkspace = session.user.workspaceId === id;
            const isOwnSubworkspace = workspace.parentWorkspaceId === session.user.workspaceId;

            if (!isOwnWorkspace && !isOwnSubworkspace) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }

            // Admin cannot change enabledForSubs (only SuperAdmin)
            if (validated.aiDocValidationEnabledForSubs !== undefined) {
                return NextResponse.json({ error: "Only SuperAdmin can change inheritance settings" }, { status: 403 });
            }

            // Build update data: mode and enabled toggle
            const updateData: Record<string, unknown> = {};
            if (validated.aiDocValidationMode !== undefined) {
                updateData.aiDocValidationMode = validated.aiDocValidationMode;
            }
            if (validated.aiDocValidationEnabled !== undefined) {
                updateData.aiDocValidationEnabled = validated.aiDocValidationEnabled;
            }

            const updated = await db.workspace.update({
                where: { id },
                data: updateData,
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } catch (error) {
        console.error("Error updating doc validation config:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
