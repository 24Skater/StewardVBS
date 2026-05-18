import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { addSecurityHeaders } from '@/lib/security-headers'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/students',
  '/checkin',
  '/attendance',
  '/schedule',
  '/reports',
  '/admin',
]

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  )
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

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

  return addSecurityHeaders(response, nonce)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
