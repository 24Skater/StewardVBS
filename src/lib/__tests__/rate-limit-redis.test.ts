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
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true })
    mockRedis.eval.mockRejectedValue(new Error('Redis connection refused'))
  })

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true, writable: true })
  })

  it('throws in production when Redis eval fails', async () => {
    await expect(
      checkRateLimit('prod-rl-test', opts)
    ).rejects.toThrow('Redis is required in production')
  })
})
