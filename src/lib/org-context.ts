import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * The church the current request belongs to.
 *
 * This exists so that tenancy is not something 163 database calls have to
 * remember. The alternative — every `where` clause naming its own `orgId` — is
 * one forgotten clause away from a church reading another church's students,
 * and forgetting is silent. Here, forgetting throws.
 */

export interface OrgContext {
  orgId: string
  slug: string
}

/**
 * What has been said about the current church, if anything.
 *
 * `none` is not the same as an empty store. An empty store means nobody has
 * said anything, so the host the request arrived on decides. `none` means
 * somebody said "deliberately no church" — provisioning, sign-in before the
 * church is known — and the host must not be allowed to override that.
 */
type Scope = { mode: 'org'; context: OrgContext } | { mode: 'none' }

const storage = new AsyncLocalStorage<Scope>()


/** Runs `fn` with `context` visible to every database call it makes. */
export function runInOrg<T>(context: OrgContext, fn: () => T): T {
  return storage.run({ mode: 'org', context }, fn)
}

/**
 * What has been explicitly entered, if anything. Does not consult the request.
 *
 * Returns `undefined` when nobody has said anything — the caller should then
 * fall back to the host — and `null` when somebody deliberately said no church.
 */
export function explicitScope(): OrgContext | null | undefined {
  const scope = storage.getStore()
  if (!scope) return undefined
  return scope.mode === 'org' ? scope.context : null
}

/**
 * Enters a church for the rest of this execution, without a callback to wrap.
 *
 * `runInOrg` is the right tool almost everywhere, because a scope with an end
 * is a scope you cannot forget to leave. This exists for the one place with no
 * function to wrap: a test process, which wants every direct database call in
 * the file to belong to the test church.
 */
export function enterOrg(context: OrgContext): void {
  storage.enterWith({ mode: 'org', context })
}

/**
 * Runs `fn` with no church in context, so the guard demands an explicit `orgId`
 * instead of supplying one.
 *
 * For the handful of operations that are genuinely about the installation
 * rather than about a church: provisioning, and signing in — which has to find
 * the user before it knows which church they are asking for. Every call site
 * should say which of those it is.
 */
export function withoutOrgScope<T>(fn: () => T): T {
  return storage.run({ mode: 'none' }, fn)
}
