/**
 * Which requests the entitlement gate applies to.
 *
 * Kept separate from `middleware.ts` because the interesting part is a decision
 * table, and a decision table that can only be exercised by standing up Next.js
 * and a session is a decision table nobody exercises. This function is pure: a
 * pathname in, a verdict out.
 *
 * Three verdicts:
 *
 *   bypass             Not an application request, or one that must survive
 *                      everything — signing in, being provisioned, being
 *                      health-checked.
 *   session-required   A staff surface. No session means sign in first.
 *   session-optional   An API route. A signed-in caller is checked against
 *                      their church's entitlement; an anonymous one is left
 *                      alone, because the route does its own authentication.
 *
 * The reason API routes are in here at all is Table's defect, inherited as a
 * lesson rather than as a bug: its enforcement sat inside a branch guarded by
 * the dashboard page prefixes, so `/api/...` never reached it and a revoked
 * church could still write through every endpoint its own dashboard called.
 * Pages were gated; the API behind them was not.
 */

export type GateKind = 'bypass' | 'none' | 'session-required' | 'session-optional'

export interface GateDecision {
  gate: GateKind
}

/**
 * Paths the middleware hands straight back.
 *
 * Each is here for its own reason, and none of them is "it seemed harmless":
 *
 * - `/_next` is not an application request.
 * - `/auth` is Auth.js and the sign-in pages. A church whose subscription
 *   lapsed has to be able to sign in, or it cannot pay.
 * - `/setup` is the first-run wizard. It runs before any church exists, so
 *   there is nothing to hold an entitlement; it refuses on its own once an
 *   admin exists.
 * - `/billing/required` is where the gate redirects. Gating it loops.
 * - `/api/internal` is the console calling in with a service token. It is how a
 *   church that failed to provision gets un-stuck, so it cannot depend on that
 *   church being entitled.
 * - `/api/health` is a readiness probe. A container must not fail its health
 *   check because a subscription lapsed - that would take the app out of the
 *   load balancer and turn a billing problem into an outage.
 * - `/api/setup` is the first-run wizard's own endpoint, for the same reason as
 *   the page.
 */
const BYPASS_PREFIXES = [
  '/_next',
  '/auth',
  '/setup',
  '/billing/required',
  '/api/internal',
  '/api/health',
  '/api/setup',
] as const

/** The staff surfaces. Everything else that renders is public. */
const STAFF_PREFIXES = [
  '/admin',
  '/attendance',
  '/checkin',
  '/dashboard',
  '/reports',
  '/schedule',
  '/students',
] as const

/**
 * Prefix match on a path *segment* boundary.
 *
 * `/studentsomething` is not under `/students`. A bare `startsWith` would gate
 * a public path that merely begins with the same letters, and - worse in the
 * other direction - a future `/api/internals` would inherit `/api/internal`'s
 * exemption.
 */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function gateFor(pathname: string): GateDecision {
  if (BYPASS_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    return { gate: 'bypass' }
  }

  if (STAFF_PREFIXES.some((prefix) => isUnder(pathname, prefix))) {
    return { gate: 'session-required' }
  }

  if (isUnder(pathname, '/api')) {
    return { gate: 'session-optional' }
  }

  return { gate: 'none' }
}

/**
 * Whether a path is a static asset rather than an application request.
 *
 * A dot in the last segment means a file. API routes are excluded on purpose: a
 * route parameter is free to contain a dot, and treating `/api/students/a.b` as
 * a static file would hand an ungated request straight through the gate this
 * module exists to close.
 */
export function isStaticAsset(pathname: string): boolean {
  if (isUnder(pathname, '/api')) return false
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1)
  return lastSegment.includes('.')
}
