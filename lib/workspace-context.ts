import { Session } from "next-auth";
import { UserRole } from "@prisma/client";
import { db } from "./db";

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
 * Check if user has access to a specific workspace (sync version - does not check hierarchy)
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
 * Check if user has access to a specific workspace (async version - checks hierarchy)
 * Parent workspaces can access their subworkspaces' data
 */
export async function hasWorkspaceAccessWithHierarchy(session: Session | null, targetWorkspaceId: string): Promise<boolean> {
    if (!session?.user) {
        return false;
    }

    // SuperAdmin can access any workspace
    if (session.user.role === "SUPERADMIN") {
        return true;
    }

    if (!session.user.workspaceId) {
        return false;
    }

    // Direct match
    if (session.user.workspaceId === targetWorkspaceId) {
        return true;
    }

    // Check if target is a subworkspace of user's workspace
    const userWorkspace = await db.workspace.findUnique({
        where: { id: session.user.workspaceId },
        select: {
            hasSubworkspaces: true,
            subworkspaces: {
                select: { id: true }
            }
        }
    });

    if (userWorkspace?.hasSubworkspaces) {
        return userWorkspace.subworkspaces.some(sw => sw.id === targetWorkspaceId);
    }

    return false;
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

/**
 * Get all workspace IDs that a user can see (includes subworkspaces for parent workspaces)
 * Returns null for SuperAdmin (meaning all workspaces)
 */
export async function getVisibleWorkspaceIds(session: Session | null): Promise<string[] | null> {
    if (!session?.user) {
        throw new Error("Unauthorized");
    }

    // SuperAdmin can see all
    if (session.user.role === "SUPERADMIN") {
        return null;
    }

    if (!session.user.workspaceId) {
        throw new Error("User has no workspace assigned");
    }

    // Get the user's workspace to check if it has subworkspaces
    const workspace = await db.workspace.findUnique({
        where: { id: session.user.workspaceId },
        select: {
            id: true,
            hasSubworkspaces: true,
            parentWorkspaceId: true,
            subworkspaces: {
                select: { id: true }
            }
        }
    });

    if (!workspace) {
        throw new Error("Workspace not found");
    }

    // If user is in a subworkspace, they only see their own workspace
    if (workspace.parentWorkspaceId) {
        return [session.user.workspaceId];
    }

    // If workspace has subworkspaces, include all child workspace IDs
    if (workspace.hasSubworkspaces && workspace.subworkspaces.length > 0) {
        return [
            session.user.workspaceId,
            ...workspace.subworkspaces.map(sw => sw.id)
        ];
    }

    // Normal workspace without subworkspaces
    return [session.user.workspaceId];
}

/**
 * Get workspace filter for database queries that supports subworkspaces
 * For parent workspaces with hasSubworkspaces=true, includes all subworkspace data
 */
export async function getSubworkspaceFilter(session: Session | null): Promise<{ workspaceId?: string | { in: string[] } }> {
    const visibleIds = await getVisibleWorkspaceIds(session);
    
    // SuperAdmin sees all
    if (visibleIds === null) {
        return {};
    }

    // Single workspace
    if (visibleIds.length === 1) {
        return { workspaceId: visibleIds[0] };
    }

    // Multiple workspaces (parent + subworkspaces)
    return { workspaceId: { in: visibleIds } };
}

/**
 * Check if a workspace is a subworkspace of another
 */
export async function isSubworkspaceOf(subworkspaceId: string, parentWorkspaceId: string): Promise<boolean> {
    const subworkspace = await db.workspace.findUnique({
        where: { id: subworkspaceId },
        select: { parentWorkspaceId: true }
    });

    return subworkspace?.parentWorkspaceId === parentWorkspaceId;
}

/**
 * Get workspace info including subworkspace relationship
 */
export async function getWorkspaceWithHierarchy(workspaceId: string) {
    return db.workspace.findUnique({
        where: { id: workspaceId },
        select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            cnpj: true,
            hasSubworkspaces: true,
            parentWorkspaceId: true,
            parentWorkspace: {
                select: {
                    id: true,
                    name: true,
                    slug: true
                }
            },
            subworkspaces: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    cnpj: true
                }
            }
        }
    });
}
