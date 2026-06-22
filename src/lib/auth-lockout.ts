import 'server-only'
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS, LOCKOUT_WINDOW_MS, ONE_MINUTE_MS } from './constants'

export interface LoginAttempt {
  email: string
  timestamp: Date
  success: boolean
}

// In-memory fallback (development only)
const _memAttempts = new Map<string, Array<{ ts: number; success: boolean }>>()
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - LOCKOUT_WINDOW_MS
    _memAttempts.forEach((attempts, email) => {
      const recent = attempts.filter((a) => a.ts > cutoff)
      recent.length === 0 ? _memAttempts.delete(email) : _memAttempts.set(email, recent)
    })
  }, 5 * ONE_MINUTE_MS)
}

async function _tryGetRedis() {
  try {
    const { getRedis } = await import('./redis')
    return getRedis()
  } catch {
    return null
  }
}

export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  const redis = await _tryGetRedis()
  const key = `lockout:${email}`

  if (success) {
    if (redis) {
      try {
        await redis.del(key)
        return
      } catch {
        // Redis command failed — fall through to in-memory
      }
    }
    _memAttempts.delete(email)
    return
  }

  // Record failure
  if (!redis && process.env.NODE_ENV === 'production') {
    throw new Error('Account lockout requires Redis in production')
  }

  const windowSec = Math.ceil(LOCKOUT_WINDOW_MS / 1000)
  if (redis) {
    try {
      await redis.lpush(key, JSON.stringify({ ts: Date.now(), success: false }))
      await redis.expire(key, windowSec)
      return
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Account lockout requires Redis in production')
      }
    }
  }

  const existing = _memAttempts.get(email) ?? []
  existing.push({ ts: Date.now(), success: false })
  _memAttempts.set(email, existing)
}

async function _getRecentFailureCount(email: string): Promise<number> {
  const redis = await _tryGetRedis()
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS

  if (!redis && process.env.NODE_ENV === 'production') {
    throw new Error('Account lockout check requires Redis in production')
  }

  if (redis) {
    try {
      const raw = await redis.lrange(`lockout:${email}`, 0, -1)
      return raw.filter((e) => {
        const parsed = JSON.parse(e) as { ts: number; success: boolean }
        return !parsed.success && parsed.ts > cutoff
      }).length
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Account lockout check requires Redis in production')
      }
    }
  }

  return (_memAttempts.get(email) ?? []).filter((a) => !a.success && a.ts > cutoff).length
}

async function _getLastFailureTs(email: string): Promise<number | null> {
  const redis = await _tryGetRedis()
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS

  if (!redis && process.env.NODE_ENV === 'production') {
    throw new Error('Account lockout check requires Redis in production')
  }

  if (redis) {
    try {
      const raw = await redis.lrange(`lockout:${email}`, 0, -1)
      const failureTimes = raw
        .map((e) => JSON.parse(e) as { ts: number; success: boolean })
        .filter((e) => !e.success && e.ts > cutoff)
        .map((e) => e.ts)
      return failureTimes.length ? Math.max(...failureTimes) : null
    } catch {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Account lockout check requires Redis in production')
      }
    }
  }

  const failures = (_memAttempts.get(email) ?? []).filter((a) => !a.success && a.ts > cutoff)
  return failures.length ? Math.max(...failures.map((a) => a.ts)) : null
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const failures = await _getRecentFailureCount(email)
  if (failures < MAX_LOGIN_ATTEMPTS) return false
  const lastTs = await _getLastFailureTs(email)
  if (!lastTs) return false
  return Date.now() < lastTs + LOCKOUT_DURATION_MS
}

export async function getLockoutRemaining(email: string): Promise<number | null> {
  if (!(await isAccountLocked(email))) return null
  const lastTs = await _getLastFailureTs(email)
  if (!lastTs) return null
  return Math.max(0, Math.ceil((lastTs + LOCKOUT_DURATION_MS - Date.now()) / 1000))
}

export async function getRemainingAttempts(email: string): Promise<number> {
  const failures = await _getRecentFailureCount(email)
  return Math.max(0, MAX_LOGIN_ATTEMPTS - failures)
}
