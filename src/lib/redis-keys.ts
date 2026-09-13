import 'server-only'
import { currentOrgId } from './org-resolve'

/**
 * Namespacing Redis by church.
 *
 * One Redis serves every church on a cell, so a key that names only an IP or an
 * email is a key two churches share. That is not a theoretical problem:
 *
 * - `rl:<ip>` meant two churches behind one office network, or one busy church,
 *   spending each other's rate-limit budget.
 * - `lockout:<email>` meant an attacker could lock somebody out of *every*
 *   church by attacking the sign-in page of one.
 *
 * The lockout case is the one worth arguing about, because the credential
 * really is global — one login, several churches — so a global lockout has a
 * case. It loses to the denial of service: scoping multiplies an attacker's
 * allowance by the number of churches they can find, which against a bcrypt
 * hash is nothing, while a global lockout hands them a way to lock a pastor out
 * of a Sunday from a church they have nothing to do with. Contain the blast
 * radius; the IP rate limit throttles the brute force independently.
 *
 * Self-hosted installs resolve their sole church and get a stable prefix of
 * their own, so nothing changes for them beyond the key names.
 */

/** Used when there is no church yet — a fresh install, before the wizard runs. */
const NO_ORG = 'noorg'

/**
 * The prefix for this request's church.
 *
 * Never throws. A rate limiter that fails because it could not work out which
 * church it was for would turn a resolution problem into an outage, and the
 * fallback is a single shared namespace — which is exactly where every key
 * lived before this existed.
 */
export async function orgKeyPrefix(): Promise<string> {
  try {
    return (await currentOrgId()) ?? NO_ORG
  } catch {
    return NO_ORG
  }
}

/** `org:<orgId>:<namespace>:<id>` — one shape, so keys are greppable and scannable. */
export async function orgScopedKey(namespace: string, id: string): Promise<string> {
  return `org:${await orgKeyPrefix()}:${namespace}:${id}`
}
