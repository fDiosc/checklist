import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: session.user.id },
            include: {
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logoUrl: true,
                        hasSubworkspaces: true,
                        parentWorkspaceId: true,
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const needsOnboarding = !user.name || !user.cpf;

        return NextResponse.json({ 
            ...user, 
            needsOnboarding,
            // Don't expose password hash
            passwordHash: undefined,
        });
    } catch (error) {
        console.error("Error fetching current user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
