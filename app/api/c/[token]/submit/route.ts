import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const { responses } = await req.json();

        // 1. Find checklist
        const checklist = await db.checklist.findUnique({
            where: { publicToken: token },
        });

        if (!checklist) {
            return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
        }

        if (checklist.status === "FINALIZED") {
            return NextResponse.json({ error: "Checklist is already finalized" }, { status: 400 });
        }

        // 2. Fetch current responses to determine status transitions
        const currentResponses = await db.response.findMany({
            where: { checklistId: checklist.id }
        });

        // 3. Save/Update responses
        await db.$transaction(
            Object.entries(responses).map(([itemId, data]: [string, any]) => {
                const existing = currentResponses.find(r => r.itemId === itemId);
                let safeStatus = (data.status as any) || "PENDING_VERIFICATION";

                // SERVER-SIDE GUARD: If item was REJECTED but producer provides answer, 
                // reset status to PENDING_VERIFICATION.
                if (existing?.status === 'REJECTED' && data.answer && data.answer !== existing.answer) {
                    safeStatus = 'PENDING_VERIFICATION';
                }

                return db.response.upsert({
                    where: {
                        checklistId_itemId: {
                            checklistId: checklist.id,
                            itemId: itemId,
                        },
                    },
                    update: {
                        answer: typeof data.answer === 'object' ? JSON.stringify(data.answer) : String(data.answer || ''),
                        quantity: data.quantity ? String(data.quantity) : null,
                        observation: data.observationValue || null,
                        status: safeStatus,
                    },
                    create: {
                        checklistId: checklist.id,
                        itemId: itemId,
                        answer: typeof data.answer === 'object' ? JSON.stringify(data.answer) : String(data.answer || ''),
                        quantity: data.quantity ? String(data.quantity) : null,
                        observation: data.observationValue || null,
                        status: safeStatus,
                    },
                });
            })
        );

        // 3. Update checklist status
        await db.checklist.update({
            where: { id: checklist.id },
            data: {
                status: "PENDING_REVIEW",
                submittedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Submission error:", err);
        return NextResponse.json(
            { error: "Submission failed", message: err.message },
            { status: 500 }
        );
    }
}
