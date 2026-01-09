import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if current user is ADMIN
        const currentUser = await db.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (currentUser?.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const supervisors = await db.user.findMany({
            where: {
                role: UserRole.SUPERVISOR
            },
            include: {
                assignedProducers: {
                    select: {
                        id: true,
                        name: true,
                        cpf: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(supervisors);
    } catch (error) {
        console.error("Error fetching supervisors:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const { userId: currentUserId } = await auth();
        if (!currentUserId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if current user is ADMIN
        const currentUser = await db.user.findUnique({
            where: { id: currentUserId },
            select: { role: true }
        });

        if (currentUser?.role !== UserRole.ADMIN) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { supervisorId, producerId, action } = await req.json();

        if (!supervisorId || !producerId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (action === 'assign') {
            await db.user.update({
                where: { id: supervisorId },
                data: {
                    assignedProducers: {
                        connect: { id: producerId }
                    }
                }
            });
        } else if (action === 'unassign') {
            await db.user.update({
                where: { id: supervisorId },
                data: {
                    assignedProducers: {
                        disconnect: { id: producerId }
                    }
                }
            });
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error managing supervisor assignment:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
