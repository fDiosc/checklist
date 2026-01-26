import { auth } from "@clerk/nextjs/server";
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
        const authData = await auth();
        const userId = authData.userId;
        const sessionClaims = authData.sessionClaims;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = onboardingSchema.parse(body);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const email = (sessionClaims as any)?.email;

        const updatedUser = await db.user.upsert({
            where: { id: userId },
            create: {
                id: userId,
                email: email || `${userId}@clerk.user`,
                name: validatedData.name,
                cpf: validatedData.cpf,
                role: "SUPERVISOR",
            },
            update: {
                name: validatedData.name,
                cpf: validatedData.cpf,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                const target = (error.meta?.target as string[]) || [];
                if (target.includes('cpf')) {
                    return NextResponse.json(
                        { error: "Este CPF já está cadastrado em outra conta." },
                        { status: 400 }
                    );
                }
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
