import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { addSecurityHeaders } from '@/lib/security-headers'
import { extractTenantSlug, ORG_SLUG_HEADER } from '@/lib/platform-domain'
import { gateFor } from '@/lib/platform/request-gate'

/**
 * A staff surface needs a session before it renders.
 *
 * The path table lives in lib/platform/request-gate.ts rather than here,
 * because it is also what decides which requests the entitlement layers care
 * about, and two copies of that list would drift. A pure function is also
 * testable without standing up Next.js and a session, which a middleware is
 * not.
 *
 * Matching is on a segment boundary there, so `/studentsomething` is not under
 * `/students` — the version this replaced used a bare `startsWith`.
 */
function isProtectedRoute(pathname: string): boolean {
  return gateFor(pathname).gate === 'session-required'
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute(pathname)) {
    const sessionToken =
      request.cookies.get('authjs.session-token') ||
      request.cookies.get('__Secure-authjs.session-token')
    if (!sessionToken) {
      const signinUrl = new URL('/auth/signin', request.url)
      signinUrl.searchParams.set('callbackUrl', request.url)
      return NextResponse.redirect(signinUrl)
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-request-id', crypto.randomUUID())

  // Which church this request is for, taken from the host it arrived on.
  //
  // Stripped first, then set: a client that sends the header itself must not be
  // able to choose its own church. Only the hostname decides, and the hostname
  // is the one thing the browser cannot forge past the edge.
  //
  // The database lookup that turns this slug into a church id happens in Node,
  // in lib/org-resolve.ts — middleware runs on the Edge runtime, which has no
  // Prisma. A self-hosted install has no root domain, sets no header, and
  // resolves its sole church there instead.
  requestHeaders.delete(ORG_SLUG_HEADER)
  const slug = extractTenantSlug(request.headers.get('host'))
  if (slug) requestHeaders.set(ORG_SLUG_HEADER, slug)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  return addSecurityHeaders(response, nonce)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
