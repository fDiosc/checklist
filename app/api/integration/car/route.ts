import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('latitude');
    const lng = searchParams.get('longitude');
    const workspaceId = searchParams.get('workspaceId') || session.user.workspaceId;

    if (!lat || !lng) {
        return NextResponse.json({ error: 'Latitude e Longitude são obrigatórios' }, { status: 400 });
    }

    if (!workspaceId) {
        return NextResponse.json({ error: 'Workspace não identificado' }, { status: 400 });
    }

    try {
        // Get workspace and check ESG/CAR configuration
        const workspace = await db.workspace.findUnique({
            where: { id: workspaceId },
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
        let cooperativeId: string | null = null;

        if (workspace.parentWorkspaceId) {
            // This is a subworkspace - check if parent allows ESG access
            if (!workspace.parentWorkspace?.esgApiEnabled || !workspace.parentWorkspace?.esgEnabledForSubworkspaces) {
                return NextResponse.json({ 
                    error: 'Integração CAR não está habilitada para este workspace',
                    code: 'CAR_NOT_ENABLED'
                }, { status: 403 });
            }
            apiKey = workspace.parentWorkspace.carApiKey;
            cooperativeId = workspace.parentWorkspace.carCooperativeId;
        } else {
            // This is a parent workspace
            if (!workspace.esgApiEnabled) {
                return NextResponse.json({ 
                    error: 'Integração CAR não está habilitada para este workspace',
                    code: 'CAR_NOT_ENABLED'
                }, { status: 403 });
            }
            apiKey = workspace.carApiKey;
            cooperativeId = workspace.carCooperativeId;
        }

        if (!apiKey || !cooperativeId) {
            return NextResponse.json({ 
                error: 'Credenciais de API não configuradas. Entre em contato com o administrador.',
                code: 'MISSING_API_CREDENTIALS'
            }, { status: 500 });
        }

        // Sanitize coordinates (ensure dot separator)
        const safeLat = String(lat).replace(',', '.');
        const safeLng = String(lng).replace(',', '.');

        const apiUrl = `https://api.merx.tech/api/v1/integration/car/getCarsByLatLong?latitude=${safeLat}&longitude=${safeLng}&cooperative-id=${cooperativeId}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('CAR API Error:', await response.text());
            return NextResponse.json({ error: 'Failed to fetch CAR data' }, { status: response.status });
        }

        const data = await response.json();

        // Parse WKB geom if present
        if (Array.isArray(data)) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const wkx = require('wkx');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.forEach((item: any) => {
                if (item.geom) {
                    try {
                        const buffer = Buffer.from(item.geom, 'hex');
                        const geometry = wkx.Geometry.parse(buffer);
                        item.geoJson = geometry.toGeoJSON();
                    } catch (e) {
                        console.error('Error parsing geometry:', e);
                    }
                }
            });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('PROXY CAR API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
