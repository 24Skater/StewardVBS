import 'server-only'
import { unscopedPrisma } from './prisma-unscoped'
import { explicitScope, type OrgContext } from './org-context'
import { ORG_SLUG_HEADER, rootDomain } from './platform-domain'

/**
 * Turning the host a request arrived on into the church it belongs to.
 *
 * Kept apart from `org-context.ts` so that the storage primitives stay free of
 * `server-only` and of Prisma, and can therefore be unit-tested. This half is
 * the part that talks to Next and to the database.
 *
 * The lookup deliberately uses the unscoped client: resolving which church a
 * request belongs to is the one query that cannot already know the answer.
 */

interface CachedOrg {
  value: OrgContext | null
  expiresAt: number
}

/**
 * Slug to church, cached for a minute.
 *
 * Every database call in a request would otherwise re-resolve the same host.
 * A minute is short enough that a renamed or removed church corrects itself
 * quickly and long enough that the lookup stops being per-query. Negative
 * results are cached too, so an unknown host cannot be used to hammer the
 * database.
 */
const cache = new Map<string, CachedOrg>()
const CACHE_TTL_MS = 60_000

/** Cache key for the self-hosted single church; never a valid slug. */
const SOLE_ORG_KEY = ':sole:' 

export function clearOrgCache(): void {
  cache.clear()
}

/**
 * The one church on a self-hosted install.
 *
 * A church running its own copy has no platform root domain and no tenant
 * subdomain — it reaches the app on a hostname of its own choosing, and there
 * is exactly one church in the database. Resolving that sole row is what keeps
 * a self-hosted install behaving exactly as it did before tenancy existed.
 *
 * Two orgs with no root domain configured is not a tenancy the app can serve:
 * there is nothing in the request that says which one is meant. That throws
 * rather than picking, because picking would serve one church another's data.
 */
async function soleOrg(): Promise<OrgContext | null> {
  const hit = cache.get(SOLE_ORG_KEY)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  const orgs = await unscopedPrisma.org.findMany({
    select: { id: true, slug: true },
    take: 2,
    orderBy: { createdAt: 'asc' },
  })

  if (orgs.length > 1) {
    throw new Error(
      '[Tenancy] More than one church exists but PLATFORM_ROOT_DOMAIN is not set, so nothing ' +
        'in a request says which church it belongs to. Set PLATFORM_ROOT_DOMAIN to serve ' +
        'several churches from one deployment.'
    )
  }

  // Nothing is cached until a church exists: caching "no church" would make
  // first-run setup wait out the TTL before the app could see what it created.
  const org = orgs[0]
  if (!org) return null

  const value = { orgId: org.id, slug: org.slug }
  cache.set(SOLE_ORG_KEY, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

async function orgForSlug(slug: string): Promise<OrgContext | null> {
  const hit = cache.get(slug)
  if (hit && hit.expiresAt > Date.now()) return hit.value

  const org = await unscopedPrisma.org.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  })

  const value = org ? { orgId: org.id, slug: org.slug } : null
  cache.set(slug, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

/**
 * The church this execution belongs to, or null.
 *
 * Checks the explicitly-entered context first — provisioning, background work
 * and tests set that — and falls back to the slug the edge middleware read off
 * the Host header. Outside any request, and with nothing entered explicitly,
 * the answer is null and the guard will throw rather than guess.
 */
export async function currentOrg(): Promise<OrgContext | null> {
  // undefined means nobody has said: fall through to the host. null means
  // somebody deliberately said no church, and the host must not override it.
  const explicit = explicitScope()
  if (explicit !== undefined) return explicit

  // Self-hosted: no platform root domain, so no tenant subdomain to read, and
  // exactly one church to be.
  if (!rootDomain()) return soleOrg()

  // Imported lazily: `next/headers` throws outside a request, and this module
  // is also loaded by scripts and by the provisioning path.
  let slug: string | null = null
  try {
    const { headers } = await import('next/headers')
    slug = (await headers()).get(ORG_SLUG_HEADER)
  } catch {
    return null
  }

  if (!slug) return null
  return orgForSlug(slug)
}

export async function currentOrgId(): Promise<string | null> {
  return (await currentOrg())?.orgId ?? null
}

/**
 * The current church id, or a thrown error.
 *
 * For code that genuinely cannot proceed without one — as opposed to the
 * database guard, which produces its own message naming the model.
 */
export async function requireOrgId(): Promise<string> {
  const orgId = await currentOrgId()
  if (!orgId) throw new Error('[Tenancy] No church in context.')
  return orgId
}
