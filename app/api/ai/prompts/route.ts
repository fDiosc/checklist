import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const prompts = await db.aiPrompt.findMany({
            select: {
                id: true,
                slug: true,
                description: true,
            },
            orderBy: {
                slug: 'asc'
            }
        });

        return NextResponse.json(prompts);
    } catch (error) {
        console.error("Error fetching AI prompts:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
