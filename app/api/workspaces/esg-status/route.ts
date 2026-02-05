import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/workspaces/esg-status - Check if ESG is available for current user's workspace
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceId = session.user.workspaceId;
        if (!workspaceId) {
            return NextResponse.json({ 
                esgEnabled: false, 
                reason: 'NO_WORKSPACE' 
            });
        }

        const workspace = await db.workspace.findUnique({
            where: { id: workspaceId },
            select: {
                id: true,
                esgApiEnabled: true,
                carApiKey: true,
                carCooperativeId: true,
                parentWorkspaceId: true,
                parentWorkspace: {
                    select: {
                        id: true,
                        esgApiEnabled: true,
                        esgEnabledForSubworkspaces: true,
                        carApiKey: true,
                        carCooperativeId: true,
                    }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ 
                esgEnabled: false, 
                reason: 'WORKSPACE_NOT_FOUND' 
            });
        }

        // Check if this is a subworkspace
        if (workspace.parentWorkspaceId) {
            // Subworkspace - check parent's configuration
            const parent = workspace.parentWorkspace;
            if (!parent) {
                return NextResponse.json({ 
                    esgEnabled: false, 
                    reason: 'PARENT_NOT_FOUND' 
                });
            }

            if (!parent.esgApiEnabled) {
                return NextResponse.json({ 
                    esgEnabled: false, 
                    reason: 'PARENT_ESG_DISABLED' 
                });
            }

            if (!parent.esgEnabledForSubworkspaces) {
                return NextResponse.json({ 
                    esgEnabled: false, 
                    reason: 'SUBWORKSPACE_ACCESS_DISABLED' 
                });
            }

            if (!parent.carApiKey || !parent.carCooperativeId) {
                return NextResponse.json({ 
                    esgEnabled: false, 
                    reason: 'PARENT_MISSING_CREDENTIALS' 
                });
            }

            return NextResponse.json({ 
                esgEnabled: true,
                reason: 'ENABLED_VIA_PARENT'
            });
        }

        // Parent workspace - check direct configuration
        if (!workspace.esgApiEnabled) {
            return NextResponse.json({ 
                esgEnabled: false, 
                reason: 'ESG_DISABLED' 
            });
        }

        if (!workspace.carApiKey || !workspace.carCooperativeId) {
            return NextResponse.json({ 
                esgEnabled: false, 
                reason: 'MISSING_CREDENTIALS' 
            });
        }

        return NextResponse.json({ 
            esgEnabled: true,
            reason: 'ENABLED'
        });

    } catch (error) {
        console.error("Error checking ESG status:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
