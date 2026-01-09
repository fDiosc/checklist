import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [producersCount, templatesCount, checklistsCount] = await Promise.all([
            db.producer.count(),
            db.template.count(),
            db.checklist.count(),
        ]);

        return NextResponse.json({
            producers: producersCount,
            templates: templatesCount,
            checklists: checklistsCount,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
