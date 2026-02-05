import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWorkspaceFilter } from "@/lib/workspace-context";

/**
 * GET /api/checklists/[id]/responses-for-copy
 * Returns responses from a finalized checklist that can be used to pre-fill a new checklist
 */
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
        const workspaceFilter = getWorkspaceFilter(session);

        // Find the checklist and verify it's finalized
        const checklist = await db.checklist.findFirst({
            where: {
                id,
                ...workspaceFilter,
                // Only allow copying from finalized checklists
                status: { in: ['APPROVED', 'FINALIZED', 'PARTIALLY_FINALIZED'] }
            },
            include: {
                responses: {
                    where: {
                        // Only copy approved responses
                        status: 'APPROVED'
                    },
                    select: {
                        itemId: true,
                        fieldId: true,
                        answer: true,
                        quantity: true,
                        observation: true,
                        fileUrl: true,
                        validity: true,
                    }
                },
                template: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                producer: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        if (!checklist) {
            return NextResponse.json(
                { error: "Checklist not found or not finalized" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            checklistId: checklist.id,
            templateId: checklist.template.id,
            templateName: checklist.template.name,
            producerId: checklist.producer?.id,
            producerName: checklist.producer?.name,
            responses: checklist.responses
        });
    } catch (error) {
        console.error("Error fetching responses for copy:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
