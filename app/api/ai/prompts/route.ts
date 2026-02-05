import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get workspace-specific prompts first, then global prompts as fallback
        const workspaceId = session.user.workspaceId;

        const prompts = await db.aiPrompt.findMany({
            where: workspaceId ? {
                OR: [
                    { workspaceId: workspaceId },
                    { workspaceId: null } // Global prompts
                ]
            } : {
                workspaceId: null // Only global prompts for SuperAdmin without workspace
            },
            select: {
                id: true,
                slug: true,
                description: true,
                workspaceId: true,
            },
            orderBy: {
                slug: 'asc'
            }
        });

        return NextResponse.json(prompts);
    } catch (error) {
        console.error("Error fetching AI prompts:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
