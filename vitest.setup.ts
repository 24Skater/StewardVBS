import { vi } from 'vitest'

// Mock 'server-only' so lib files can be tested outside Next.js runtime
vi.mock('server-only', () => ({}))
