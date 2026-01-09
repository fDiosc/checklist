import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const onboardingSchema = z.object({
    name: z.string().min(3, "Nome completo é necessário"),
    cpf: z.string().length(11, "CPF deve ter 11 dígitos"),
});

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = onboardingSchema.parse(body);

        const updatedUser = await db.user.update({
            where: { id: userId },
            data: {
                name: validatedData.name,
                cpf: validatedData.cpf,
            },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("Error during onboarding:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Dados inválidos", details: error.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
