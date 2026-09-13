/**
 * Which models hold a church's data, and which do not.
 *
 * The two sets below must together name every model in the schema. That is not
 * a convention — `__tests__/tenancy.test.ts` reads Prisma's own DMMF and fails
 * if a model is missing from both, so a model added next year cannot quietly
 * default to "unguarded".
 */

/**
 * Models carrying a non-nullable `orgId`. Reads are scoped to the current
 * church and creates are stamped with it, by `lib/prisma.ts`.
 *
 * Note what is absent: there is no parent-scoped category here. Congregation
 * needed one because three of its line-item tables are only ever written as
 * nested `create` blocks, where a query extension never sees them and cannot
 * stamp them. Every child table in this schema — `studentparent`,
 * `studentteacher`, `studentevent`, `studentemergencycontact` — carries its own
 * `orgId` and gets the strong guarantee rather than the inherited one.
 *
 * The guard cannot do all of that on its own. One site does write a
 * `studentevent` nested inside a `student` create (the Google Forms webhook),
 * and it names the `orgId` itself for exactly the reason above. A nested create
 * of a tenanted model must always name it.
 */
export const TENANTED_MODELS = new Set([
  'appsettings',
  'attendance',
  'auditlog',
  'event',
  'invitation',
  'membership',
  'payment',
  'schedulesession',
  'student',
  'studentcategory',
  'studentemergencycontact',
  'studentevent',
  'studentparent',
  'studentteacher',
  'teacher',
])

/**
 * Models that are genuinely not one church's data.
 *
 * `user` is here because one person may volunteer at several churches with one
 * login; the church-shaped half of their identity is `membership`. `account`,
 * `session` and `verificationtoken` are Auth.js's tables, hanging off that
 * global user, and `passwordresettoken` resets a global credential. `org` is
 * the tenant root itself.
 */
export const GLOBAL_MODELS = new Set([
  'account',
  'org',
  'passwordresettoken',
  'session',
  'user',
  'verificationtoken',
])

const READ_OPS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

/** Operations that select existing rows by `where` in order to change them. */
const WHERE_WRITE_OPS = new Set(['update', 'updateMany', 'delete', 'deleteMany'])

type Payload = Record<string, unknown> | undefined

function createPayloads(operation: string, args: Record<string, unknown>): Payload[] {
  if (operation === 'create') return [args.data as Payload]
  if (operation === 'upsert') return [args.create as Payload]
  if (operation === 'createMany') {
    const data = args.data
    return Array.isArray(data) ? (data as Payload[]) : [data as Payload]
  }
  return []
}

/**
 * Narrows one database operation to one church, in place.
 *
 * Reads and targeted writes gain `where.orgId`; created rows are stamped with
 * it. Anything global passes through untouched, and anything nobody classified
 * throws rather than passing through — a model that is new is far more likely
 * to be new church data than a new global.
 *
 * The guard injects rather than demands, which is the same call Congregation
 * made and for the same reason: retrofitting an explicit `orgId` into 163
 * existing database calls means trusting all 163 forever, and a forgotten one
 * is silent. Here, forgetting throws.
 *
 * Separated from the client so it can be tested without a database. Everything
 * it does is decidable from the model name, the operation and the arguments.
 */
export function applyOrgScope(
  model: string,
  operation: string,
  args: Record<string, unknown>,
  orgId: string | null
): void {
  const name = model.toLowerCase()

  if (!TENANTED_MODELS.has(name)) {
    if (!GLOBAL_MODELS.has(name)) {
      throw new Error(
        `[Tenancy] ${model} is in neither TENANTED_MODELS nor GLOBAL_MODELS. ` +
          `Classify it in lib/tenancy.ts.`
      )
    }
    return
  }

  if (!orgId) {
    throw new Error(
      `[Tenancy] ${operation} on ${model} with no church in context. Requests get one from ` +
        `the host they arrived on; background work must use withoutOrgScope() and pass ` +
        `_bypassOrgScope: true, saying why.`
    )
  }

  if (READ_OPS.has(operation) || WHERE_WRITE_OPS.has(operation) || operation === 'upsert') {
    args.where = { ...((args.where as object) ?? {}), orgId }
  }

  for (const payload of createPayloads(operation, args)) {
    if (!payload) continue
    const existing = payload.orgId
    if (existing !== undefined && existing !== orgId) {
      throw new Error(
        `[Tenancy] ${operation} on ${model} carries orgId ${String(existing)} while the request ` +
          `belongs to ${orgId}. Writing into another church is never right.`
      )
    }
    payload.orgId = orgId
  }
}
