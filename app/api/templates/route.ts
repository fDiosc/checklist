import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createTemplateSchema = z.object({
    name: z.string().min(1),
    folder: z.string().min(1),
    requiresProducerIdentification: z.boolean().optional(),
    sections: z.array(
        z.object({
            name: z.string(),
            iterateOverFields: z.boolean().optional(),
            items: z.array(
                z.object({
                    name: z.string(),
                    type: z.enum([
                        "FILE",
                        "TEXT",
                        "LONG_TEXT",
                        "SINGLE_CHOICE",
                        "MULTIPLE_CHOICE",
                        "DATE",
                        "PROPERTY_MAP",
                        "FIELD_SELECTOR",
                        "DROPDOWN_SELECT",
                    ]),
                    required: z.boolean().optional(),
                    validityControl: z.boolean().optional(),
                    observationEnabled: z.boolean().optional(),
                    requestArtifact: z.boolean().optional(),
                    artifactRequired: z.boolean().optional(),
                    askForQuantity: z.boolean().optional(),
                    options: z.array(z.string()).optional(),
                    databaseSource: z.string().nullable().optional(),
                })
            ),
        })
    ),
});

export async function POST(req: Request) {
    try {
        const { userId, sessionClaims } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Ensure user exists in our DB
        // sessionClaims might contain name/email if configured, otherwise use defaults
        const email = (sessionClaims as any)?.email || "";
        const name = (sessionClaims as any)?.name || (sessionClaims as any)?.fullName || "";

        await db.user.upsert({
            where: { id: userId },
            update: {},
            create: {
                id: userId,
                email: email || `${userId}@clerk.user`,
                name: name || "User",
            },
        });

        const body = await req.json();
        const validatedData = createTemplateSchema.parse(body);

        const template = await db.template.create({
            data: {
                name: validatedData.name,
                folder: validatedData.folder,
                requiresProducerIdentification:
                    validatedData.requiresProducerIdentification ?? false,
                createdById: userId,
                sections: {
                    create: validatedData.sections.map((section, sIdx) => ({
                        name: section.name,
                        order: sIdx,
                        iterateOverFields: section.iterateOverFields ?? false,
                        items: {
                            create: section.items.map((item, iIdx) => ({
                                name: item.name,
                                type: item.type,
                                order: iIdx,
                                required: item.required ?? true,
                                validityControl: item.validityControl ?? false,
                                observationEnabled: item.observationEnabled ?? false,
                                requestArtifact: item.requestArtifact ?? false,
                                artifactRequired: item.artifactRequired ?? false,
                                askForQuantity: item.askForQuantity ?? false,
                                options: item.options || [],
                                databaseSource: item.databaseSource,
                            })),
                        },
                    })),
                },
            },
            include: {
                sections: {
                    include: { items: true },
                    orderBy: { order: "asc" },
                },
            },
        });

        return NextResponse.json(template);
    } catch (err: any) {
        console.error("Error creating template:", err?.message || err);

        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid data", details: err.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                error: "Internal server error",
                message: err instanceof Error ? err.message : String(err)
            },
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

        const templates = await db.template.findMany({
            where: search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { folder: { contains: search, mode: "insensitive" } },
                    ],
                }
                : undefined,
            include: {
                _count: {
                    select: { checklists: true, sections: true },
                },
                createdBy: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(templates);
    } catch (error) {
        console.error("Error fetching templates:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
