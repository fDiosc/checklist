import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { producerId, cpf } = await request.json();

        // Validate producer exists and is Brazilian
        if (!producerId) {
            return NextResponse.json({ error: 'ID do produtor é obrigatório' }, { status: 400 });
        }

        const producer = await db.producer.findUnique({
            where: { id: producerId },
            select: { countryCode: true, cpf: true, workspaceId: true }
        });

        if (!producer) {
            return NextResponse.json({ error: 'Produtor não encontrado' }, { status: 404 });
        }

        // ESG analysis only works for Brazilian producers
        if (producer.countryCode && producer.countryCode !== 'BR') {
            return NextResponse.json({ 
                error: 'Análise socioambiental disponível apenas para produtores brasileiros',
                code: 'NON_BRAZILIAN_PRODUCER'
            }, { status: 400 });
        }

        if (!cpf) {
            return NextResponse.json({ error: 'CPF é obrigatório para análise socioambiental' }, { status: 400 });
        }

        // Get workspace and check ESG configuration
        const workspace = await db.workspace.findUnique({
            where: { id: producer.workspaceId },
            include: {
                parentWorkspace: {
                    select: { 
                        id: true, 
                        carApiKey: true, 
                        carCooperativeId: true,
                        esgApiEnabled: true,
                        esgEnabledForSubworkspaces: true 
                    }
                }
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 });
        }

        // Determine API credentials based on workspace hierarchy
        let apiKey: string | null = null;

        if (workspace.parentWorkspaceId) {
            // This is a subworkspace - check if parent allows ESG access
            if (!workspace.parentWorkspace?.esgApiEnabled || !workspace.parentWorkspace?.esgEnabledForSubworkspaces) {
                return NextResponse.json({ 
                    error: 'Análise socioambiental não está habilitada para este workspace',
                    code: 'ESG_NOT_ENABLED'
                }, { status: 403 });
            }
            apiKey = workspace.parentWorkspace.carApiKey;
        } else {
            // This is a parent workspace
            if (!workspace.esgApiEnabled) {
                return NextResponse.json({ 
                    error: 'Análise socioambiental não está habilitada para este workspace',
                    code: 'ESG_NOT_ENABLED'
                }, { status: 403 });
            }
            apiKey = workspace.carApiKey;
        }

        if (!apiKey) {
            return NextResponse.json({ 
                error: 'Token de API não configurado. Entre em contato com o administrador.',
                code: 'MISSING_API_TOKEN'
            }, { status: 500 });
        }

        // Clean CPF (remove non-digits)
        const cleanCpf = cpf.replace(/\D/g, '');

        if (cleanCpf.length !== 11) {
            return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
        }

        // Call External API
        const response = await fetch(`https://api.merx.tech/api/v1/integration/esg/social-identities/${cleanCpf}:resume`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ESG API Error:', response.status, errorText);
            
            if (response.status === 401 || response.status === 403) {
                return NextResponse.json({ 
                    error: 'Token de API inválido ou expirado',
                    code: 'INVALID_TOKEN'
                }, { status: 500 });
            }
            
            if (response.status === 404) {
                return NextResponse.json({ 
                    error: 'CPF não encontrado nos registros socioambientais',
                    code: 'CPF_NOT_FOUND'
                }, { status: 404 });
            }

            return NextResponse.json({ 
                error: 'Falha ao consultar dados socioambientais', 
                details: errorText 
            }, { status: response.status });
        }

        const data = await response.json();

        // Save to Database
        await db.producer.update({
            where: { id: producerId },
            data: {
                esgStatus: data.esg_status, // "CONFORME" | "NAO_CONFORME"
                esgData: data,
                esgLastCheck: new Date()
            }
        });

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in ESG Producer API:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
