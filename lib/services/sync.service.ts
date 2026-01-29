import { db } from "@/lib/db";

interface ResponseToSync {
    itemId: string;
    fieldId: string;
    status: string;
    answer: string | null;
    observation: string | null;
    fileUrl: string | null;
    quantity: string | null;
    validity: Date | null;
    rejectionReason: string | null;
    reviewedAt: Date | null;
}

/**
 * Synchronizes responses from a child checklist to its parent (AS IS merge).
 * This function is used during both finalize and partial-finalize operations.
 * 
 * @param parentId - The ID of the parent checklist
 * @param responses - Array of responses to sync (only APPROVED and REJECTED will be processed)
 */
export async function syncResponsesToParent(
    parentId: string,
    responses: ResponseToSync[]
): Promise<void> {
    const responsesToSync = responses.filter(
        r => r.status === 'APPROVED' || r.status === 'REJECTED'
    );

    for (const resp of responsesToSync) {
        await db.response.upsert({
            where: {
                checklistId_itemId_fieldId: {
                    checklistId: parentId,
                    itemId: resp.itemId,
                    fieldId: resp.fieldId
                }
            },
            update: {
                status: resp.status as 'APPROVED' | 'REJECTED',
                answer: resp.answer,
                observation: resp.observation,
                fileUrl: resp.fileUrl,
                quantity: resp.quantity,
                validity: resp.validity,
                rejectionReason: resp.rejectionReason,
                reviewedAt: resp.reviewedAt || new Date()
            },
            create: {
                checklistId: parentId,
                itemId: resp.itemId,
                fieldId: resp.fieldId,
                status: resp.status as 'APPROVED' | 'REJECTED',
                answer: resp.answer,
                observation: resp.observation,
                fileUrl: resp.fileUrl,
                quantity: resp.quantity,
                validity: resp.validity,
                rejectionReason: resp.rejectionReason,
                reviewedAt: resp.reviewedAt || new Date()
            }
        });
    }
}
