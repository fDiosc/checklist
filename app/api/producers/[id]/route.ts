import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { hasWorkspaceAccess, hasWorkspaceAccessWithHierarchy } from "@/lib/workspace-context";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
                identifiers: true,
                agriculturalRegistry: true,
            },
        });

        if (!producer) {
            return NextResponse.json({ error: "Producer not found" }, { status: 404 });
        }

        // Check workspace access (including hierarchy for parent workspaces)
        const hasAccess = await hasWorkspaceAccessWithHierarchy(session, producer.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Apply role-based filters (Only ADMIN/SUPERADMIN sees everything)
        if (session.user.role !== "ADMIN" && session.user.role !== "SUPERADMIN") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const isAssigned = producer.assignedSupervisors.some((a: any) => a.id === session.user.id);
            if (!isAssigned) {
                return NextResponse.json({ error: "Forbidden: Not assigned to this producer" }, { status: 403 });
            }
        }

        // Aggregate maps from checklist responses
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const extractedMaps = producer.checklists.flatMap((checklist: any) =>
            checklist.responses
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((r: any) => r.item.type === 'PROPERTY_MAP' && r.answer)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((r: any) => {
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
                            carCode: data.carCode,
                            carData: data.carData,
                            carEsgStatus: data.carEsgStatus,
                            carEsgData: data.carEsgData,
                            carEsgLastCheck: data.carEsgLastCheck,
                            emeCode: data.emeCode,
                            ruralRegionCode: data.ruralRegionCode,
                            createdAt: r.createdAt,
                            isFromResponse: true
                        };
                    } catch {
                        return null;
                    }
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((m: any) => m !== null)
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

const identifierSchema = z.object({
    category: z.enum(['personal', 'fiscal']),
    type: z.string(),
    value: z.string()
});

const agriculturalRegistrySchema = z.object({
    type: z.string(),
    value: z.string()
});

const updateProducerSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    countryCode: z.string().length(2).optional(),
    cpf: z.string().length(11).optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    assignedSupervisorIds: z.array(z.string()).optional(),
    identifiers: z.array(identifierSchema).optional(),
    agriculturalRegistry: agriculturalRegistrySchema.optional().nullable(),
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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check producer exists and user has access
        const existingProducer = await db.producer.findUnique({
            where: { id },
            select: { workspaceId: true }
        });

        if (!existingProducer) {
            return NextResponse.json({ error: "Producer not found" }, { status: 404 });
        }

        if (!hasWorkspaceAccess(session, existingProducer.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const validatedData = updateProducerSchema.parse(body);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const producer = await db.$transaction(async (tx: any) => {
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

            // 2. Sync Identifiers
            if (validatedData.identifiers) {
                // Delete existing identifiers
                await tx.producerIdentifier.deleteMany({
                    where: { producerId: id }
                });

                // Create new identifiers
                for (const identifier of validatedData.identifiers) {
                    await tx.producerIdentifier.create({
                        data: {
                            producerId: id,
                            category: identifier.category,
                            idType: identifier.type,
                            idValue: identifier.value
                        }
                    });
                }
            }

            // 3. Sync Agricultural Registry
            if (validatedData.agriculturalRegistry !== undefined) {
                // Delete existing
                await tx.agriculturalRegistry.deleteMany({
                    where: { producerId: id }
                });

                // Create new if provided
                if (validatedData.agriculturalRegistry) {
                    await tx.agriculturalRegistry.create({
                        data: {
                            producerId: id,
                            registryType: validatedData.agriculturalRegistry.type,
                            registryValue: validatedData.agriculturalRegistry.value,
                            countryCode: validatedData.countryCode || 'BR'
                        }
                    });
                }
            }

            // 4. Sync Sub-users
            if (validatedData.subUsers) {
                const subUsers = validatedData.subUsers;
                const existingSubUsers = await tx.subUser.findMany({
                    where: { producerId: id },
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const existingIds = existingSubUsers.map((s: any) => s.id);
                const incomingIds = subUsers
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .filter((s: any) => s.id && !s.id.startsWith("temp-"))
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .map((s: any) => s.id as string);

                // Delete sub-users not in incoming list
                const existingIdsArray = existingIds as string[];
                const toDelete = existingIdsArray.filter((extId: string) => !incomingIds.includes(extId));
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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check producer exists and user has access
        const existingProducer = await db.producer.findUnique({
            where: { id },
            select: { workspaceId: true }
        });

        if (!existingProducer) {
            return NextResponse.json({ error: "Producer not found" }, { status: 404 });
        }

        if (!hasWorkspaceAccess(session, existingProducer.workspaceId)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
