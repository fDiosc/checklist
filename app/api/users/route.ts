'use server';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth, hashPassword } from "@/lib/auth";
import { isSuperAdmin, isAdmin, getWorkspaceFilter } from "@/lib/workspace-context";
import { z } from "zod";

const createUserSchema = z.object({
    email: z.string().email("Email inválido"),
    name: z.string().min(1, "Nome é obrigatório"),
    password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    role: z.enum(["ADMIN", "SUPERVISOR", "PRODUCER"]),
    workspaceId: z.string().optional(),
    cpf: z.string().optional(),
});

// GET /api/users - List users
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins can list users
        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // SuperAdmin sees all users. Admin sees users in their workspace + subworkspaces.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let workspaceFilter: any = {};
        if (isSuperAdmin(session)) {
            workspaceFilter = {};
        } else {
            // Fetch subworkspaces of admin's workspace
            const adminWs = await db.workspace.findUnique({
                where: { id: session.user.workspaceId! },
                select: { hasSubworkspaces: true, subworkspaces: { select: { id: true } } }
            });
            if (adminWs?.hasSubworkspaces && adminWs.subworkspaces.length > 0) {
                const allIds = [session.user.workspaceId!, ...adminWs.subworkspaces.map(s => s.id)];
                workspaceFilter = { workspaceId: { in: allIds } };
            } else {
                workspaceFilter = getWorkspaceFilter(session);
            }
        }

        const users = await db.user.findMany({
            where: workspaceFilter,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                cpf: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admins can create users
        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const validation = createUserSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ 
                error: "Dados inválidos", 
                details: validation.error.flatten() 
            }, { status: 400 });
        }

        const { email, name, password, role, workspaceId, cpf } = validation.data;

        // Check if email already exists
        const existingUser = await db.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return NextResponse.json({ error: "Email já cadastrado" }, { status: 400 });
        }

        // Determine workspace ID
        let targetWorkspaceId: string | null = null;

        if (isSuperAdmin(session)) {
            // SuperAdmin can create users in any workspace
            if (workspaceId) {
                const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
                if (!workspace) {
                    return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
                }
                targetWorkspaceId = workspaceId;
            }
            // SuperAdmin can create global users (no workspace)
        } else if (workspaceId && workspaceId !== session.user.workspaceId) {
            // Admin wants to create a user in a different workspace.
            // Allowed only if the target is a subworkspace of the admin's workspace.
            const targetWs = await db.workspace.findUnique({
                where: { id: workspaceId },
                select: { id: true, parentWorkspaceId: true }
            });
            if (!targetWs || targetWs.parentWorkspaceId !== session.user.workspaceId) {
                return NextResponse.json(
                    { error: "Você só pode criar usuários no seu workspace ou em subworkspaces" },
                    { status: 403 }
                );
            }
            targetWorkspaceId = workspaceId;
        } else {
            // Admin creating in their own workspace (default)
            targetWorkspaceId = session.user.workspaceId;
        }

        // Admin can create other admins only in their own workspace
        // SuperAdmin can create any role in any workspace
        // Note: Only SuperAdmin can create SUPERADMIN users (not in schema options anyway)

        // Hash password
        const passwordHash = await hashPassword(password);

        const user = await db.user.create({
            data: {
                email,
                name,
                passwordHash,
                role,
                workspaceId: targetWorkspaceId,
                cpf: cpf || null,
                mustChangePassword: true,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                cpf: true,
                mustChangePassword: true,
                createdAt: true,
                workspace: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            }
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
