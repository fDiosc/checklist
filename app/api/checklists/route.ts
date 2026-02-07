import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { getSubworkspaceFilter, getCreateWorkspaceId } from "@/lib/workspace-context";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceId = getCreateWorkspaceId(session);
        const { templateId, producerId, subUserId, sentVia, sentTo, prefillFromChecklistId, targetLevelId } = await req.json();

        // If NOT Admin/SuperAdmin, check if assigned to this producer
        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN" && producerId) {
            const isAssigned = await db.producer.findFirst({
                where: {
                    id: producerId,
                    assignedSupervisors: { some: { id: session.user.id } }
                }
            });
            if (!isAssigned) {
                return NextResponse.json({ error: "Forbidden: Not assigned to this producer" }, { status: 403 });
            }
        }

        const publicToken = nanoid(32);

        const checklist = await db.checklist.create({
            data: {
                workspaceId,
                templateId,
                producerId: producerId || null,
                subUserId: subUserId || null,
                publicToken,
                status: "SENT",
                sentAt: new Date(),
                sentVia: sentVia || null,
                sentTo: sentTo || null,
                createdById: session.user.id,
                targetLevelId: targetLevelId || null,
            },
            include: {
                template: {
                    select: {
                        name: true,
                    },
                },
                producer: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                subUser: {
                    select: {
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        // Pre-fill responses from previous checklist if specified
        if (prefillFromChecklistId) {
            const sourceChecklist = await db.checklist.findFirst({
                where: {
                    id: prefillFromChecklistId,
                    workspaceId, // Must be in same workspace
                    templateId, // Must be same template
                    status: { in: ['APPROVED', 'FINALIZED', 'PARTIALLY_FINALIZED'] }
                },
                include: {
                    responses: {
                        where: {
                            status: 'APPROVED'
                        }
                    }
                }
            });

            if (sourceChecklist && sourceChecklist.responses.length > 0) {
                // Copy approved responses to new checklist with PENDING_VERIFICATION status
                await db.response.createMany({
                    data: sourceChecklist.responses.map(resp => ({
                        checklistId: checklist.id,
                        itemId: resp.itemId,
                        fieldId: resp.fieldId,
                        answer: resp.answer,
                        quantity: resp.quantity,
                        observation: resp.observation,
                        fileUrl: resp.fileUrl, // Keep reference to same file
                        validity: resp.validity,
                        status: 'PENDING_VERIFICATION', // Requires re-verification
                    }))
                });
            }

            // Also copy scope answers from source checklist
            const sourceScopeAnswers = await db.scopeAnswer.findMany({
                where: { checklistId: prefillFromChecklistId },
            });
            if (sourceScopeAnswers.length > 0) {
                await db.scopeAnswer.createMany({
                    data: sourceScopeAnswers.map(sa => ({
                        checklistId: checklist.id,
                        scopeFieldId: sa.scopeFieldId,
                        value: sa.value,
                    })),
                });
            }
        }

        const link = `${process.env.NEXT_PUBLIC_APP_URL}/c/${publicToken}`;

        return NextResponse.json({ 
            checklist, 
            link,
            prefilled: !!prefillFromChecklistId 
        });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error("Error creating checklist:", errorMessage);
        return NextResponse.json(
            {
                error: "Internal server error",
                message: errorMessage
            },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const templateId = searchParams.get("templateId");
        const producerSearch = searchParams.get("producer");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const subworkspaceId = searchParams.get("subworkspaceId"); // Optional filter for specific subworkspace
        const scope = searchParams.get("scope"); // 'own' | 'subworkspaces' | null (default: all)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let where: any = {};
        
        // Handle scope-based filtering
        if (scope === 'own') {
            // Only checklists from user's own workspace
            where.workspaceId = session.user.workspaceId;
        } else if (scope === 'subworkspaces') {
            // Only checklists from subworkspaces (not the parent)
            if (!session.user.workspaceId) {
                return NextResponse.json({ error: "No workspace assigned" }, { status: 400 });
            }
            const parentWorkspace = await db.workspace.findUnique({
                where: { id: session.user.workspaceId },
                include: { subworkspaces: { select: { id: true } } }
            });
            if (!parentWorkspace?.hasSubworkspaces || parentWorkspace.subworkspaces.length === 0) {
                return NextResponse.json([]);
            }
            const subworkspaceIds = parentWorkspace.subworkspaces.map(sw => sw.id);
            where.workspaceId = { in: subworkspaceIds };
        } else {
            // Default: use existing subworkspace filter (all accessible)
            const workspaceFilter = await getSubworkspaceFilter(session);
            where = { ...workspaceFilter };
        }
        
        // If filtering by specific subworkspace, override the workspace filter
        if (subworkspaceId) {
            where.workspaceId = subworkspaceId;
        }
        if (status) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            where.status = status as any;
        }
        if (templateId) {
            where.templateId = templateId;
        }
        if (producerSearch) {
            where.producer = {
                OR: [
                    { name: { contains: producerSearch, mode: "insensitive" } },
                    { cpf: { contains: producerSearch } },
                ],
            };
        }
        if (dateFrom || dateTo) {
            where.sentAt = {};
            if (dateFrom) where.sentAt.gte = new Date(dateFrom);
            if (dateTo) where.sentAt.lte = new Date(dateTo);
        }

        // Apply role-based filters (Only ADMIN/SUPERADMIN sees everything)
        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
            // Merge with existing producer filter if any
            const existingProducerFilter = where.producer || {};
            where.producer = {
                ...existingProducerFilter,
                assignedSupervisors: { some: { id: session.user.id } }
            };
        }

        const checklists = await db.checklist.findMany({
            where,
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        parentWorkspaceId: true,
                    },
                },
                template: {
                    select: {
                        name: true,
                        folder: true,
                        isLevelBased: true,
                    },
                },
                targetLevel: {
                    select: { id: true, name: true, order: true },
                },
                achievedLevel: {
                    select: { id: true, name: true, order: true },
                },
                producer: {
                    select: {
                        name: true,
                        cpf: true,
                        phone: true,
                    },
                },
                parent: {
                    select: {
                        id: true,
                        template: { select: { name: true } }
                    }
                },
                children: {
                    select: {
                        id: true,
                        status: true,
                        type: true,
                        responses: {
                            select: { rejectionReason: true }
                        },
                        createdAt: true,
                        publicToken: true,
                        _count: { select: { responses: true } },
                        // Level 2: Grandchildren (netos)
                        children: {
                            select: {
                                id: true,
                                status: true,
                                type: true,
                                responses: {
                                    select: { rejectionReason: true }
                                },
                                createdAt: true,
                                publicToken: true,
                                _count: { select: { responses: true } },
                                // Level 3: Great-grandchildren (bisnetos)
                                children: {
                                    select: {
                                        id: true,
                                        status: true,
                                        type: true,
                                        responses: {
                                            select: { rejectionReason: true }
                                        },
                                        createdAt: true,
                                        publicToken: true,
                                        _count: { select: { responses: true } },
                                        // Level 4: Great-great-grandchildren (tataranetos)
                                        children: {
                                            select: {
                                                id: true,
                                                status: true,
                                                type: true,
                                                createdAt: true,
                                                publicToken: true,
                                                _count: { select: { responses: true } }
                                            },
                                            orderBy: { createdAt: 'desc' }
                                        }
                                    },
                                    orderBy: { createdAt: 'desc' }
                                }
                            },
                            orderBy: { createdAt: 'desc' }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                _count: {
                    select: { responses: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(checklists);
    } catch (error) {
        console.log("Error fetching checklists:", String(error));
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
