import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ChecklistFormClient } from "./checklist-form-client";

export default async function PublicChecklistPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const { token } = await params;
    const checklist = await db.checklist.findUnique({
        where: { publicToken: token },
        include: {
            template: {
                include: {
                    sections: {
                        include: { items: true },
                        orderBy: { order: "asc" },
                    },
                },
            },
            responses: true,
            producer: {
                include: {
                    maps: true,
                    checklists: {
                        include: {
                            template: { select: { name: true } },
                            responses: {
                                where: {
                                    item: { type: 'PROPERTY_MAP' },
                                },
                                include: { item: true }
                            },
                        },
                        orderBy: { createdAt: "desc" },
                    }
                }
            },
        },
    });

    if (!checklist) {
        notFound();
    }


    // Aggregate maps from all producer's checklists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let aggregatedMaps: any[] = [];
    if (checklist.producer) {
        const extractedMaps = checklist.producer.checklists.flatMap(c =>
            c.responses
                .filter(r => r.item.type === 'PROPERTY_MAP' && r.answer)
                .map(r => {
                    try {
                        const data = JSON.parse(r.answer as string);
                        return {
                            id: `resp-${r.id}`,
                            producerId: checklist.producer?.id,
                            name: `Mapa do Checklist: ${c.template.name}`,
                            location: data.propertyLocation,
                            fields: data.fields,
                            city: data.city,
                            state: data.state,
                            createdAt: r.createdAt,
                            isFromResponse: true
                        };
                    } catch {
                        return null;
                    }
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .filter((m): m is any => m !== null)
        );
        aggregatedMaps = [...checklist.producer.maps, ...extractedMaps];
    }

    if (checklist.status === "FINALIZED") {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Checklist Finalizado
                    </h1>
                    <p className="text-gray-600">
                        Este checklist já foi revisado e finalizado.
                    </p>
                </div>
            </div>
        );
    }

    // Prepare a safe version of the checklist for the client, including aggregated maps
    const clientChecklist = {
        ...checklist,
        producer: checklist.producer ? {
            ...checklist.producer,
            maps: aggregatedMaps
        } : null
    };

    return <ChecklistFormClient checklist={clientChecklist} />;
}
