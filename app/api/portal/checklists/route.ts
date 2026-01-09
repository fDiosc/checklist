import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const cpf = searchParams.get('cpf');

    if (!cpf) {
        return NextResponse.json({ error: 'CPF is required' }, { status: 400 });
    }

    try {
        // Find producer by CPF
        const producer = await db.producer.findUnique({
            where: { cpf },
            include: {
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

        if (!producer) {
            return NextResponse.json({ error: 'Produtor não encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            producer: {
                name: producer.name,
                cpf: producer.cpf
            },
            checklists: producer.checklists
        });
    } catch (error) {
        console.error('Error fetching portal checklists:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
