import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string; itemId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, itemId } = await params;
        const { status, rejectionReason, answer, observation, quantity, fileUrl, validity, isInternal, fieldId } = await req.json();

        // Validate status enum
        if (status && !['APPROVED', 'REJECTED', 'PENDING_VERIFICATION', 'MISSING'].includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            data.filledById = session.user.id;
            if (answer !== undefined) data.answer = answer;
            if (observation !== undefined) data.observation = observation;
            if (quantity !== undefined) data.quantity = quantity;
            if (fileUrl !== undefined) data.fileUrl = fileUrl;
            if (validity !== undefined) data.validity = validity ? new Date(validity) : null;
            if (!status) data.status = 'PENDING_VERIFICATION';
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (db.response as any).upsert({
            where: {
                checklistId_itemId_fieldId: {
                    checklistId: id,
                    itemId: itemId,
                    fieldId: fieldId || "__global__"
                }
            },
            update: data,
            create: {
                ...data,
                checklistId: id,
                itemId: itemId,
                fieldId: fieldId || "__global__"
            }
        });

        // Get checklist for workspaceId
        const checklist = await db.checklist.findUnique({
            where: { id },
            select: { workspaceId: true, producerId: true, template: { select: { name: true } } }
        });

        // Create Audit Log
        try {
            await db.auditLog.create({
                data: {
                    userId: session.user.id,
                    workspaceId: checklist?.workspaceId,
                    checklistId: id,
                    action: isInternal ? `INTERNAL_FILL` : `RESPONSE_${status}`,
                    details: { itemId, status, rejectionReason, isInternal }
                }
            });
        } catch (auditError) {
            console.error("Non-blocking audit log error:", auditError);
        }

        // 5. PERMANENT PERSISTENCE SYNC (Auditor Side)
        if (answer && checklist?.producerId) {
            try {
                const item = await db.item.findUnique({ where: { id: itemId } });
                if (item?.type === 'PROPERTY_MAP') {
                    try {
                        const mapData = typeof answer === 'string' ? JSON.parse(answer) : answer;
                        if (mapData && mapData.fields) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            await (db.propertyMap as any).upsert({
                                where: { id: `map-${id}-${itemId}` },
                                update: {
                                    fields: mapData.fields,
                                    propertyLocation: mapData.propertyLocation || null,
                                    city: mapData.city || null,
                                    state: mapData.state || null,
                                    updatedAt: new Date()
                                },
                                create: {
                                    id: `map-${id}-${itemId}`,
                                    producerId: checklist.producerId,
                                    name: `Mapa do Checklist: ${checklist.template?.name || 'Geral'}`,
                                    fields: mapData.fields,
                                    propertyLocation: mapData.propertyLocation || null,
                                    city: mapData.city || null,
                                    state: mapData.state || null,
                                }
                            });
                        }
                    } catch (e) {
                        console.error("Map sync error (auditor):", e);
                    }
                }
            } catch (e) {
                console.error("Map sync infrastructure error (auditor):", e);
            }
        }

        return NextResponse.json(response);
    } catch (err: unknown) {
        console.error("Full error updating response:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorCode = (err as { code?: string })?.code || "No code";

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
