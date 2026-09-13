import 'server-only'
import { PrismaClient } from '@prisma/client'

/**
 * The database, with no church scoping at all.
 *
 * Deliberately a separate export rather than a flag on the guarded client. An
 * escape hatch spelled `prisma.student.findMany({ _bypassOrgScope: true })`
 * hides inside an ordinary-looking call and needs a cast to type-check; this
 * one is visible in the import list, greppable in one search, and impossible to
 * reach by accident.
 *
 * There are exactly three legitimate users:
 *
 *   1. Resolving which church a request belongs to — the one query that cannot
 *      already know the answer.
 *   2. Provisioning a new church, and the first-run wizard that does the same
 *      job on a self-hosted install. Both run before there is a church to be
 *      inside.
 *   3. Asking about the installation rather than about a church: "has anyone
 *      finished setting this up".
 *
 * Anything else belongs on the guarded client. If you are reaching for this to
 * make a query work, the query is the thing that is wrong.
 */
const globalForUnscoped = globalThis as unknown as { unscopedPrisma?: PrismaClient }

export const unscopedPrisma = globalForUnscoped.unscopedPrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForUnscoped.unscopedPrisma = unscopedPrisma
