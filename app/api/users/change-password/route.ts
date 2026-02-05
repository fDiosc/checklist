import { NextResponse } from "next/server";
import { auth, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
});

export async function POST(req: Request) {
    try {
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validatedData = changePasswordSchema.parse(body);

        // Get current user with password hash
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            select: { passwordHash: true },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Verify current password
        const isCurrentPasswordValid = await verifyPassword(
            validatedData.currentPassword,
            user.passwordHash
        );

        if (!isCurrentPasswordValid) {
            return NextResponse.json(
                { error: "Senha atual incorreta" },
                { status: 400 }
            );
        }

        // Hash new password
        const newPasswordHash = await hashPassword(validatedData.newPassword);

        // Update password and clear mustChangePassword flag
        await db.user.update({
            where: { id: session.user.id },
            data: {
                passwordHash: newPasswordHash,
                mustChangePassword: false,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error changing password:", error);
        
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Dados inválidos", details: error.errors },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
