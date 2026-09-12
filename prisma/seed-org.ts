import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

/**
 * The church a seed writes into.
 *
 * Every seed needs one, because every interesting table is now NOT NULL on
 * `orgId`. Congregation learned this the expensive way: its seed ran before any
 * church existed, died partway through, and left an install with no permissions
 * and no recovery account. Putting the lookup here means a new seed cannot
 * forget it, and `seed-tenancy.test.ts` fails if one tries.
 *
 * Find-or-create rather than create, so a seed can be run twice.
 */
export const SEED_ORG_SLUG = 'primary'

export async function seedOrg(prisma: PrismaClient): Promise<{ id: string; slug: string }> {
  const existing = await prisma.org.findUnique({
    where: { slug: SEED_ORG_SLUG },
    select: { id: true, slug: true },
  })
  if (existing) return existing

  return prisma.org.create({
    data: { id: randomUUID(), slug: SEED_ORG_SLUG, name: 'Demo Church' },
    select: { id: true, slug: true },
  })
}
