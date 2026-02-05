import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";
import { getWorkspaceFilter, isAdmin } from "@/lib/workspace-context";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if current user is ADMIN or SUPERADMIN
        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const workspaceFilter = getWorkspaceFilter(session);

        const supervisors = await db.user.findMany({
            where: {
                ...workspaceFilter,
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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if current user is ADMIN or SUPERADMIN
        if (!isAdmin(session)) {
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
