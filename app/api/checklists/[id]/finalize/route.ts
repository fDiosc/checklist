import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncResponsesToParent } from "@/lib/services/sync.service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        // Fetch the checklist with its responses and parent info
        const checklist = await db.checklist.findUnique({
            where: { id },
            include: {
                responses: true
            }
        });

        if (!checklist) {
            return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
        }

        // If this is a child checklist, sync responses to parent (AS IS)
        if (checklist.parentId) {
            await syncResponsesToParent(checklist.parentId, checklist.responses);
        }

        // Update checklist status to FINALIZED
        const updatedChecklist = await db.checklist.update({
            where: { id },
            data: {
                status: 'FINALIZED',
                finalizedAt: new Date(),
            }
        });

        await db.auditLog.create({
            data: {
                userId: session.user.id,
                workspaceId: checklist.workspaceId,
                checklistId: id,
                action: checklist.parentId
                    ? `CHILD_CHECKLIST_FINALIZED_WITH_PARENT_SYNC`
                    : `CHECKLIST_FINALIZED`,
                details: checklist.parentId ? { parentId: checklist.parentId } : undefined
            }
        });

        return NextResponse.json(updatedChecklist);
    } catch (error) {
        console.error("Error finalizing:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
