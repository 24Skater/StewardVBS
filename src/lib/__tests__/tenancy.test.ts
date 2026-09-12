import { describe, it, expect } from 'vitest'
import { Prisma } from '@prisma/client'
import { TENANTED_MODELS, GLOBAL_MODELS } from '../tenancy'

/**
 * The classification, checked against Prisma's own model list.
 *
 * This is the test that makes `lib/tenancy.ts` trustworthy. Without it the sets
 * are a comment: someone adds a model next year, never thinks about tenancy,
 * and the guard waves it through. With it, an unclassified model fails CI and
 * the person adding it has to decide which kind it is.
 */

const MODEL_NAMES = Prisma.dmmf.datamodel.models.map((m) => m.name.toLowerCase())

describe('model classification', () => {
  it('classifies every model in the schema', () => {
    const unclassified = MODEL_NAMES.filter(
      (name) => !TENANTED_MODELS.has(name) && !GLOBAL_MODELS.has(name)
    )
    expect(unclassified).toEqual([])
  })

  it('classifies no model twice', () => {
    const both = [...TENANTED_MODELS].filter((name) => GLOBAL_MODELS.has(name))
    expect(both).toEqual([])
  })

  it('names no model that has left the schema', () => {
    const known = new Set(MODEL_NAMES)
    const stale = [...TENANTED_MODELS, ...GLOBAL_MODELS].filter((name) => !known.has(name))
    expect(stale).toEqual([])
  })

  it('gives every tenanted model a non-nullable orgId to be scoped by', () => {
    // A model in TENANTED_MODELS without the column would throw on every query
    // the moment the guard tried to scope it. Nullable would be worse: rows
    // could exist belonging to nobody, and a scoped read would silently skip
    // them.
    const wrong: string[] = []

    for (const model of Prisma.dmmf.datamodel.models) {
      if (!TENANTED_MODELS.has(model.name.toLowerCase())) continue
      const orgId = model.fields.find((f) => f.name === 'orgId')
      if (!orgId || !orgId.isRequired) wrong.push(model.name)
    }

    expect(wrong).toEqual([])
  })

  it('keeps a global model free of an orgId that nothing would enforce', () => {
    const wrong = Prisma.dmmf.datamodel.models
      .filter((m) => GLOBAL_MODELS.has(m.name.toLowerCase()) && m.name.toLowerCase() !== 'org')
      .filter((m) => m.fields.some((f) => f.name === 'orgId'))
      .map((m) => m.name)

    expect(wrong).toEqual([])
  })
})

describe('uniqueness that tenancy changes the meaning of', () => {
  function model(name: string) {
    const found = Prisma.dmmf.datamodel.models.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    )
    if (!found) throw new Error(`no model ${name}`)
    return found
  }

  it('scopes a VBS year to its church', () => {
    // `year Int @unique` would mean the second church on the pool could not
    // create a 2026 event at all.
    const event = model('Event')
    expect(event.fields.find((f) => f.name === 'year')?.isUnique).toBe(false)
    expect(event.uniqueFields).toContainEqual(['orgId', 'year'])
  })

  it('scopes an invitation to the church doing the inviting', () => {
    const invitation = model('Invitation')
    expect(invitation.uniqueFields).toContainEqual(['orgId', 'email'])
  })

  it('gives each church exactly one settings row', () => {
    const settings = model('AppSettings')
    expect(settings.fields.find((f) => f.name === 'orgId')?.isUnique).toBe(true)
  })

  it('keeps a login global, so one person can serve two churches', () => {
    const user = model('User')
    expect(user.fields.find((f) => f.name === 'email')?.isUnique).toBe(true)
    expect(user.fields.some((f) => f.name === 'role')).toBe(false)
  })
})
