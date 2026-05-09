import { NextResponse } from 'next/server'

export function addSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production'

  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`
    : `'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ''}`

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
