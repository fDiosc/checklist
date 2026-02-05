import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const onboardingSchema = z.object({
    name: z.string().min(3, "Nome completo é necessário"),
    cpf: z.string().length(11, "CPF deve ter 11 dígitos"),
});

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = onboardingSchema.parse(body);

        // Get current user to find their workspace
        const currentUser = await db.user.findUnique({
            where: { id: session.user.id },
            select: { workspaceId: true }
        });

        // Check if CPF already exists in the same workspace
        const existingUser = await db.user.findFirst({
            where: {
                cpf: validatedData.cpf,
                workspaceId: currentUser?.workspaceId,
                id: { not: session.user.id } // Exclude current user
            }
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Este CPF já está cadastrado neste workspace." },
                { status: 400 }
            );
        }

        const updatedUser = await db.user.update({
            where: { id: session.user.id },
            data: {
                name: validatedData.name,
                cpf: validatedData.cpf,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: "Este CPF já está cadastrado neste workspace." },
                    { status: 400 }
                );
            }
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Dados inválidos", details: error.errors },
                { status: 400 }
            );
        }

        const errorMessage = error instanceof Error ? error.message : "Erro interno ao processar o cadastro.";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
