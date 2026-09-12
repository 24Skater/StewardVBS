/**
 * Every hostname this app knows about, derived from one environment variable.
 *
 * The platform root domain is configuration and never a source constant. It has
 * changed once already, while the product was being named, and the only reason
 * that was a one-line change rather than a search-and-replace across five repos
 * is that nothing hardcodes it. `scripts/ci/check-platform-boundaries.sh` keeps
 * it that way.
 */

/** The label this application answers to under the tenant root. */
export const APP_LABEL = 'stewardvbs'

/**
 * Header the edge middleware writes the tenant slug into.
 *
 * Lives here rather than beside the request-scope storage because the
 * middleware needs it and runs on the Edge runtime: importing it from
 * `org-context.ts` would drag `node:async_hooks` into the edge bundle for the
 * sake of one string.
 */
export const ORG_SLUG_HEADER = 'x-steward-org-slug'

/**
 * The platform root domain, or null when this is a self-hosted install.
 *
 * Null is not an error. A church running its own copy has one church on one
 * hostname of its own choosing, and asking it to invent a platform domain would
 * be asking it to pretend to be the platform.
 */
export function rootDomain(): string | null {
  const value = process.env.PLATFORM_ROOT_DOMAIN?.trim()
  return value ? value : null
}

/**
 * The root domain with any port removed.
 *
 * A Host header carries the port the browser dialled; a hostname comparison
 * cannot. Local development is the only place the root domain is configured
 * with one, so a root that kept its port matched no host at all — which is
 * exactly the defect that made the platform unrunnable on one machine until it
 * was found by hand. Production roots have no port and are unaffected.
 */
function rootHostname(): string | null {
  const root = rootDomain()
  return root ? root.split(':')[0].toLowerCase() : null
}

/** Where a given church's VBS lives, e.g. `grace-stewardvbs.app.example.org`. */
export function tenantHost(slug: string): string | null {
  const root = rootDomain()
  return root ? `${slug}-${APP_LABEL}.app.${root}` : null
}

/** The full https URL for a church's VBS. */
export function tenantUrl(slug: string): string | null {
  const host = tenantHost(slug)
  return host ? `https://${host}` : null
}

/**
 * The church slug in a Host header, or null.
 *
 * Ports are stripped, case is ignored, and anything that is not exactly
 * `{slug}-{APP_LABEL}.app.{root}` returns null — including a host for a
 * different Steward application, which must not resolve here.
 */
export function extractTenantSlug(host: string | undefined | null): string | null {
  const root = rootHostname()
  if (!host || !root) return null

  const hostname = host.split(':')[0].trim().toLowerCase()
  const suffix = `.app.${root}`
  if (!hostname.endsWith(suffix)) return null

  const label = hostname.slice(0, -suffix.length)
  const marker = `-${APP_LABEL}`
  if (!label.endsWith(marker)) return null

  const slug = label.slice(0, -marker.length)
  // A slug is what the console allows: lowercase letters, digits and hyphens,
  // not empty, and not leading or trailing a hyphen.
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) ? slug : null
}
