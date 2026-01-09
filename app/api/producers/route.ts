import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createProducerSchema = z.object({
    name: z.string().min(1),
    cpf: z.string().length(11),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    subUsers: z
        .array(
            z.object({
                name: z.string(),
                cpf: z.string(),
                email: z.string().email(),
                phone: z.string().optional(),
                role: z.string().optional(),
            })
        )
        .optional(),
});

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = createProducerSchema.parse(body);

        const producer = await db.producer.create({
            data: {
                name: validatedData.name,
                cpf: validatedData.cpf,
                email: validatedData.email,
                phone: validatedData.phone,
                subUsers: validatedData.subUsers
                    ? {
                        create: validatedData.subUsers,
                    }
                    : undefined,
            },
            include: { subUsers: true },
        });

        return NextResponse.json(producer);
    } catch (error) {
        console.error("Error creating producer:", error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid data", details: error.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");

        const producers = await db.producer.findMany({
            where: search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { cpf: { contains: search } },
                        { email: { contains: search, mode: "insensitive" } },
                    ],
                }
                : undefined,
            include: {
                subUsers: true,
                _count: {
                    select: { checklists: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(producers);
    } catch (error) {
        console.error("Error fetching producers:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
