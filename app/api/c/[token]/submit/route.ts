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
            Object.entries(responses)
                .filter(([key]) => key !== '__selected_fields')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map(([key, data]: [string, any]) => {
                    const [itemId, fieldId] = key.includes('::') ? key.split('::') : [key, "__global__"];

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const existing = currentResponses.find((r: any) => r.itemId === itemId && r.fieldId === fieldId);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    let safeStatus = (data.status as any) || "PENDING_VERIFICATION";

                    // SERVER-SIDE GUARD: If item was REJECTED but producer provides answer, 
                    // reset status to PENDING_VERIFICATION.
                    if (existing?.status === 'REJECTED' && data.answer && data.answer !== existing.answer) {
                        safeStatus = 'PENDING_VERIFICATION';
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return (db.response as any).upsert({
                        where: {
                            checklistId_itemId_fieldId: {
                                checklistId: checklist.id,
                                itemId: itemId,
                                fieldId: fieldId,
                            },
                        },
                        update: {
                            answer: typeof data.answer === 'object' ? JSON.stringify(data.answer) : String(data.answer || ''),
                            quantity: data.quantity ? String(data.quantity) : null,
                            observation: data.observationValue || null,
                            fileUrl: data.fileUrl || null,
                            validity: data.validity ? new Date(data.validity) : null,
                            status: safeStatus,
                        },
                        create: {
                            checklistId: checklist.id,
                            itemId: itemId,
                            fieldId: fieldId,
                            answer: typeof data.answer === 'object' ? JSON.stringify(data.answer) : String(data.answer || ''),
                            quantity: data.quantity ? String(data.quantity) : null,
                            observation: data.observationValue || null,
                            fileUrl: data.fileUrl || null,
                            validity: data.validity ? new Date(data.validity) : null,
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

        // 4. PERMANENT PERSISTENCE: Sync Maps to Producer (User Suggestion)
        // If there's a PROPERTY_MAP answer, we save it to the permanent table.
        if (checklist.producerId) {
            try {
                // Fetch the template items to identify MAP responses
                const template = await db.template.findUnique({
                    where: { id: checklist.templateId },
                    include: { sections: { include: { items: true } } }
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const mapItems = template?.sections.flatMap((s: any) => s.items).filter((i: any) => i.type === 'PROPERTY_MAP') || [];

                for (const item of mapItems) {
                    const submissionResponse = responses[item.id];
                    if (submissionResponse && submissionResponse.answer) {
                        try {
                            const mapData = typeof submissionResponse.answer === 'string'
                                ? JSON.parse(submissionResponse.answer)
                                : submissionResponse.answer;

                            if (mapData && mapData.fields) {
                                // Upsert to PropertyMap
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                await (db.propertyMap as any).upsert({
                                    where: {
                                        // We use the combination of producer and name as a soft unique key 
                                        // or we can find an existing one from this specific checklist
                                        id: `map-${checklist.id}-${item.id}` // Deterministic ID for this pair
                                    },
                                    update: {
                                        fields: mapData.fields,
                                        propertyLocation: mapData.propertyLocation || null,
                                        city: mapData.city || null,
                                        state: mapData.state || null,
                                        updatedAt: new Date()
                                    },
                                    create: {
                                        id: `map-${checklist.id}-${item.id}`,
                                        producerId: checklist.producerId,
                                        name: `Mapa do Checklist: ${template?.name || 'Geral'}`,
                                        fields: mapData.fields,
                                        propertyLocation: mapData.propertyLocation || null,
                                        city: mapData.city || null,
                                        state: mapData.state || null,
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Failed to sync map data:", e);
                        }
                    }
                }
            } catch (e) {
                console.error("Map sync infrastructure failure:", e);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Submission error:", err);
        return NextResponse.json(
            { error: "Submission failed", message: err instanceof Error ? err.message : String(err) },
            { status: 500 }
        );
    }
}
