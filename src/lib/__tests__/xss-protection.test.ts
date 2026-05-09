import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  escapeAttribute,
  sanitizeUrl,
  sanitizeHexColor,
} from '../xss-protection'

describe('escapeHtml', () => {
  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes double quote', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quote', () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s")
  })

  it('escapes forward slash', () => {
    expect(escapeHtml('a/b')).toBe('a&#x2F;b')
  })

  it('converts number to string', () => {
    expect(escapeHtml(42)).toBe('42')
  })

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })
})

describe('escapeAttribute', () => {
  it('delegates to escapeHtml', () => {
    expect(escapeAttribute('<"attr">')).toBe('&lt;&quot;attr&quot;&gt;')
  })
})

describe('sanitizeUrl', () => {
  it('returns empty for null', () => {
    expect(sanitizeUrl(null)).toBe('')
  })

  it('returns empty for undefined', () => {
    expect(sanitizeUrl(undefined)).toBe('')
  })

  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
  })

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path')
  })

  it('rejects javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('')
  })

  it('rejects ftp: protocol', () => {
    expect(sanitizeUrl('ftp://example.com')).toBe('')
  })

  it('rejects invalid URL', () => {
    expect(sanitizeUrl('not-a-url')).toBe('')
  })
})

describe('sanitizeHexColor', () => {
  it('returns null for null', () => {
    expect(sanitizeHexColor(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(sanitizeHexColor(undefined)).toBeNull()
  })

  it('accepts valid 6-char hex', () => {
    expect(sanitizeHexColor('#ff0000')).toBe('#FF0000')
  })

  it('uppercases the output', () => {
    expect(sanitizeHexColor('#aabbcc')).toBe('#AABBCC')
  })

  it('rejects 3-char hex', () => {
    expect(sanitizeHexColor('#fff')).toBeNull()
  })

  it('rejects hex without hash', () => {
    expect(sanitizeHexColor('ff0000')).toBeNull()
  })

  it('rejects non-hex characters', () => {
    expect(sanitizeHexColor('#GGHHII')).toBeNull()
  })
})
