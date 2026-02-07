import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import ChecklistManagementClient from './checklist-management-client';
import { hasWorkspaceAccessWithHierarchy } from '@/lib/workspace-context';

interface PageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ readonly?: string }>;
}

export default async function ChecklistDetailPage({ params, searchParams }: PageProps) {
    const session = await auth();
    if (!session?.user) redirect('/');

    const { id } = await params;
    const { readonly: readonlyParam } = await searchParams;

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
                                include: { conditions: true },
                                orderBy: { order: 'asc' },
                            },
                            level: true,
                        },
                        orderBy: { order: 'asc' },
                    },
                    levels: { orderBy: { order: 'asc' } },
                    classifications: { orderBy: { order: 'asc' } },
                    scopeFields: { orderBy: { order: 'asc' } },
                }
            },
            targetLevel: true,
            achievedLevel: true,
            scopeAnswers: true,
            responses: true,
            actionPlans: true,
            parent: {
                select: {
                    id: true,
                    publicToken: true,
                    template: { select: { name: true } },
                    actionPlans: true,
                    scopeAnswers: true,
                }
            },
            children: {
                select: {
                    id: true,
                    publicToken: true,
                    status: true,
                    type: true,
                    createdAt: true,
                    finalizedAt: true,
                    responses: {
                        select: {
                            status: true,
                            rejectionReason: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!checklist) {
        notFound();
    }

    // Check workspace access - use hierarchy check for parent workspaces viewing subworkspace data
    const hasAccess = await hasWorkspaceAccessWithHierarchy(session, checklist.workspaceId);

    if (!hasAccess) {
        redirect('/dashboard');
    }

    // Determine if this checklist should be read-only (from subworkspace)
    const isFromSubworkspace = checklist.workspaceId !== session.user.workspaceId;
    const isReadOnly = readonlyParam === 'true' || isFromSubworkspace;

    // Get property maps for this producer
    const producerMaps = checklist.producerId 
        ? await db.propertyMap.findMany({
            where: { producerId: checklist.producerId }
        })
        : [];

    // For child checklists, inherit scope answers from parent
    const clientChecklist = checklist.parentId && checklist.parent?.scopeAnswers
        ? { ...checklist, scopeAnswers: checklist.parent.scopeAnswers }
        : checklist;

    return <ChecklistManagementClient 
        checklist={clientChecklist} 
        producerMaps={producerMaps}
        readOnly={isReadOnly}
    />;
}
