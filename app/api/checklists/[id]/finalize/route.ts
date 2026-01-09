import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const checklist = await db.checklist.update({
            where: { id },
            data: {
                status: 'FINALIZED',
                finalizedAt: new Date(),
            }
        });

        await db.auditLog.create({
            data: {
                userId,
                checklistId: id,
                action: `CHECKLIST_FINALIZED`,
            }
        });

        return NextResponse.json(checklist);
    } catch (error) {
        console.error("Error finalizing:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
