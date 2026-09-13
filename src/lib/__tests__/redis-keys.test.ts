import { vi, describe, it, expect, beforeEach } from 'vitest'

const { currentOrgId } = vi.hoisted(() => ({ currentOrgId: vi.fn() }))
vi.mock('../org-resolve', () => ({ currentOrgId }))

import { orgKeyPrefix, orgScopedKey } from '../redis-keys'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('namespacing by church', () => {
  it('puts the church in the key', async () => {
    currentOrgId.mockResolvedValue('org-first-baptist')
    expect(await orgScopedKey('rl', '203.0.113.7')).toBe('org:org-first-baptist:rl:203.0.113.7')
  })

  it('keeps two churches apart for the same client', async () => {
    // The actual bug: two churches behind one office network were spending
    // each other's rate-limit budget.
    currentOrgId.mockResolvedValue('org-a')
    const a = await orgScopedKey('rl', '203.0.113.7')
    currentOrgId.mockResolvedValue('org-b')
    const b = await orgScopedKey('rl', '203.0.113.7')

    expect(a).not.toBe(b)
  })

  it('keeps two churches apart for the same person', async () => {
    // One login can serve several churches, so the email is the same in both.
    // Sharing the lockout let an attacker lock somebody out of every church by
    // attacking the sign-in page of one.
    currentOrgId.mockResolvedValue('org-a')
    const a = await orgScopedKey('lockout', 'pastor@example.org')
    currentOrgId.mockResolvedValue('org-b')
    const b = await orgScopedKey('lockout', 'pastor@example.org')

    expect(a).not.toBe(b)
  })

  it('separates namespaces within one church', async () => {
    currentOrgId.mockResolvedValue('org-a')
    expect(await orgScopedKey('rl', 'x')).not.toBe(await orgScopedKey('lockout', 'x'))
  })
})

describe('when there is no church to name', () => {
  it('falls back rather than throwing, before the install is set up', async () => {
    currentOrgId.mockResolvedValue(null)
    expect(await orgKeyPrefix()).toBe('noorg')
  })

  it('falls back rather than throwing when resolution fails', async () => {
    // A rate limiter that failed because it could not work out which church it
    // was for would turn a resolution problem into an outage. The fallback is
    // one shared namespace, which is exactly where every key lived before.
    currentOrgId.mockRejectedValue(new Error('database is down'))
    await expect(orgKeyPrefix()).resolves.toBe('noorg')
  })
})
