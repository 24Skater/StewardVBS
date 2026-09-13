import { describe, it, expect, vi, beforeEach } from 'vitest'

const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/prisma-unscoped', () => ({
  unscopedPrisma: { org: { findUnique, create } },
}))

import { POST } from '@/app/api/internal/provision/route'

const TOKEN = 'stw_svc_vbs_secret'
const ORG = '11111111-2222-4333-8444-555555555555'

function request(body: unknown, authorization: string | null = `Bearer ${TOKEN}`) {
  return new Request('http://localhost/api/internal/provision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { authorization } : {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never
}

const valid = { orgId: ORG, slug: 'first-baptist', organizationName: 'First Baptist' }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PLATFORM_SERVICE_TOKEN = TOKEN
  findUnique.mockResolvedValue(null)
  create.mockResolvedValue({ id: ORG })
})

describe('who may call it', () => {
  it('refuses a request with no token', async () => {
    const res = await POST(request(valid, null))
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('refuses another product’s token', async () => {
    const res = await POST(request(valid, 'Bearer stw_svc_table_secret'))
    expect(res.status).toBe(401)
  })
})

describe('creating a church', () => {
  it('creates it with the console’s own id', async () => {
    // The property the whole platform rests on: one church has one id across
    // every Steward app, and the console mints it.
    const res = await POST(request(valid))
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ state: 'ready', orgId: ORG, created: true })
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: ORG }) })
    )
  })

  it('gives it a settings row immediately', async () => {
    await POST(request(valid))
    const data = create.mock.calls[0][0].data
    expect(data.settings).toEqual({ create: {} })
  })

  it('lowercases the slug', async () => {
    await POST(request({ ...valid, slug: 'First-Baptist' }))
    expect(create.mock.calls[0][0].data.slug).toBe('first-baptist')
  })
})

describe('retrying', () => {
  it('reports ready and changes nothing when the church already exists', async () => {
    // The console retries with backoff, so a second call after a response it
    // never received must not rename a church somebody has since renamed.
    findUnique.mockResolvedValueOnce({ id: ORG, slug: 'renamed-since' })

    const res = await POST(request(valid))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ state: 'ready', created: false })
    expect(create).not.toHaveBeenCalled()
  })
})

describe('refusing what it cannot do', () => {
  it('409s on a slug another church already holds', async () => {
    // A permanent condition, so a 4xx the console will not retry into —
    // burning the retry budget would hide it from the operator.
    findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'someone-else' })

    const res = await POST(request(valid))
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ error: 'slug_taken' })
  })

  it('400s on a slug that is not a legal DNS label', async () => {
    const res = await POST(request({ ...valid, slug: 'not--legal' }))
    expect(res.status).toBe(400)
  })

  it('400s on a non-uuid org id', async () => {
    const res = await POST(request({ ...valid, orgId: 'not-a-uuid' }))
    expect(res.status).toBe(400)
  })

  it('400s on a body that is not JSON', async () => {
    const res = await POST(request('{not json'))
    expect(res.status).toBe(400)
  })
})
