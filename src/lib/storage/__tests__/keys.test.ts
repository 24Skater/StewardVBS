import { describe, it, expect } from 'vitest'
import {
  extensionFor,
  isObjectKind,
  isSafeObjectName,
  newObjectName,
  objectKey,
  publicPath,
} from '../keys'

describe('where an object lives', () => {
  it('prefixes every key with the church', () => {
    expect(objectKey('org-a', 'students', 'x.jpg')).toBe('org-a/students/x.jpg')
  })

  it('keeps two churches apart even for the same filename', () => {
    // A shared bucket with unprefixed keys is a shared bucket where one church
    // can guess another's filenames.
    expect(objectKey('org-a', 'students', 'x.jpg')).not.toBe(
      objectKey('org-b', 'students', 'x.jpg')
    )
  })
})

describe('what the browser is told', () => {
  it('does not put the church in the URL', () => {
    // The serving route puts the prefix back from the church the request
    // belongs to. With the orgId in the URL, a church could read another's
    // photo by editing it.
    const path = publicPath('students', 'x.jpg')
    expect(path).toBe('/api/files/students/x.jpg')
    expect(path).not.toContain('org-')
  })
})

describe('naming an upload', () => {
  it('is unguessable rather than derived from anything', () => {
    // A student's photo should not be reachable by guessing their name.
    const a = newObjectName('image/jpeg')
    const b = newObjectName('image/jpeg')
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[0-9a-f-]{36}\.jpg$/)
  })

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/gif', 'gif'],
    ['image/webp', 'webp'],
  ])('maps %s to .%s', (type, ext) => {
    expect(extensionFor(type)).toBe(ext)
  })

  it('refuses a type it has no extension for', () => {
    expect(newObjectName('image/svg+xml')).toBeNull()
    expect(newObjectName('text/html')).toBeNull()
  })
})

describe('names that must not reach a key', () => {
  it('accepts an ordinary generated name', () => {
    expect(isSafeObjectName('9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f.jpg')).toBe(true)
  })

  it.each([
    ['..', 'bare traversal'],
    ['../secret.jpg', 'climbing out of the church prefix'],
    ['a/../../b.jpg', 'traversal in the middle'],
    ['nested/name.jpg', 'a separator at all'],
    ['.hidden', 'a leading dot'],
    ['', 'empty'],
  ])('refuses %s — %s', (name) => {
    expect(isSafeObjectName(name)).toBe(false)
  })

  it('refuses a name long enough to be doing something else', () => {
    expect(isSafeObjectName('a'.repeat(200))).toBe(false)
  })
})

describe('kinds', () => {
  it.each(['students', 'teachers'])('%s is a kind', (kind) => {
    expect(isObjectKind(kind)).toBe(true)
  })

  it.each(['secrets', '..', 'Students'])('%s is not', (kind) => {
    expect(isObjectKind(kind)).toBe(false)
  })
})
