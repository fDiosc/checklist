import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getWorkspaceFilter } from "@/lib/workspace-context";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceFilter = getWorkspaceFilter(session);

        const [producersCount, templatesCount, checklistsCount, finalizedChecklistsCount] = await Promise.all([
            db.producer.count({ where: workspaceFilter }),
            db.template.count({ where: workspaceFilter }),
            db.checklist.count({ where: workspaceFilter }),
            db.checklist.count({
                where: { 
                    ...workspaceFilter,
                    status: 'FINALIZED' 
                }
            })
        ]);

        return NextResponse.json({
            producers: producersCount,
            templates: templatesCount,
            checklists: checklistsCount,
            finalizedChecklists: finalizedChecklistsCount
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
