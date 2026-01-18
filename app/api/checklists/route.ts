import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ensure user exists in our DB
        // Ensure user exists in our DB
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const email = (sessionClaims as any)?.email || "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const name = (sessionClaims as any)?.name || (sessionClaims as any)?.fullName || "";

        const user = await db.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: email || `${userId}@clerk.user`,
                name: name || "User",
            },
            select: { id: true, role: true }
        });

        const { templateId, producerId, subUserId, sentVia, sentTo } =
            await req.json();

        // If NOT Admin, check if assigned to this producer
        if (user.role !== "ADMIN" && producerId) {
            const isAssigned = await db.producer.findFirst({
                where: {
                    id: producerId,
                    assignedSupervisors: { some: { id: userId } }
                }
            });
            if (!isAssigned) {
                return NextResponse.json({ error: "Forbidden: Not assigned to this producer" }, { status: 403 });
            }
        }

        const publicToken = nanoid(32);

        const checklist = await db.checklist.create({
            data: {
                templateId,
                producerId: producerId || null,
                subUserId: subUserId || null,
                publicToken,
                status: "SENT",
                sentAt: new Date(),
                sentVia: sentVia || null,
                sentTo: sentTo || null,
                createdById: userId,
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
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error("Error creating checklist:", err?.message || err);
        return NextResponse.json(
            {
                error: "Internal server error",
                message: err instanceof Error ? err.message : String(err)
            },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const templateId = searchParams.get("templateId");
        const producerSearch = searchParams.get("producer");
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};
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

        // Apply role-based filters (Only ADMIN sees everything)
        if (user?.role !== "ADMIN") {
            // Merge with existing producer filter if any
            const existingProducerFilter = where.producer || {};
            where.producer = {
                ...existingProducerFilter,
                assignedSupervisors: { some: { id: userId } }
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
                    },
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
