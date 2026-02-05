import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { getWorkspaceFilter, getCreateWorkspaceId } from "@/lib/workspace-context";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceId = getCreateWorkspaceId(session);
        const { templateId, producerId, subUserId, sentVia, sentTo } = await req.json();

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

        const link = `${process.env.NEXT_PUBLIC_APP_URL}/c/${publicToken}`;

        return NextResponse.json({ checklist, link });
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

        const workspaceFilter = getWorkspaceFilter(session);
        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const templateId = searchParams.get("templateId");
        const producerSearch = searchParams.get("producer");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { ...workspaceFilter };
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
                template: {
                    select: {
                        name: true,
                        folder: true,
                    },
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
                        _count: { select: { responses: true } }
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
