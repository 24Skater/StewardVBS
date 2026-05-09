import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockRedis = {
  del: vi.fn().mockResolvedValue(1),
  lpush: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  lrange: vi.fn().mockResolvedValue([]),
}

vi.mock('../redis', () => ({
  getRedis: () => mockRedis,
}))

import {
  recordLoginAttempt,
  isAccountLocked,
  getLockoutRemaining,
  getRemainingAttempts,
} from '../auth-lockout'

function recentFailures(count: number): string[] {
  return Array.from({ length: count }, () =>
    JSON.stringify({ ts: Date.now() - 500, success: false })
  )
}

describe('auth-lockout with Redis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.lrange.mockResolvedValue([])
  })

  describe('recordLoginAttempt', () => {
    it('calls lpush and expire on failure', async () => {
      await recordLoginAttempt('redis-test@example.com', false)
      expect(mockRedis.lpush).toHaveBeenCalledWith(
        'lockout:redis-test@example.com',
        expect.stringContaining('"success":false')
      )
      expect(mockRedis.expire).toHaveBeenCalled()
    })

    it('calls del on successful login', async () => {
      await recordLoginAttempt('redis-test@example.com', true)
      expect(mockRedis.del).toHaveBeenCalledWith('lockout:redis-test@example.com')
      expect(mockRedis.lpush).not.toHaveBeenCalled()
    })
  })

  describe('isAccountLocked with Redis', () => {
    it('returns false when Redis has no failures', async () => {
      expect(await isAccountLocked('redis-test@example.com')).toBe(false)
    })

    it('returns false when Redis has fewer than 5 recent failures', async () => {
      mockRedis.lrange.mockResolvedValue(recentFailures(3))
      expect(await isAccountLocked('redis-test@example.com')).toBe(false)
    })

    it('returns true when Redis has 5 recent failures within window', async () => {
      mockRedis.lrange.mockResolvedValue(recentFailures(5))
      expect(await isAccountLocked('redis-test@example.com')).toBe(true)
    })
  })

  describe('getRemainingAttempts with Redis', () => {
    it('returns full attempts when no failures in Redis', async () => {
      expect(await getRemainingAttempts('redis-test@example.com')).toBe(5)
    })

    it('returns 0 when locked', async () => {
      mockRedis.lrange.mockResolvedValue(recentFailures(5))
      expect(await getRemainingAttempts('redis-test@example.com')).toBe(0)
    })
  })

  describe('getLockoutRemaining with Redis', () => {
    it('returns null when not locked', async () => {
      expect(await getLockoutRemaining('redis-test@example.com')).toBeNull()
    })

    it('returns positive seconds when locked', async () => {
      mockRedis.lrange.mockResolvedValue(recentFailures(5))
      const remaining = await getLockoutRemaining('redis-test@example.com')
      expect(remaining).not.toBeNull()
      expect(remaining!).toBeGreaterThan(0)
    })
  })
})
