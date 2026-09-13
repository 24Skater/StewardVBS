import 'server-only'
import type { UserRole } from '@prisma/client'
import { prisma } from './prisma'
import { currentOrgId } from './org-resolve'

/**
 * What a person may do, in the church whose host they arrived on.
 *
 * Role used to live on `User`, which worked while there was one church per
 * deployment. Pooled, it cannot: a volunteer at two churches is one login and
 * two roles, and a role on `User` would be whichever church wrote last.
 *
 * The scoping is what makes this a security boundary rather than a lookup. The
 * guard narrows the membership query to the current church, so a session minted
 * on one church's host and replayed against another finds no membership and
 * gets no role — the session is rejected rather than downgraded.
 */
export async function roleInCurrentOrg(userId: string): Promise<UserRole | null> {
  const orgId = await currentOrgId()
  if (!orgId) return null

  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
    select: { role: true },
  })

  return membership?.role ?? null
}

/** Whether this person belongs to the church this request is for at all. */
export async function isMemberOfCurrentOrg(userId: string): Promise<boolean> {
  return (await roleInCurrentOrg(userId)) !== null
}
