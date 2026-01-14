import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let user = await db.user.findUnique({
            where: { id: userId }
        });

        // Auto-sync if not found (similar to checklist POST logic)
        if (!user) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const email = (sessionClaims as any)?.email || "";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const name = (sessionClaims as any)?.name || (sessionClaims as any)?.fullName || "";
            user = await db.user.create({
                data: {
                    id: userId,
                    email: email || `${userId}@clerk.user`,
                    name: name || null,
                    role: "SUPERVISOR",
                },
            });
        }

        const needsOnboarding = !user.name || !user.cpf;

        return NextResponse.json({ ...user, needsOnboarding });
    } catch (error) {
        console.error("Error fetching current user:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
