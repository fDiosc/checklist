import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - Returns AI doc validation config for a given workspace
// Public endpoint (used by the producer form) - only returns boolean flags
export async function GET(request: NextRequest) {
    try {
        const workspaceId = request.nextUrl.searchParams.get('workspaceId');

        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
        }

        const workspace = await db.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                aiDocValidationEnabled: true,
                aiDocValidationMode: true,
                parentWorkspaceId: true,
            }
        });

        if (!workspace) {
            return NextResponse.json({ enabled: false, mode: 'warn' });
        }

        let enabled = workspace.aiDocValidationEnabled;
        let mode = workspace.aiDocValidationMode;

        // Check parent inheritance
        if (!enabled && workspace.parentWorkspaceId) {
            const parent = await db.workspace.findUnique({
                where: { id: workspace.parentWorkspaceId },
                select: {
                    aiDocValidationEnabled: true,
                    aiDocValidationEnabledForSubs: true,
                    aiDocValidationMode: true,
                }
            });
            if (parent?.aiDocValidationEnabled && parent?.aiDocValidationEnabledForSubs) {
                enabled = true;
                mode = workspace.aiDocValidationMode || parent.aiDocValidationMode;
            }
        }

        return NextResponse.json({
            enabled,
            mode,
        });
    } catch (error) {
        console.error("Error fetching doc validation status:", error);
        return NextResponse.json({ enabled: false, mode: 'warn' });
    }
}
