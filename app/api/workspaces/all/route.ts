'use server';

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/workspace-context";

// GET /api/workspaces/all - List ALL workspaces with hierarchy (for user assignment)
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can list all workspaces
        if (!isSuperAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get all parent workspaces with their subworkspaces
        const parentWorkspaces = await db.workspace.findMany({
            where: {
                parentWorkspaceId: null
            },
            select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                hasSubworkspaces: true,
                subworkspaces: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logoUrl: true,
                        cnpj: true,
                    },
                    orderBy: { name: 'asc' }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Return hierarchical structure for drill-down UI
        return NextResponse.json({
            workspaces: parentWorkspaces.map(ws => ({
                id: ws.id,
                name: ws.name,
                slug: ws.slug,
                logoUrl: ws.logoUrl,
                hasSubworkspaces: ws.hasSubworkspaces,
                subworkspaces: ws.subworkspaces
            }))
        });
    } catch (error) {
        console.error("Error fetching all workspaces:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
