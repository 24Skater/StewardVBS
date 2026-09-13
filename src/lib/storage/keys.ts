import { randomUUID } from 'node:crypto'

/**
 * What an object is called in the bucket, and what the browser is told.
 *
 * Two rules, and the second is the one that matters:
 *
 * 1. **Every key is prefixed with the church.** `<orgId>/<kind>/<file>`. A
 *    shared bucket with unprefixed keys is a shared bucket where one church can
 *    guess another's filenames.
 * 2. **The URL the browser gets does not contain the church.** It is
 *    `/api/files/<kind>/<file>`, and the serving route puts the prefix back
 *    from the church the *request* belongs to. If the orgId were in the URL, a
 *    church could read another's photo by editing it — which is exactly the
 *    hole the plan calls out in StewardPOS's `/uploads/:prefix/:filename`.
 *
 * Filenames are random rather than derived from anything. A student's photo
 * should not be reachable by guessing their name, and a name is not a secret.
 */

export const OBJECT_KINDS = ['students', 'teachers'] as const
export type ObjectKind = (typeof OBJECT_KINDS)[number]

export function isObjectKind(value: string): value is ObjectKind {
  return (OBJECT_KINDS as readonly string[]).includes(value)
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
}

export function extensionFor(contentType: string): string | null {
  return EXTENSIONS[contentType] ?? null
}

/** A fresh, unguessable name for one upload. */
export function newObjectName(contentType: string): string | null {
  const extension = extensionFor(contentType)
  return extension ? `${randomUUID()}.${extension}` : null
}

/** Where the object actually lives: `<orgId>/<kind>/<name>`. */
export function objectKey(orgId: string, kind: ObjectKind, name: string): string {
  return `${orgId}/${kind}/${name}`
}

/** What the browser is given. Deliberately free of the church's id. */
export function publicPath(kind: ObjectKind, name: string): string {
  return `/api/files/${kind}/${name}`
}

/**
 * A single path segment with no traversal in it.
 *
 * The serving route takes the name from the URL and joins it to a key, so a
 * `..` or a `/` reaching that join would let a request climb out of its own
 * church's prefix. Rejecting anything that is not a plain name closes it
 * without needing to reason about encodings.
 */
export function isSafeObjectName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name) && !name.includes('..')
}
