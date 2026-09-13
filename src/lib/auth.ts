/**
 * Authentication utilities and helpers
 */
import "server-only";
import { authOptions } from "@/lib/auth-config";
import { UnauthorizedError, ForbiddenError, EntitlementError } from "./errors";
import { currentOrgId } from "./org-resolve";
import { checkEntitlement } from "./platform/entitlements";
import { UserRole } from "./constants";

/**
 * Get the current session (server-side)
 * For NextAuth v5 beta, use auth() function
 */
export async function getSession() {
  // NextAuth v5 beta - use auth() function
  const { auth } = await import("@/lib/auth-instance");
  return await auth();
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new UnauthorizedError("You must be logged in to access this resource");
  }

  // A revoked church has lost access entirely, reads included, so this is the
  // right place to stop it: before any page renders anything.
  //
  // Only REVOKED is checked here. READ_ONLY still reads, and refusing its
  // writes is the data layer's job - see lib/prisma.ts. Splitting it that way
  // means neither layer has to guess whether a given request intends to change
  // something, because each asks the question it can actually answer.
  const orgId = await currentOrgId();
  if (orgId) {
    const decision = await checkEntitlement(orgId, false);
    if (!decision.allow) {
      throw new EntitlementError(decision.reason);
    }
  }

  return session;
}

/**
 * Require a specific role - throws if user doesn't have the role
 */
export async function requireRole(requiredRole: UserRole) {
  const session = await requireAuth();
  const userRole = session.user.role as UserRole;

  const roleHierarchy: Record<UserRole, number> = {
    ADMIN: 3,
    STAFF: 2,
    VIEWER: 1,
  };

  if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
    throw new ForbiddenError(
      `This action requires ${requiredRole} role or higher`
    );
  }

  return session;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  try {
    await requireRole(requiredRole);
    return true;
  } catch {
    return false;
  }
}
