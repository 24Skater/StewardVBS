import 'server-only'
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, ONE_MINUTE_MS } from './constants'

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

// In-memory fallback (development only — not safe for production or multi-instance)
interface MemEntry { count: number; resetAt: number }
const _memStore: Record<string, MemEntry> = {}
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const key of Object.keys(_memStore)) {
      if (_memStore[key].resetAt < now) delete _memStore[key]
    }
  }, ONE_MINUTE_MS)
}

function _checkInMemory(identifier: string, options: RateLimitOptions): RateLimitResult {
  const { windowMs, maxRequests } = options
  const now = Date.now()
  let entry = _memStore[identifier]
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs }
    _memStore[identifier] = entry
  }
  entry.count++
  if (entry.count > maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }
  return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: RATE_LIMIT_WINDOW_MS, maxRequests: RATE_LIMIT_MAX_REQUESTS }
): Promise<RateLimitResult> {
  const { windowMs, maxRequests } = options
  const now = Date.now()

  try {
    const { getRedis } = await import('./redis')
    const redis = getRedis()
    const key = `rl:${identifier}`
    const windowSec = Math.ceil(windowMs / 1000)

    const luaScript = `
      local count = redis.call('INCR', KEYS[1])
      if count == 1 then
        redis.call('EXPIRE', KEYS[1], ARGV[1])
      end
      local ttl = redis.call('TTL', KEYS[1])
      return {count, ttl}
    `
    const result = await redis.eval(luaScript, 1, key, String(windowSec)) as [number, number]
    const count = result[0]
    const ttl = result[1] > 0 ? result[1] : windowSec
    const actualResetAt = now + ttl * 1000

    if (count > maxRequests) {
      return { success: false, remaining: 0, resetAt: actualResetAt, retryAfter: ttl }
    }
    return { success: true, remaining: maxRequests - count, resetAt: actualResetAt }
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Redis is required in production')
    }
    return _checkInMemory(identifier, options)
  }
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() ?? realIp ?? 'unknown'
}
