import "server-only";
import { prisma } from "./prisma";
import { randomBytes } from "crypto";
import { UserRole } from "./constants";
import { requireOrgId } from '@/lib/org-resolve';

/**
 * Create an invitation for a user to join with a specific role
 * Deletes any existing invitation for the same email
 */
export async function createInvitation(
  email: string,
  role: UserRole,
  invitedBy: string
) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const normalizedEmail = email.toLowerCase();

  // Delete existing invitation for this email if any
  await prisma.invitation.deleteMany({
    where: { email: normalizedEmail },
  });

  return await prisma.invitation.create({
    data: {
      orgId: await requireOrgId(),
      email: normalizedEmail,
      role,
      token,
      expiresAt,
      invitedBy,
    },
  });
}

/**
 * Validate an invitation token and return the invitation if valid
 */
export async function validateInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      inviter: {
        select: { name: true, email: true },
      },
    },
  });

  if (!invitation) return null;
  if (invitation.usedAt) return null;
  if (invitation.expiresAt < new Date()) return null;

  return invitation;
}

/**
 * Mark an invitation as used
 */
export async function markInvitationUsed(token: string) {
  await prisma.invitation.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}

/**
 * Get pending invitations for the admin panel
 */
export async function getPendingInvitations() {
  return await prisma.invitation.findMany({
    where: {
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      inviter: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Delete an invitation
 */
export async function deleteInvitation(id: string) {
  await prisma.invitation.delete({
    where: { id },
  });
}

/**
 * Check if there's a valid invitation for an email and return the role
 */
export async function checkInvitationForEmail(email: string): Promise<UserRole | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { orgId_email: { orgId: await requireOrgId(), email: email.toLowerCase() } },
  });

  if (!invitation) return null;
  if (invitation.usedAt) return null;
  if (invitation.expiresAt < new Date()) return null;

  return invitation.role;
}

/**
 * Mark invitation as used by email (called after user signs up)
 */
export async function markInvitationUsedByEmail(email: string) {
  try {
    await prisma.invitation.updateMany({
      where: {
        email: email.toLowerCase(),
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
  } catch {
    // Ignore if no invitation exists
  }
}

