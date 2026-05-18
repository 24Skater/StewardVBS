import { NextResponse } from 'next/server'

export function addSecurityHeaders(response: NextResponse, _nonce?: string): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production'

  // 'unsafe-inline' is required: Next.js App Router prerendered pages include
  // inline __next_f RSC scripts without nonce attributes. A nonce-only
  // script-src blocks those scripts and causes React to render a blank page.
  const scriptSrc = `'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }

  return response
}
