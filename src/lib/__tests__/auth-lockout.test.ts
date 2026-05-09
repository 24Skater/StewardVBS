import { describe, it, expect } from 'vitest'
import {
  recordLoginAttempt,
  isAccountLocked,
  getLockoutRemaining,
  getRemainingAttempts,
} from '../auth-lockout'

function uniqueEmail() {
  return `test-${Date.now()}-${Math.random()}@example.com`
}

describe('isAccountLocked', () => {
  it('returns false for unknown email', async () => {
    expect(await isAccountLocked('nobody@example.com')).toBe(false)
  })

  it('returns false after fewer than 5 failed attempts', async () => {
    const email = uniqueEmail()
    await recordLoginAttempt(email, false)
    await recordLoginAttempt(email, false)
    await recordLoginAttempt(email, false)
    expect(await isAccountLocked(email)).toBe(false)
  })

  it('returns true after 5 consecutive failed attempts', async () => {
    const email = uniqueEmail()
    for (let i = 0; i < 5; i++) await recordLoginAttempt(email, false)
    expect(await isAccountLocked(email)).toBe(true)
  })

  it('returns false after 4 failures and 1 success', async () => {
    const email = uniqueEmail()
    for (let i = 0; i < 4; i++) await recordLoginAttempt(email, false)
    await recordLoginAttempt(email, true)
    expect(await isAccountLocked(email)).toBe(false)
  })
})

describe('getRemainingAttempts', () => {
  it('returns 5 for fresh email', async () => {
    const email = uniqueEmail()
    expect(await getRemainingAttempts(email)).toBe(5)
  })

  it('decrements on each failure', async () => {
    const email = uniqueEmail()
    await recordLoginAttempt(email, false)
    await recordLoginAttempt(email, false)
    expect(await getRemainingAttempts(email)).toBe(3)
  })

  it('returns 0 when locked', async () => {
    const email = uniqueEmail()
    for (let i = 0; i < 5; i++) await recordLoginAttempt(email, false)
    expect(await getRemainingAttempts(email)).toBe(0)
  })
})

describe('getLockoutRemaining', () => {
  it('returns null when not locked', async () => {
    const email = uniqueEmail()
    expect(await getLockoutRemaining(email)).toBeNull()
  })

  it('returns a positive number of seconds when locked', async () => {
    const email = uniqueEmail()
    for (let i = 0; i < 5; i++) await recordLoginAttempt(email, false)
    const remaining = await getLockoutRemaining(email)
    expect(remaining).not.toBeNull()
    expect(remaining!).toBeGreaterThan(0)
  })
})
