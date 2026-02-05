import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        const { propertyMapId, carCode, countryCode, workspaceId } = await request.json();

        // ESG analysis only works for Brazilian properties (CAR is a Brazilian registry)
        if (countryCode && countryCode !== 'BR') {
            return NextResponse.json({ 
                error: 'Análise socioambiental disponível apenas para propriedades brasileiras',
                code: 'NON_BRAZILIAN_PROPERTY'
            }, { status: 400 });
        }

        if (!carCode) {
            return NextResponse.json({ 
                error: 'Código CAR é obrigatório para análise socioambiental',
                code: 'MISSING_CAR_CODE'
            }, { status: 400 });
        }

        // Validate CAR code format (should be alphanumeric with specific pattern)
        const cleanCarCode = carCode.trim();
        if (cleanCarCode.length < 10) {
            return NextResponse.json({ 
                error: 'Código CAR inválido',
                code: 'INVALID_CAR_CODE'
            }, { status: 400 });
        }

        // Determine workspace ID from session or request
        const targetWorkspaceId = workspaceId || session.user.workspaceId;
        if (!targetWorkspaceId) {
            return NextResponse.json({ error: 'Workspace não identificado' }, { status: 400 });
        }

        // Get workspace and check ESG configuration
        const workspace = await db.workspace.findUnique({
            where: { id: targetWorkspaceId },
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

        // Call External API
        const response = await fetch(`https://api.merx.tech/api/v1/integration/esg/cars/${cleanCarCode}:resume`, {
            method: 'GET',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ESG Property API Error:', response.status, errorText);
            
            if (response.status === 401 || response.status === 403) {
                return NextResponse.json({ 
                    error: 'Token de API inválido ou expirado',
                    code: 'INVALID_TOKEN'
                }, { status: 500 });
            }
            
            if (response.status === 404) {
                return NextResponse.json({ 
                    error: 'CAR não encontrado nos registros ambientais',
                    code: 'CAR_NOT_FOUND'
                }, { status: 404 });
            }

            return NextResponse.json({
                error: 'Falha ao consultar dados socioambientais',
                details: errorText,
                status: response.status
            }, { status: response.status });
        }

        const data = await response.json();

        // Save to Database
        if (propertyMapId) {
            if (propertyMapId.startsWith('resp-')) {
                // It's a map from a Checklist Response
                const responseId = propertyMapId.replace('resp-', '');
                const responseRecord = await db.response.findUnique({
                    where: { id: responseId }
                });

                if (responseRecord && responseRecord.answer) {
                    try {
                        const currentAnswer = JSON.parse(responseRecord.answer);
                        const updatedAnswer = {
                            ...currentAnswer,
                            carEsgStatus: data.esg_status,
                            carEsgData: data,
                            carEsgLastCheck: new Date()
                        };

                        await db.response.update({
                            where: { id: responseId },
                            data: {
                                answer: JSON.stringify(updatedAnswer)
                            }
                        });
                    } catch (e) {
                        console.error('Failed to parse/update response answer for ESG', e);
                    }
                }
            } else {
                // It's a standard PropertyMap
                await db.propertyMap.update({
                    where: { id: propertyMapId },
                    data: {
                        carEsgStatus: data.esg_status, // "CONFORME" | "NAO_CONFORME"
                        carEsgData: data,
                        carEsgLastCheck: new Date()
                    }
                });
            }
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error in ESG Property API:', error);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
    }
}
