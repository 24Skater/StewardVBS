import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const mockRedis = {
  eval: vi.fn(),
}

vi.mock('../redis', () => ({
  getRedis: () => mockRedis,
}))

import { checkRateLimit } from '../rate-limit'

const opts = { windowMs: 60_000, maxRequests: 10 }

describe('checkRateLimit with Redis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows request when count is under limit', async () => {
    mockRedis.eval.mockResolvedValue([1, 60])
    const result = await checkRateLimit('redis-rl-test', opts)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(9)
    expect(mockRedis.eval).toHaveBeenCalled()
  })

  it('blocks request when count exceeds limit', async () => {
    mockRedis.eval.mockResolvedValue([11, 45])
    const result = await checkRateLimit('redis-rl-test', opts)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBe(45)
  })

  it('uses windowSec as ttl when Redis returns negative ttl', async () => {
    mockRedis.eval.mockResolvedValue([1, -1])
    const result = await checkRateLimit('redis-rl-test', opts)
    expect(result.success).toBe(true)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })
})

describe('checkRateLimit production guard', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production')
    mockRedis.eval.mockRejectedValue(new Error('Redis connection refused'))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws in production when Redis eval fails', async () => {
    await expect(
      checkRateLimit('prod-rl-test', opts)
    ).rejects.toThrow('Redis is required in production')
  })
})

describe('checkRateLimit non-production Redis fallback', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test')
    mockRedis.eval.mockRejectedValue(new Error('Redis unavailable'))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('falls back to in-memory when Redis fails outside production', async () => {
    const id = `fallback-${Date.now()}-${Math.random()}`
    const result = await checkRateLimit(id, opts)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('in-memory fallback blocks when over limit', async () => {
    const id = `fallback-block-${Date.now()}-${Math.random()}`
    for (let i = 0; i < 11; i++) await checkRateLimit(id, opts)
    const result = await checkRateLimit(id, opts)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
