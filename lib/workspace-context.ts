import { Session } from "next-auth";
import { UserRole } from "@prisma/client";

/**
 * Get workspace filter for database queries
 * SuperAdmin can see all workspaces, others only see their own
 */
export function getWorkspaceFilter(session: Session | null): { workspaceId?: string } {
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    // SuperAdmin can access all workspaces
    if (session.user.role === "SUPERADMIN") {
        return {};
    }

    // All other users are restricted to their workspace
    if (!session.user.workspaceId) {
        throw new Error("User has no workspace assigned");
    }

    return { workspaceId: session.user.workspaceId };
}

/**
 * Check if user has access to a specific workspace
 */
export function hasWorkspaceAccess(session: Session | null, workspaceId: string): boolean {
    if (!session?.user) {
        return false;
    }

    // SuperAdmin can access any workspace
    if (session.user.role === "SUPERADMIN") {
        return true;
    }

    return session.user.workspaceId === workspaceId;
}

/**
 * Check if user has a specific role or higher
 */
export function hasRole(session: Session | null, requiredRole: UserRole): boolean {
    if (!session?.user) {
        return false;
    }

    const roleHierarchy: Record<UserRole, number> = {
        SUPERADMIN: 4,
        ADMIN: 3,
        SUPERVISOR: 2,
        PRODUCER: 1,
    };

    return roleHierarchy[session.user.role] >= roleHierarchy[requiredRole];
}

/**
 * Check if user is an admin (SUPERADMIN or ADMIN)
 */
export function isAdmin(session: Session | null): boolean {
    return hasRole(session, "ADMIN");
}

/**
 * Check if user is a SuperAdmin
 */
export function isSuperAdmin(session: Session | null): boolean {
    return session?.user?.role === "SUPERADMIN";
}

/**
 * Get the workspace ID to use for creating new resources
 */
export function getCreateWorkspaceId(session: Session | null): string {
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    if (!session.user.workspaceId && session.user.role !== "SUPERADMIN") {
        throw new Error("User has no workspace assigned");
    }

    // For SuperAdmin, they must specify a workspace when creating resources
    // This should be handled in the API route
    if (!session.user.workspaceId) {
        throw new Error("SuperAdmin must specify a workspace");
    }

    return session.user.workspaceId;
}
