import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { getSubworkspaceFilter, getCreateWorkspaceId } from "@/lib/workspace-context";

const identifierSchema = z.object({
    category: z.enum(['personal', 'fiscal']),
    type: z.string(),
    value: z.string()
});

const agriculturalRegistrySchema = z.object({
    type: z.string(),
    value: z.string()
});

const createProducerSchema = z.object({
    name: z.string().min(1),
    countryCode: z.string().length(2).default('BR'),
    // CPF is now optional (required for BR via application logic)
    cpf: z.string().length(11).optional().or(z.literal('')).transform(val => val || undefined),
    email: z.string().email().optional().or(z.literal('')).transform(val => val || undefined),
    phone: z.string().optional().or(z.literal('')).transform(val => val || undefined),
    city: z.string().optional().or(z.literal('')).transform(val => val || undefined),
    state: z.string().optional().or(z.literal('')).transform(val => val || undefined),
    // International support
    identifiers: z.array(identifierSchema).optional(),
    agriculturalRegistry: agriculturalRegistrySchema.optional(),
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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceId = getCreateWorkspaceId(session);
        const body = await req.json();
        const validatedData = createProducerSchema.parse(body);

        // For BR, cpf is required
        if (validatedData.countryCode === 'BR' && !validatedData.cpf) {
            return NextResponse.json(
                { error: "CPF is required for Brazilian producers" },
                { status: 400 }
            );
        }

        const producer = await db.producer.create({
            data: {
                workspaceId,
                name: validatedData.name,
                countryCode: validatedData.countryCode,
                cpf: validatedData.cpf, // Keep for BR backward compatibility
                email: validatedData.email,
                phone: validatedData.phone,
                city: validatedData.city,
                state: validatedData.state,
                subUsers: validatedData.subUsers
                    ? {
                        create: validatedData.subUsers,
                    }
                    : undefined,
                // Create identifiers
                identifiers: validatedData.identifiers && validatedData.identifiers.length > 0
                    ? {
                        create: validatedData.identifiers.map(id => ({
                            category: id.category,
                            idType: id.type,
                            idValue: id.value
                        }))
                    }
                    : undefined,
                // Create agricultural registry
                agriculturalRegistry: validatedData.agriculturalRegistry
                    ? {
                        create: {
                            registryType: validatedData.agriculturalRegistry.type,
                            registryValue: validatedData.agriculturalRegistry.value,
                            countryCode: validatedData.countryCode
                        }
                    }
                    : undefined,
            },
            include: { 
                subUsers: true,
                identifiers: true,
                agriculturalRegistry: true
            },
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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const workspaceFilter = await getSubworkspaceFilter(session);
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { ...workspaceFilter };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { cpf: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
            ];
        }

        // Apply role-based filters (Only ADMIN/SUPERADMIN sees everything)
        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
            where.assignedSupervisors = {
                some: { id: session.user.id }
            };
        }

        const producers = await db.producer.findMany({
            where,
            include: {
                _count: {
                    select: { checklists: true },
                },
                identifiers: true, // Include identifiers for international producers
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
