import { describe, it, expect } from 'vitest'
import { applyOrgScope } from '../tenancy'

/**
 * What the guard does to one operation, with no database involved.
 *
 * `applyOrgScope` is pure and mutates its arguments in place, which is exactly
 * what makes the real risk cheap to test: the question is never "does Prisma
 * work" but "did this call end up scoped".
 */

const ORG = 'org-first-baptist'
const OTHER = 'org-second-baptist'

function scope(
  model: string,
  operation: string,
  args: Record<string, unknown> = {},
  orgId: string | null = ORG
) {
  applyOrgScope(model, operation, args, orgId)
  return args
}

describe('reads', () => {
  it('scopes a findMany that asked for everything', () => {
    expect(scope('Student', 'findMany')).toEqual({ where: { orgId: ORG } })
  })

  it('keeps the caller\'s own filters', () => {
    const args = scope('Student', 'findMany', { where: { grade: '3' } })
    expect(args.where).toEqual({ grade: '3', orgId: ORG })
  })

  it('scopes a findUnique, so an id from another church misses', () => {
    // The important case. Ids are sequential integers here, so a student id
    // guessed or pasted from another church would otherwise resolve.
    const args = scope('Student', 'findUnique', { where: { id: 1 } })
    expect(args.where).toEqual({ id: 1, orgId: ORG })
  })

  it.each(['count', 'aggregate', 'groupBy'])('scopes %s', (operation) => {
    expect(scope('Payment', operation)).toEqual({ where: { orgId: ORG } })
  })
})

describe('writes', () => {
  it('stamps a create', () => {
    const args = scope('Student', 'create', { data: { name: 'Ada' } })
    expect(args.data).toEqual({ name: 'Ada', orgId: ORG })
  })

  it('stamps every row of a createMany', () => {
    const args = scope('Student', 'createMany', { data: [{ name: 'Ada' }, { name: 'Grace' }] })
    expect(args.data).toEqual([
      { name: 'Ada', orgId: ORG },
      { name: 'Grace', orgId: ORG },
    ])
  })

  it('scopes the where of an update and stamps nothing else', () => {
    const args = scope('Student', 'update', { where: { id: 1 }, data: { name: 'Ada' } })
    expect(args.where).toEqual({ id: 1, orgId: ORG })
    expect(args.data).toEqual({ name: 'Ada' })
  })

  it('scopes a delete, so one church cannot delete another\'s row', () => {
    const args = scope('Student', 'delete', { where: { id: 1 } })
    expect(args.where).toEqual({ id: 1, orgId: ORG })
  })

  it('scopes the where and stamps the create half of an upsert', () => {
    const args = scope('Student', 'upsert', {
      where: { id: 1 },
      create: { name: 'Ada' },
      update: { name: 'Ada' },
    })
    expect(args.where).toEqual({ id: 1, orgId: ORG })
    expect(args.create).toEqual({ name: 'Ada', orgId: ORG })
  })

  it('refuses a write that names another church', () => {
    expect(() =>
      scope('Student', 'create', { data: { name: 'Ada', orgId: OTHER } })
    ).toThrow(/another church is never right/)
  })

  it('allows a write that names the church it belongs to', () => {
    const args = scope('Student', 'create', { data: { name: 'Ada', orgId: ORG } })
    expect(args.data).toEqual({ name: 'Ada', orgId: ORG })
  })
})

describe('models the guard leaves alone', () => {
  it.each(['User', 'Account', 'Session', 'VerificationToken', 'PasswordResetToken', 'Org'])(
    'passes %s through untouched',
    (model) => {
      expect(scope(model, 'findMany')).toEqual({})
    }
  )

  it('does not need a church in context for a global model', () => {
    expect(() => scope('User', 'findMany', {}, null)).not.toThrow()
  })
})

describe('when nobody has said which church', () => {
  it('throws rather than reading every church at once', () => {
    expect(() => scope('Student', 'findMany', {}, null)).toThrow(/no church in context/)
  })

  it('names the model and the operation, so the stack is not the only clue', () => {
    expect(() => scope('Attendance', 'create', { data: {} }, null)).toThrow(
      /create on Attendance/
    )
  })
})

describe('a model nobody classified', () => {
  it('throws instead of defaulting to unguarded', () => {
    // The failure mode this prevents: a model added next year, never thought
    // about, silently readable across every church.
    expect(() => scope('Sponsorship', 'findMany')).toThrow(/Classify it in lib\/tenancy.ts/)
  })
})
