import { describe, it, expect } from 'vitest'
import { checkRateLimit, getClientIdentifier } from '../rate-limit'

describe('checkRateLimit (in-memory)', () => {
  const opts = { windowMs: 60_000, maxRequests: 3 }

  it('allows requests within limit', async () => {
    const id = `test-${Date.now()}-${Math.random()}`
    const result = await checkRateLimit(id, opts)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('decrements remaining on each call', async () => {
    const id = `test-${Date.now()}-${Math.random()}`
    await checkRateLimit(id, opts)
    await checkRateLimit(id, opts)
    const third = await checkRateLimit(id, opts)
    expect(third.success).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it('blocks requests over the limit', async () => {
    const id = `test-${Date.now()}-${Math.random()}`
    await checkRateLimit(id, opts)
    await checkRateLimit(id, opts)
    await checkRateLimit(id, opts)
    const fourth = await checkRateLimit(id, opts)
    expect(fourth.success).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfter).toBeGreaterThan(0)
  })

  it('returns resetAt in the future', async () => {
    const id = `test-${Date.now()}-${Math.random()}`
    const result = await checkRateLimit(id, opts)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })
})

describe('getClientIdentifier', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIdentifier(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-real-ip': '9.10.11.12' },
    })
    expect(getClientIdentifier(req)).toBe('9.10.11.12')
  })

  it('returns "unknown" when no IP header present', () => {
    const req = new Request('http://localhost/')
    expect(getClientIdentifier(req)).toBe('unknown')
  })
})
