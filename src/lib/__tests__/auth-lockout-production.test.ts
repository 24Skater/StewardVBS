import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Rate-limit and lockout keys are namespaced per church, and resolving a church
// reads the database. These are unit tests, so the church is pinned: left
// unmocked, CI (which has a real Postgres) resolves it for real and a slow or
// empty lookup can hand the write and the read different keys.
vi.mock('../org-resolve', () => ({
  currentOrgId: vi.fn().mockResolvedValue('org-test'),
}))


vi.mock('../redis', () => ({
  getRedis: () => { throw new Error('Redis not available') },
}))

import {
  recordLoginAttempt,
  isAccountLocked,
  getLockoutRemaining,
} from '../auth-lockout'

describe('auth-lockout production guards (Redis unavailable)', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('recordLoginAttempt throws when recording a failure in production without Redis', async () => {
    await expect(recordLoginAttempt('prod-guard@example.com', false)).rejects.toThrow(
      'Account lockout requires Redis in production'
    )
  })

  it('isAccountLocked throws in production without Redis', async () => {
    await expect(isAccountLocked('prod-guard@example.com')).rejects.toThrow(
      'Account lockout check requires Redis in production'
    )
  })

  it('getLockoutRemaining throws in production without Redis', async () => {
    await expect(getLockoutRemaining('prod-guard@example.com')).rejects.toThrow(
      'Account lockout check requires Redis in production'
    )
  })
})
