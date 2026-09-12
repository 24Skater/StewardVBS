// Ensure this file is only used on the server
import 'server-only';
import { PrismaClient } from '@prisma/client';
import { applyOrgScope } from './tenancy';
import { currentOrgId } from './org-resolve';

/**
 * The database client, narrowed to one church.
 *
 * Every query passes through `applyOrgScope`, which scopes reads and stamps
 * writes with the church the request belongs to, and throws when a tenanted
 * model is touched with no church in context. Call sites do not name the
 * church, and cannot forget to.
 *
 * The escape hatch is a different client entirely — `unscopedPrisma`, in
 * `prisma-unscoped.ts` — so that reaching past the guard is a visible import
 * rather than an easily-missed argument.
 */
function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Prisma's per-operation argument union is wider than anything this
          // function touches; this structural view is exactly the keys it reads.
          // `bag` is `args` — mutated in place — so `query(args)` keeps the type
          // Prisma expects while carrying the scoping that was just applied.
          const bag = args as Record<string, unknown>;

          applyOrgScope(model ?? '', operation, bag, await currentOrgId());
          return query(args);
        },
      },
    },
  });
}

type ScopedPrismaClient = ReturnType<typeof createPrismaClient>;

// Avoid creating extra clients during Hot Reload in dev
const globalForPrisma = globalThis as unknown as { prisma?: ScopedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
