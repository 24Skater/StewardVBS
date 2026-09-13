import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { TENANTED_MODELS } from '../tenancy'

/**
 * Seeds must name the church they write into.
 *
 * Congregation learned this the expensive way. Its seed wrote a tenanted model
 * before any church existed, died partway through, and left an install with no
 * permissions and no recovery account — a failure nothing caught until someone
 * ran a fresh install by hand.
 *
 * This reads the seed sources rather than executing them, so it costs nothing
 * and needs no database. It is crude on purpose: the question is only "has this
 * seed reckoned with tenancy at all", which is exactly the step that was
 * skipped. A seed may obtain its church by creating one (`seedOrg`) or by
 * taking it from a row it already read — `seed.demo.ts` does the latter, from
 * the active event, and refuses to run when there is none.
 */

const SEED_DIR = join(process.cwd(), 'prisma')

function seedFiles(): string[] {
  return readdirSync(SEED_DIR).filter((f) => f.startsWith('seed.') && f.endsWith('.ts'))
}

describe('seeds', () => {
  it('has seeds to check', () => {
    // A rename that emptied this list would make every assertion below pass
    // vacuously.
    expect(seedFiles().length).toBeGreaterThan(0)
  })

  it.each(seedFiles())('%s obtains a church before writing church data', (file) => {
    const source = readFileSync(join(SEED_DIR, file), 'utf-8')

    const writesTenantData = [...TENANTED_MODELS].some((model) =>
      new RegExp(`\.${model}\.(create|createMany|upsert|update|updateMany)`, 'i').test(source)
    )

    if (!writesTenantData) return

    expect(
      source.includes('seedOrg') || source.includes('orgId'),
      `${file} writes church data but never mentions a church. Every tenanted table is ` +
        `NOT NULL on orgId, so this seed will fail on a fresh database. Call seedOrg(), ` +
        `or take the orgId from a row the seed has already read.`
    ).toBe(true)
  })
})
