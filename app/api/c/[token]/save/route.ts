import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const responses = body?.responses;

        if (!responses || typeof responses !== 'object') {
            return NextResponse.json({ error: "Missing or invalid responses object" }, { status: 400 });
        }

        // 1. Find checklist
        const checklist = await db.checklist.findUnique({
            where: { publicToken: token },
        });

        if (!checklist) {
            return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
        }

        const isClosed = checklist.status !== 'SENT' && checklist.status !== 'IN_PROGRESS';
        if (isClosed) {
            return NextResponse.json({ error: "Checklist is closed for editing" }, { status: 400 });
        }

        // Helper to safely map status
        const sanitizeStatus = (rawStatus: any): "PENDING_VERIFICATION" | "MISSING" | "APPROVED" | "REJECTED" => {
            const validStatuses = ["PENDING_VERIFICATION", "MISSING", "APPROVED", "REJECTED"];

            // Exact match
            if (validStatuses.includes(rawStatus)) return rawStatus;

            // Map legacy/frontend display strings to Enum
            if (rawStatus === "Pendente de verificação") return "PENDING_VERIFICATION";
            if (rawStatus === "Faltante") return "MISSING";
            if (rawStatus === "Aprovado") return "APPROVED";
            if (rawStatus === "Reprovado") return "REJECTED";

            // Default fallback
            return "PENDING_VERIFICATION";
        };

        // 2. Fetch current responses to determine status transitions
        const currentResponses = await db.response.findMany({
            where: { checklistId: checklist.id }
        });

        // 3. Save/Update responses
        await db.$transaction(
            Object.entries(responses).map(([itemId, data]: [string, any]) => {
                const existing = currentResponses.find(r => r.itemId === itemId);
                let safeStatus = sanitizeStatus(data.status);

                // SERVER-SIDE GUARD: If item was REJECTED but producer provides answer, 
                // reset status to PENDING_VERIFICATION to ensure Auditor review.
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

        return NextResponse.json({ success: true });
    } catch (err: any) {
        // Safe error logging
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Save draft error:", errorMessage);

        return NextResponse.json(
            { error: "Save failed", message: errorMessage },
            { status: 500 }
        );
    }
}
