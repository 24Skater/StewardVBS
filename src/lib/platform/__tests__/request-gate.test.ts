import { describe, it, expect } from 'vitest'
import { gateFor, isStaticAsset } from '../request-gate'

/**
 * The path table, as a decision table.
 *
 * Table shipped this logic inside a middleware branch and it turned out that
 * `/api/...` never reached the check at all — 88 endpoints writable while
 * revoked. The lesson taken here is not "write the same branch more carefully"
 * but "make the decision a pure function so it can be enumerated".
 */

describe('staff surfaces need a session', () => {
  it.each([
    '/admin',
    '/admin/users',
    '/attendance',
    '/checkin',
    '/dashboard',
    '/reports/students',
    '/schedule',
    '/students',
    '/students/12/parents',
  ])('%s', (path) => {
    expect(gateFor(path).gate).toBe('session-required')
  })
})

describe('paths that must survive everything', () => {
  it.each([
    ['/auth/signin', 'a lapsed church has to sign in to be able to pay'],
    ['/setup', 'runs before any church exists to hold an entitlement'],
    ['/api/setup', 'the same, for the wizard it backs'],
    ['/api/internal/provision', 'the console un-sticking a failed provision'],
    ['/api/health/ready', 'a billing lapse must not take the app out of the load balancer'],
    ['/billing/required', 'gating the page the gate redirects to would loop'],
    ['/_next/static/chunk.js', 'not an application request'],
  ])('%s — %s', (path) => {
    expect(gateFor(path).gate).toBe('bypass')
  })
})

describe('API routes are gated but do not demand a session', () => {
  it.each(['/api/students', '/api/reports/attendance', '/api/upload'])('%s', (path) => {
    expect(gateFor(path).gate).toBe('session-optional')
  })

  it('gates the webhook route too', () => {
    // It authenticates its own caller with a per-church secret, but a revoked
    // church should not be taking registrations.
    expect(gateFor('/api/webhooks/google-forms').gate).toBe('session-optional')
  })
})

describe('public pages', () => {
  it.each(['/', '/about'])('%s is neither gated nor bypassed', (path) => {
    expect(gateFor(path).gate).toBe('none')
  })
})

describe('prefix matching is on a segment boundary', () => {
  it('does not treat /studentsomething as a staff surface', () => {
    expect(gateFor('/studentsomething').gate).not.toBe('session-required')
  })

  it('does not let a future /api/internals inherit the exemption', () => {
    // The dangerous direction: a bare startsWith would hand this straight
    // through the gate.
    expect(gateFor('/api/internals').gate).toBe('session-optional')
  })

  it('does not treat /setups as the wizard', () => {
    expect(gateFor('/setups').gate).toBe('none')
  })
})

describe('static assets', () => {
  it.each(['/favicon.ico', '/logo.svg', '/fonts/x.woff2'])('%s is a file', (path) => {
    expect(isStaticAsset(path)).toBe(true)
  })

  it.each(['/students', '/admin/users'])('%s is not', (path) => {
    expect(isStaticAsset(path)).toBe(false)
  })

  it('never treats an API path as a file, however it is spelled', () => {
    // A route parameter is free to contain a dot. Treating this as static
    // would hand an ungated request straight past the gate.
    expect(isStaticAsset('/api/students/a.b')).toBe(false)
  })
})
