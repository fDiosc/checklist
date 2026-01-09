import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import ChecklistManagementClient from './checklist-management-client';

export default async function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { userId } = await auth();
    if (!userId) redirect('/');

    const { id } = await params;

    const checklist = await db.checklist.findUnique({
        where: { id },
        include: {
            producer: true,
            subUser: true,
            template: {
                include: {
                    sections: {
                        include: {
                            items: {
                                orderBy: { order: 'asc' }
                            }
                        },
                        orderBy: { order: 'asc' }
                    }
                }
            },
            responses: true
        }
    });

    if (!checklist) notFound();

    return (
        <ChecklistManagementClient checklist={checklist} />
    );
}
