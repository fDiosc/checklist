import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');

    if (!cpf) {
        return NextResponse.json({ error: 'CPF is required' }, { status: 400 });
    }

    try {
        // Find all producers with this CPF (may exist in multiple workspaces)
        const producers = await db.producer.findMany({
            where: { cpf },
            include: {
                workspace: {
                    select: { name: true }
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

        // Combine checklists from all workspaces where producer exists
        const allChecklists = producers.flatMap(p => 
            p.checklists.map(c => ({
                ...c,
                workspaceName: p.workspace.name
            }))
        );

        // Sort by date
        allChecklists.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        return NextResponse.json({
            producer: {
                name: producers[0].name,
                cpf: producers[0].cpf
            },
            checklists: allChecklists
        });
    } catch (error) {
        console.error('Error fetching portal checklists:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
