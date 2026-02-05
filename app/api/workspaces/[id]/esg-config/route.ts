'use server';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/workspace-context";
import { z } from "zod";

const updateEsgConfigSchema = z.object({
    carApiKey: z.string().min(1).optional().nullable(),
    carCooperativeId: z.string().min(1).optional().nullable(),
    esgApiEnabled: z.boolean().optional(),
    esgEnabledForSubworkspaces: z.boolean().optional(),
});

// GET /api/workspaces/[id]/esg-config - Get ESG configuration
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can view ESG configuration
        if (!isSuperAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        const workspace = await db.workspace.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                carApiKey: true,
                carCooperativeId: true,
                esgApiEnabled: true,
                esgEnabledForSubworkspaces: true,
                hasSubworkspaces: true,
                parentWorkspaceId: true,
            }
        });

        if (!workspace) {
            return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
        }

        // Mask the API key for security (show only last 4 characters)
        const maskedApiKey = workspace.carApiKey 
            ? `${'*'.repeat(Math.max(0, workspace.carApiKey.length - 4))}${workspace.carApiKey.slice(-4)}`
            : null;

        return NextResponse.json({
            ...workspace,
            carApiKey: maskedApiKey,
            hasApiKey: !!workspace.carApiKey,
        });
    } catch (error) {
        console.error("Error fetching ESG config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT /api/workspaces/[id]/esg-config - Update ESG configuration
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only SuperAdmin can update ESG configuration
        if (!isSuperAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const validation = updateEsgConfigSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ 
                error: "Dados inválidos", 
                details: validation.error.flatten() 
            }, { status: 400 });
        }

        const existingWorkspace = await db.workspace.findUnique({
            where: { id },
            select: {
                id: true,
                parentWorkspaceId: true,
            }
        });

        if (!existingWorkspace) {
            return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
        }

        // ESG configuration can only be set on parent workspaces
        if (existingWorkspace.parentWorkspaceId) {
            return NextResponse.json({ 
                error: "Configuração de API só pode ser definida em workspaces principais (não subworkspaces)" 
            }, { status: 400 });
        }

        const { carApiKey, carCooperativeId, esgApiEnabled, esgEnabledForSubworkspaces } = validation.data;

        // Build update data - only include fields that are provided
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};
        
        if (carApiKey !== undefined) {
            updateData.carApiKey = carApiKey;
        }
        if (carCooperativeId !== undefined) {
            updateData.carCooperativeId = carCooperativeId;
        }
        if (esgApiEnabled !== undefined) {
            updateData.esgApiEnabled = esgApiEnabled;
        }
        if (esgEnabledForSubworkspaces !== undefined) {
            updateData.esgEnabledForSubworkspaces = esgEnabledForSubworkspaces;
        }

        const workspace = await db.workspace.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                esgApiEnabled: true,
                esgEnabledForSubworkspaces: true,
                hasSubworkspaces: true,
            }
        });

        return NextResponse.json({
            ...workspace,
            hasApiKey: !!carApiKey || (carApiKey === undefined && !!(await db.workspace.findUnique({ where: { id }, select: { carApiKey: true } }))?.carApiKey),
        });
    } catch (error) {
        console.error("Error updating ESG config:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
