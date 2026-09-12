import { describe, it, expect, afterEach } from 'vitest'
import { extractTenantSlug, rootDomain, tenantHost, tenantUrl, APP_LABEL } from '../platform-domain'

const ORIGINAL = process.env.PLATFORM_ROOT_DOMAIN

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.PLATFORM_ROOT_DOMAIN
  else process.env.PLATFORM_ROOT_DOMAIN = ORIGINAL
})

function withRoot(value: string | undefined) {
  if (value === undefined) delete process.env.PLATFORM_ROOT_DOMAIN
  else process.env.PLATFORM_ROOT_DOMAIN = value
}

describe('self-hosted', () => {
  it('has no root domain', () => {
    withRoot(undefined)
    expect(rootDomain()).toBeNull()
  })

  it('treats an empty string as unset, not as a root of ""', () => {
    withRoot('   ')
    expect(rootDomain()).toBeNull()
  })

  it('resolves no tenant from any host', () => {
    withRoot(undefined)
    expect(extractTenantSlug(`grace-${APP_LABEL}.app.example.org`)).toBeNull()
  })

  it('offers no tenant host to advertise', () => {
    withRoot(undefined)
    expect(tenantHost('grace')).toBeNull()
    expect(tenantUrl('grace')).toBeNull()
  })
})

describe('on the platform', () => {
  it('builds the host a church is reached on', () => {
    withRoot('example.org')
    expect(tenantHost('grace')).toBe(`grace-${APP_LABEL}.app.example.org`)
    expect(tenantUrl('grace')).toBe(`https://grace-${APP_LABEL}.app.example.org`)
  })

  it('reads the slug back out of that host', () => {
    withRoot('example.org')
    expect(extractTenantSlug(`grace-${APP_LABEL}.app.example.org`)).toBe('grace')
  })

  it('round-trips a slug containing hyphens', () => {
    withRoot('example.org')
    const host = tenantHost('first-baptist')
    expect(extractTenantSlug(host!)).toBe('first-baptist')
  })

  it('ignores the port the browser dialled', () => {
    withRoot('example.org')
    expect(extractTenantSlug(`grace-${APP_LABEL}.app.example.org:3000`)).toBe('grace')
  })

  it('ignores a port on the configured root', () => {
    // The Phase 1 defect, in one assertion. The Host header's port was stripped
    // but the root domain's was not, so a locally-configured root matched no
    // host at all and the platform could not be run on one machine.
    withRoot('localhost:3000')
    expect(extractTenantSlug(`grace-${APP_LABEL}.app.localhost:3000`)).toBe('grace')
  })

  it('ignores case', () => {
    withRoot('example.org')
    expect(extractTenantSlug(`GRACE-${APP_LABEL.toUpperCase()}.APP.EXAMPLE.ORG`)).toBe('grace')
  })
})

describe('hosts that must not resolve', () => {
  it('refuses another Steward app on the same root', () => {
    // The isolation that matters most: Congregation's host must never resolve a
    // church here, or a request meant for one app would be served by another.
    withRoot('example.org')
    expect(extractTenantSlug('grace-stewardchms.app.example.org')).toBeNull()
    expect(extractTenantSlug('grace-stewardtable.app.example.org')).toBeNull()
  })

  it('refuses the console itself', () => {
    withRoot('example.org')
    expect(extractTenantSlug('app.example.org')).toBeNull()
  })

  it('refuses a different root domain', () => {
    withRoot('example.org')
    expect(extractTenantSlug(`grace-${APP_LABEL}.app.evil.test`)).toBeNull()
  })

  it('refuses a lookalike root that merely ends the same way', () => {
    withRoot('example.org')
    expect(extractTenantSlug(`grace-${APP_LABEL}.app.notexample.org`)).toBeNull()
  })

  it('refuses an empty slug', () => {
    withRoot('example.org')
    expect(extractTenantSlug(`-${APP_LABEL}.app.example.org`)).toBeNull()
  })

  it('refuses a slug that is not a legal DNS label', () => {
    withRoot('example.org')
    expect(extractTenantSlug(`-grace-${APP_LABEL}.app.example.org`)).toBeNull()
    expect(extractTenantSlug(`gra_ce-${APP_LABEL}.app.example.org`)).toBeNull()
  })

  it('refuses a missing host', () => {
    withRoot('example.org')
    expect(extractTenantSlug(undefined)).toBeNull()
    expect(extractTenantSlug(null)).toBeNull()
    expect(extractTenantSlug('')).toBeNull()
  })
})
