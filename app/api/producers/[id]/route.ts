import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const producer = await db.producer.findUnique({
            where: { id },
            include: {
                subUsers: true,
                assignedSupervisors: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                checklists: {
                    include: {
                        template: {
                            select: {
                                name: true,
                            },
                        },
                        responses: {
                            include: {
                                item: true
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" },
                },
                maps: true,
            },
        });

        if (!producer) {
            return NextResponse.json({ error: "Producer not found" }, { status: 404 });
        }

        // Apply role-based filters (Only ADMIN sees everything)
        if (user?.role !== "ADMIN") {
            const isAssigned = producer.assignedSupervisors.some((a: any) => a.id === userId);
            if (!isAssigned) {
                return NextResponse.json({ error: "Forbidden: Not assigned to this producer" }, { status: 403 });
            }
        }

        // Aggregate maps from checklist responses
        const extractedMaps = producer.checklists.flatMap(checklist =>
            checklist.responses
                .filter(r => r.item.type === 'PROPERTY_MAP' && r.answer)
                .map(r => {
                    try {
                        const data = JSON.parse(r.answer as string);
                        return {
                            id: `resp-${r.id}`,
                            producerId: producer.id,
                            name: `Mapa do Checklist: ${checklist.template.name}`,
                            location: data.propertyLocation,
                            fields: data.fields,
                            city: data.city,
                            state: data.state,
                            createdAt: r.createdAt,
                            isFromResponse: true
                        };
                    } catch (e) {
                        return null;
                    }
                })
                .filter(m => m !== null)
        );

        const allMaps = [...producer.maps, ...extractedMaps];

        return NextResponse.json({
            ...producer,
            maps: allMaps
        });
    } catch (error) {
        console.error("Error fetching producer:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

const updateProducerSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    cpf: z.string().length(11),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    assignedSupervisorIds: z.array(z.string()).optional(),
    subUsers: z
        .array(
            z.object({
                id: z.string().optional(),
                name: z.string(),
                cpf: z.string(),
                email: z.string().email(),
                phone: z.string().optional().nullable(),
                role: z.string().optional().nullable(),
            })
        )
        .optional(),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = updateProducerSchema.parse(body);

        const producer = await db.$transaction(async (tx) => {
            // 1. Update main producer data
            const p = await tx.producer.update({
                where: { id },
                data: {
                    name: validatedData.name,
                    cpf: validatedData.cpf,
                    email: validatedData.email,
                    phone: validatedData.phone,
                    city: validatedData.city,
                    state: validatedData.state,
                    assignedSupervisors: validatedData.assignedSupervisorIds ? {
                        set: validatedData.assignedSupervisorIds.map(id => ({ id }))
                    } : undefined,
                },
            });

            // 2. Sync Sub-users
            if (validatedData.subUsers) {
                const subUsers = validatedData.subUsers;
                const existingSubUsers = await tx.subUser.findMany({
                    where: { producerId: id },
                });

                const existingIds = existingSubUsers.map((s) => s.id);
                const incomingIds = subUsers
                    .filter((s) => s.id && !s.id.startsWith("temp-"))
                    .map((s) => s.id as string);

                // Delete sub-users not in incoming list
                const toDelete = existingIds.filter((extId) => !incomingIds.includes(extId));
                if (toDelete.length > 0) {
                    await tx.subUser.deleteMany({
                        where: { id: { in: toDelete } },
                    });
                }

                // Update or Create
                for (const sub of subUsers) {
                    if (sub.id && !sub.id.startsWith("temp-")) {
                        await tx.subUser.update({
                            where: { id: sub.id },
                            data: {
                                name: sub.name,
                                cpf: sub.cpf,
                                email: sub.email,
                                phone: sub.phone,
                                role: sub.role,
                            },
                        });
                    } else {
                        await tx.subUser.create({
                            data: {
                                producerId: id,
                                name: sub.name,
                                cpf: sub.cpf,
                                email: sub.email,
                                phone: sub.phone,
                                role: sub.role,
                            },
                        });
                    }
                }
            }

            return p;
        });

        return NextResponse.json(producer);
    } catch (error) {
        console.error("Error updating producer:", error);
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

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await db.producer.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting producer:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
