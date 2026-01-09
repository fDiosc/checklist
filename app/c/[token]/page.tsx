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
                select: {
                    name: true,
                    maps: true,
                },
            },
        },
    });

    if (!checklist) {
        notFound();
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

    return <ChecklistFormClient checklist={checklist} />;
}
