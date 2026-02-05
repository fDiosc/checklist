'use server';

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth, hashPassword } from "@/lib/auth";
import { isSuperAdmin, isAdmin, hasWorkspaceAccess } from "@/lib/workspace-context";
import { z } from "zod";

const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.enum(["ADMIN", "SUPERVISOR", "PRODUCER"]).optional(),
    password: z.string().min(8).optional(),
    workspaceId: z.string().nullable().optional(),
    cpf: z.string().nullable().optional(),
});

// GET /api/users/[id] - Get single user
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;

        const user = await db.user.findUnique({
            where: { id },
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
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        // Check access
        if (!isSuperAdmin(session)) {
            if (!user.workspace?.id || !hasWorkspaceAccess(session, user.workspace.id)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error fetching user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT /api/users/[id] - Update user
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const validation = updateUserSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ 
                error: "Dados inválidos", 
                details: validation.error.flatten() 
            }, { status: 400 });
        }

        const existingUser = await db.user.findUnique({
            where: { id },
            include: { workspace: true }
        });

        if (!existingUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        // Check access
        if (!isSuperAdmin(session)) {
            if (!existingUser.workspaceId || !hasWorkspaceAccess(session, existingUser.workspaceId)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const { name, email, role, password, workspaceId, cpf } = validation.data;

        // Check if email is being changed and is unique
        if (email && email !== existingUser.email) {
            const emailExists = await db.user.findUnique({ where: { email } });
            if (emailExists) {
                return NextResponse.json({ error: "Email já está em uso" }, { status: 400 });
            }
        }

        // Only SuperAdmin can change to ADMIN role
        if (role === "ADMIN" && !isSuperAdmin(session)) {
            return NextResponse.json({ 
                error: "Apenas SuperAdmin pode promover a Admin" 
            }, { status: 403 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (cpf !== undefined) updateData.cpf = cpf;
        
        // Only SuperAdmin can change workspace
        if (workspaceId !== undefined && isSuperAdmin(session)) {
            updateData.workspaceId = workspaceId;
        }

        if (password) {
            updateData.passwordHash = await hashPassword(password);
            updateData.mustChangePassword = true;
        }

        const user = await db.user.update({
            where: { id },
            data: updateData,
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
                    }
                }
            }
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Prevent self-deletion
        if (id === session.user.id) {
            return NextResponse.json({ error: "Não é possível excluir seu próprio usuário" }, { status: 400 });
        }

        const existingUser = await db.user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
        }

        // Check access
        if (!isSuperAdmin(session)) {
            if (!existingUser.workspaceId || !hasWorkspaceAccess(session, existingUser.workspaceId)) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Only SuperAdmin can delete ADMIN users
        if (existingUser.role === "ADMIN" && !isSuperAdmin(session)) {
            return NextResponse.json({ 
                error: "Apenas SuperAdmin pode excluir usuários Admin" 
            }, { status: 403 });
        }

        // Cannot delete SuperAdmin
        if (existingUser.role === "SUPERADMIN") {
            return NextResponse.json({ 
                error: "Não é possível excluir um SuperAdmin" 
            }, { status: 400 });
        }

        await db.user.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
