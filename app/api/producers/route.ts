import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createProducerSchema = z.object({
    name: z.string().min(1),
    cpf: z.string().length(11),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
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
                city: validatedData.city,
                state: validatedData.state,
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

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { cpf: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        // Apply role-based filters (Only ADMIN sees everything)
        if (user?.role !== "ADMIN") {
            where.assignedSupervisors = {
                some: { id: userId }
            };
        }

        const producers = await db.producer.findMany({
            where,
            include: {
                _count: {
                    select: { checklists: true },
                },
            },
            orderBy: { name: "asc" },
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
