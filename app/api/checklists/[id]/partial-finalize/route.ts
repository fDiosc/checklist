import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { syncResponsesToParent } from "@/lib/services/sync.service";
import type { ChecklistType } from "@/lib/utils/status";

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
        const { createCorrection, createCompletion, generateActionPlan } = await req.json();

        const checklist = await db.checklist.findUnique({
            where: { id },
            include: {
                template: {
                    include: {
                        sections: {
                            include: {
                                items: true
                            }
                        }
                    }
                },
                responses: true,
                producer: {
                    include: {
                        maps: true
                    }
                }
            }
        });

        if (!checklist) {
            return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
        }

        // 1. Create Report Snapshot
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).report.create({
            data: {
                checklistId: id,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                content: checklist.responses as any,
            }
        });

        // 2. If this is a child checklist, sync ALL responses (AS IS) to parent
        if (checklist.parentId) {
            await syncResponsesToParent(checklist.parentId, checklist.responses);
        }

        // 3. Update Status to PARTIALLY_FINALIZED
        await db.checklist.update({
            where: { id },
            data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                status: 'PARTIALLY_FINALIZED' as any,
            }
        });

        // Prepare child checklists
        const childChecklists = [];

        // Map existing responses for easy lookup
        const responseMap = new Map();
        checklist.responses.forEach(r => {
            responseMap.set(`${r.itemId}_${r.fieldId}`, r);
        });

        // Get field IDs for iteration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fieldIds = Array.from(new Set(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            checklist.producer?.maps?.flatMap((m: any) => m.fields || []).map((f: any) => f.id) || []
        )) as string[];

        // Calculate all items needed for child checklists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rejectedItems: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const completionItems: any[] = [];

        checklist.template.sections.forEach(section => {
            const items = section.items;

            if (section.iterateOverFields && fieldIds.length > 0) {
                fieldIds.forEach(fieldId => {
                    items.forEach(item => {
                        const resp = responseMap.get(`${item.id}_${fieldId}`);
                        if (!resp || resp.status === 'MISSING' || resp.status === 'PENDING_VERIFICATION') {
                            completionItems.push({ itemId: item.id, fieldId, resp });
                        } else if (resp.status === 'REJECTED') {
                            rejectedItems.push({ itemId: item.id, fieldId, resp });
                        }
                    });
                });
            } else {
                items.forEach(item => {
                    const resp = responseMap.get(`${item.id}___global__`);
                    if (!resp || resp.status === 'MISSING' || resp.status === 'PENDING_VERIFICATION') {
                        completionItems.push({ itemId: item.id, fieldId: '__global__', resp });
                    } else if (resp.status === 'REJECTED') {
                        rejectedItems.push({ itemId: item.id, fieldId: '__global__', resp });
                    }
                });
            }
        });

        // 4. Create Correction Checklist if requested
        if (createCorrection && rejectedItems.length > 0) {
            const publicToken = nanoid(32);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const child = await (db.checklist as any).create({
                data: {
                    workspaceId: checklist.workspaceId,
                    templateId: checklist.templateId,
                    producerId: checklist.producerId,
                    subUserId: checklist.subUserId,
                    publicToken,
                    status: "SENT",
                    sentAt: new Date(),
                    createdById: session.user.id,
                    parentId: checklist.id,
                    type: 'CORRECTION',
                }
            });
            childChecklists.push(child);

            for (const item of rejectedItems) {
                const resp = item.resp;
                await db.response.create({
                    data: {
                        checklistId: child.id,
                        itemId: item.itemId,
                        fieldId: item.fieldId,
                        status: 'MISSING',
                        answer: resp.answer,
                        observation: resp.observation,
                        rejectionReason: resp.rejectionReason,
                    }
                });
            }
        }

        // 5. Create Completion Checklist if requested
        if (createCompletion && completionItems.length > 0) {
            const publicToken = nanoid(32);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const child = await (db.checklist as any).create({
                data: {
                    workspaceId: checklist.workspaceId,
                    templateId: checklist.templateId,
                    producerId: checklist.producerId,
                    subUserId: checklist.subUserId,
                    publicToken,
                    status: "SENT",
                    sentAt: new Date(),
                    createdById: session.user.id,
                    parentId: checklist.id,
                    type: 'COMPLETION',
                }
            });
            childChecklists.push(child);

            for (const item of completionItems) {
                const resp = item.resp;
                await db.response.create({
                    data: {
                        checklistId: child.id,
                        itemId: item.itemId,
                        fieldId: item.fieldId,
                        status: 'MISSING',
                        answer: resp?.answer || null,
                        observation: resp?.observation || null,
                    }
                });
            }
        }

        await db.auditLog.create({
            data: {
                userId: session.user.id,
                workspaceId: checklist.workspaceId,
                checklistId: id,
                action: `CHECKLIST_PARTIALLY_FINALIZED`,
                details: {
                    correctionId: childChecklists.find((c: { type: ChecklistType }) => c.type === 'CORRECTION')?.id || null,
                    completionId: childChecklists.find((c: { type: ChecklistType }) => c.type === 'COMPLETION')?.id || null,
                }
            }
        });

        return NextResponse.json({
            success: true,
            checklistId: id,
            childIds: childChecklists.map(c => c.id),
            generateActionPlan
        });
    } catch (error) {
        console.error("Error in partial finalize:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
