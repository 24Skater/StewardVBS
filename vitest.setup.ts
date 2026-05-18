import { vi } from 'vitest'

// Mock 'server-only' so lib files can be tested outside Next.js runtime
vi.mock('server-only', () => ({}))

// React.cache is a no-op in tests (not in Next.js runtime)
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: (fn: unknown) => fn }
})
