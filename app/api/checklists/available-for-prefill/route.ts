import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWorkspaceFilter } from "@/lib/workspace-context";

/**
 * GET /api/checklists/available-for-prefill?templateId=xxx&producerId=xxx
 * Returns finalized checklists that can be used to pre-fill a new checklist
 */
export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceFilter = getWorkspaceFilter(session);
        const { searchParams } = new URL(req.url);
        const templateId = searchParams.get("templateId");
        const producerId = searchParams.get("producerId");

        if (!templateId) {
            return NextResponse.json(
                { error: "templateId is required" },
                { status: 400 }
            );
        }

        // Find finalized checklists of the same template
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            ...workspaceFilter,
            templateId,
            status: { in: ['APPROVED', 'FINALIZED', 'PARTIALLY_FINALIZED'] },
            // Only original checklists (not corrections/completions)
            type: 'ORIGINAL',
            // Must have at least one approved response
            responses: {
                some: {
                    status: 'APPROVED'
                }
            }
        };

        // Optionally filter by producer
        if (producerId) {
            where.producerId = producerId;
        }

        const checklists = await db.checklist.findMany({
            where,
            select: {
                id: true,
                finalizedAt: true,
                createdAt: true,
                producer: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                _count: {
                    select: {
                        responses: true
                    }
                }
            },
            orderBy: { finalizedAt: 'desc' },
            take: 20 // Limit to last 20 finalized checklists
        });

        return NextResponse.json(checklists);
    } catch (error) {
        console.error("Error fetching checklists for prefill:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
