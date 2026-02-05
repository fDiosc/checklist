import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const actionPlan = await (db as any).actionPlan.update({
            where: { id },
            data: { isPublished: true }
        });

        return NextResponse.json(actionPlan);
    } catch (error) {
        console.error("Error publishing action plan:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
