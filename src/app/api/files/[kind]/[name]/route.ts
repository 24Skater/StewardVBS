import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { currentOrgId } from '@/lib/org-resolve'
import { getObject, isStorageConfigured } from '@/lib/storage/objects'
import { isObjectKind, isSafeObjectName, objectKey } from '@/lib/storage/keys'

export const dynamic = 'force-dynamic'

/**
 * GET /api/files/:kind/:name
 *
 * Serves one stored object, and the interesting part is what is *not* in the
 * URL: the church. The prefix is put back from the church the request belongs
 * to, so a church cannot reach another's photo by editing a path. That is the
 * hole the decision record calls out in StewardPOS, whose `/uploads/:prefix/
 * :filename` has no authentication at all - inherited here as a lesson rather
 * than as a bug.
 *
 * Authenticated, because a child's photograph is not public. `requireAuth` also
 * refuses a revoked church, so a lapsed subscription stops serving photos along
 * with everything else.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; name: string }> }
) {
  if (!isStorageConfigured()) {
    // Nothing was ever stored, so nothing can be served. A data-URI install
    // renders images inline and never calls this route at all.
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  await requireAuth()

  const orgId = await currentOrgId()
  if (!orgId) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { kind, name } = await params
  if (!isObjectKind(kind) || !isSafeObjectName(name)) {
    // Not "forbidden": a malformed name names nothing, and saying which of the
    // two it was would answer a question the caller has no business asking.
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const object = await getObject(objectKey(orgId, kind, name))
  if (!object) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return new NextResponse(Buffer.from(object.body), {
    headers: {
      'Content-Type': object.contentType,
      // Private, because this is one church's data behind a session. A shared
      // cache holding it would serve it to whoever asked next.
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': 'inline',
      // The bytes were validated as an image on the way in, but a store can be
      // written to by other means; refusing to sniff means a mislabelled object
      // cannot become a script.
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
