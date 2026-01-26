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
        console.log("Onboarding POST started");
        const authData = await auth();
        const userId = authData.userId;
        const sessionClaims = authData.sessionClaims;

        console.log("Auth data retrieved", { userId, hasClaims: !!sessionClaims });

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        console.log("Request body parsed", body);

        const validatedData = onboardingSchema.parse(body);
        console.log("Data validated", validatedData);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const email = (sessionClaims as any)?.email;
        console.log("Email from claims:", email);

        console.log("Starting upsert for user:", userId);
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
        console.log("Upsert completed");

        return NextResponse.json(updatedUser);
    } catch (error: any) {
        console.error("Error during onboarding detail:", error?.message || error);

        // Return a proper JSON error to the client
        try {
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
        } catch (innerError) {
            console.error("Error in onboarding catch block:", innerError);
        }

        return NextResponse.json(
            { error: error?.message || "Erro interno ao processar o cadastro." },
            { status: 500 }
        );
    }
}
