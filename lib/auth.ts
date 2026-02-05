import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email: string;
            name?: string | null;
            role: UserRole;
            workspaceId: string | null;
            mustChangePassword: boolean;
        };
    }

    interface User {
        id: string;
        email: string;
        name?: string | null;
        role: UserRole;
        workspaceId: string | null;
        mustChangePassword: boolean;
    }

    interface JWT {
        id: string;
        email: string;
        name?: string | null;
        role: UserRole;
        workspaceId: string | null;
        mustChangePassword: boolean;
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapter: PrismaAdapter(db) as any,
    trustHost: true, // Required for production behind reverse proxy (CapRover/Docker)
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/sign-in",
        error: "/sign-in",
    },
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log("[AUTH] Authorize called");
                
                if (!credentials?.email || !credentials?.password) {
                    console.log("[AUTH] Missing credentials");
                    return null;
                }

                console.log("[AUTH] Email:", credentials.email);

                try {
                    const user = await db.user.findUnique({
                        where: { email: credentials.email as string },
                    });

                    if (!user) {
                        console.log("[AUTH] User not found");
                        return null;
                    }

                    console.log("[AUTH] User found:", user.email, "Role:", user.role);

                    const isPasswordValid = await bcrypt.compare(
                        credentials.password as string,
                        user.passwordHash
                    );

                    console.log("[AUTH] Password valid:", isPasswordValid);

                    if (!isPasswordValid) {
                        console.log("[AUTH] Invalid password");
                        return null;
                    }

                    console.log("[AUTH] Login successful for:", user.email);

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        workspaceId: user.workspaceId,
                        mustChangePassword: user.mustChangePassword,
                    };
                } catch (error) {
                    console.error("[AUTH] Error:", error);
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            // Initial sign in
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.role = user.role;
                token.workspaceId = user.workspaceId;
                token.mustChangePassword = user.mustChangePassword;
            }

            // Update session when triggered
            if (trigger === "update" && session) {
                token.mustChangePassword = session.mustChangePassword ?? token.mustChangePassword;
                token.name = session.name ?? token.name;
            }

            return token;
        },
        async session({ session, token }) {
            session.user = {
                id: token.id as string,
                email: token.email as string,
                name: token.name as string | null,
                role: token.role as UserRole,
                workspaceId: token.workspaceId as string | null,
                mustChangePassword: token.mustChangePassword as boolean,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any;
            return session;
        },
    },
});

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
}

// Helper function to verify passwords
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
}
