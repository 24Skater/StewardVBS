import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  recordLoginAttempt,
  isAccountLocked,
  getLockoutRemaining,
} from '../auth-lockout'

describe('auth-lockout production guards (Redis unavailable)', () => {
  let originalNodeEnv: string | undefined

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true })
  })

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, configurable: true, writable: true })
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
