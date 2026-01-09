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
        const email = (sessionClaims as any)?.email || "";
        const name = (sessionClaims as any)?.name || (sessionClaims as any)?.fullName || "";

        await db.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: email || `${userId}@clerk.user`,
                name: name || "User",
            },
        });

        const { templateId, producerId, subUserId, sentVia, sentTo } =
            await req.json();

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
    } catch (err: any) {
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

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        const checklists = await db.checklist.findMany({
            where: status
                ? {
                    status: status as any,
                }
                : undefined,
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
