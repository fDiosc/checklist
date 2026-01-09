import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, itemId } = await params;
        const { status, rejectionReason, answer, observation, quantity, isInternal } = await req.json();

        // Validate status enum
        if (status && !['APPROVED', 'REJECTED', 'PENDING_VERIFICATION', 'MISSING'].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const data: any = {
            updatedAt: new Date(),
        };

        if (status) data.status = status;
        if (status === 'REJECTED') data.rejectionReason = rejectionReason;
        if (status === 'APPROVED') {
            data.rejectionReason = null;
            data.reviewedAt = new Date();
        }

        if (isInternal) {
            data.isInternal = true;
            data.filledById = userId;
            if (answer !== undefined) data.answer = answer;
            if (observation !== undefined) data.observation = observation;
            if (quantity !== undefined) data.quantity = quantity;
            // If internal, we often set it to PENDING_VERIFICATION or APPROVED automatically depending on flow?
            // User said "produtor envia um doc por email, o usuario validador sobe para o produtor".
            // So it should probably be PENDING_VERIFICATION so the auditor can then approve it? 
            // Or just approve it immediately if the auditor is the one filling.
            // Let's allow the status to be passed, but default to PENDING_VERIFICATION if not provided and isInternal.
            if (!status) data.status = 'PENDING_VERIFICATION';
        }

        const response = await db.response.upsert({
            where: {
                checklistId_itemId: {
                    checklistId: id,
                    itemId: itemId
                }
            },
            update: data,
            create: {
                ...data,
                checklistId: id,
                itemId: itemId
            }
        });

        // Create Audit Log
        try {
            await db.auditLog.create({
                data: {
                    userId,
                    checklistId: id,
                    action: isInternal ? `INTERNAL_FILL` : `RESPONSE_${status}`,
                    details: { itemId, status, rejectionReason, isInternal }
                }
            });
        } catch (auditError) {
            console.error("Non-blocking audit log error:", auditError);
        }

        return NextResponse.json(response);
    } catch (err: any) {
        console.error("Full error updating response:", err);
        const errorMessage = err?.message || String(err) || "Unknown error";
        const errorCode = err?.code || "No code";

        return NextResponse.json(
            {
                error: "Internal server error",
                message: errorMessage,
                code: errorCode
            },
            { status: 500 }
        );
    }
}
