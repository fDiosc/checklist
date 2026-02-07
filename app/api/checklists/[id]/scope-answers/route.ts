import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const scopeAnswerSchema = z.object({
    answers: z.array(z.object({
        scopeFieldId: z.string(),
        value: z.string(),
    })),
});

// GET: Retrieve scope answers for a checklist (inherits from parent if child)
export async function GET(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        void req;
        const params = await props.params;
        const { id } = params;

        // Check if this is a child checklist
        const checklist = await db.checklist.findUnique({
            where: { id },
            select: { parentId: true },
        });

        // If child checklist, return parent's scope answers
        const targetChecklistId = checklist?.parentId || id;

        const answers = await db.scopeAnswer.findMany({
            where: { checklistId: targetChecklistId },
            include: {
                scopeField: true,
            },
        });

        return NextResponse.json(answers);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("GET scope-answers error:", errorMessage);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT: Save/update scope answers for a checklist (blocked for child checklists)
export async function PUT(
    req: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const params = await props.params;
        const { id } = params;

        // Block scope editing for child checklists
        const checklist = await db.checklist.findUnique({
            where: { id },
            select: { parentId: true },
        });

        if (checklist?.parentId) {
            return NextResponse.json(
                { error: "Cannot modify scope answers on child checklists. Edit the parent checklist instead." },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { answers } = scopeAnswerSchema.parse(body);

        // Upsert all answers in a transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await db.$transaction(async (tx: any) => {
            const upserted = [];
            for (const answer of answers) {
                const a = await tx.scopeAnswer.upsert({
                    where: {
                        checklistId_scopeFieldId: {
                            checklistId: id,
                            scopeFieldId: answer.scopeFieldId,
                        },
                    },
                    update: { value: answer.value },
                    create: {
                        checklistId: id,
                        scopeFieldId: answer.scopeFieldId,
                        value: answer.value,
                    },
                });
                upserted.push(a);
            }
            return upserted;
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("PUT scope-answers error:", errorMessage);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
