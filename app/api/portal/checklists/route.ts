import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');
    const workspaceId = searchParams.get('workspaceId'); // Optional filter

    if (!cpf) {
        return NextResponse.json({ error: 'CPF is required' }, { status: 400 });
    }

    try {
        // Find all producers with this CPF (may exist in multiple workspaces)
        const producers = await db.producer.findMany({
            where: { cpf },
            include: {
                workspace: {
                    select: { 
                        id: true,
                        name: true,
                        logoUrl: true,
                        parentWorkspaceId: true
                    }
                },
                checklists: {
                    include: {
                        template: {
                            select: {
                                name: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (producers.length === 0) {
            return NextResponse.json({ error: 'Produtor não encontrado' }, { status: 404 });
        }

        // Build list of available workspaces for this producer
        const availableWorkspaces = producers.map(p => ({
            id: p.workspace.id,
            name: p.workspace.name,
            logoUrl: p.workspace.logoUrl,
            isSubworkspace: !!p.workspace.parentWorkspaceId
        }));

        // Filter by workspace if specified
        let filteredProducers = producers;
        if (workspaceId) {
            filteredProducers = producers.filter(p => p.workspace.id === workspaceId);
            if (filteredProducers.length === 0) {
                // If no producers in selected workspace, return empty checklists
                return NextResponse.json({
                    producer: {
                        name: producers[0].name,
                        cpf: producers[0].cpf
                    },
                    checklists: [],
                    availableWorkspaces,
                    selectedWorkspace: null
                });
            }
        }

        // Combine checklists from filtered workspaces
        const allChecklists = filteredProducers.flatMap(p => 
            p.checklists.map(c => ({
                ...c,
                workspaceId: p.workspace.id,
                workspaceName: p.workspace.name
            }))
        );

        // Sort by date
        allChecklists.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Get selected workspace info
        const selectedWorkspace = workspaceId 
            ? availableWorkspaces.find(w => w.id === workspaceId) 
            : availableWorkspaces.length === 1 
                ? availableWorkspaces[0] 
                : null;

        return NextResponse.json({
            producer: {
                name: producers[0].name,
                cpf: producers[0].cpf
            },
            checklists: allChecklists,
            availableWorkspaces,
            selectedWorkspace,
            hasMultipleWorkspaces: availableWorkspaces.length > 1
        });
    } catch (error) {
        console.error('Error fetching portal checklists:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
