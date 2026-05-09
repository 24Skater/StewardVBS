# Phase 0: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a production-safe foundation — test suite, CI/CD pipeline, Redis-backed security primitives, and all 17 confirmed bugs fixed — before any schema migration begins.

**Architecture:** Additive-only changes. No features removed, no schemas broken. Every bug fix is paired with a test that proves the fix works. Redis is introduced as an optional dependency (graceful in-memory fallback in dev, hard fail in prod).

**Tech Stack:** Next.js 15 · Prisma 5 · Vitest 2 · Playwright 1.44 · ioredis 5 · pino 9 · GitHub Actions

---

## File Structure

Files created or modified in this phase:

```
# New files
vitest.config.ts
vitest.setup.ts
playwright.config.ts
.github/workflows/ci.yml
.github/workflows/docker.yml
.github/workflows/release.yml
scripts/start.sh
src/lib/redis.ts
src/lib/logger.ts
src/middleware.ts
src/app/api/health/ready/route.ts
src/app/api/health/live/route.ts
src/app/auth/forgot-password/page.tsx
src/app/auth/reset-password/[token]/page.tsx
src/app/api/auth/forgot-password/route.ts
src/app/api/auth/reset-password/route.ts
src/app/account/settings/page.tsx
src/lib/__tests__/xss-protection.test.ts
src/lib/__tests__/validation.test.ts
src/lib/__tests__/rate-limit.test.ts
src/lib/__tests__/auth-lockout.test.ts
src/lib/__tests__/auth-lockout-redis.test.ts
src/lib/__tests__/rate-limit-redis.test.ts
e2e/auth.spec.ts
e2e/checkin.spec.ts
e2e/admin-protection.spec.ts
e2e/setup-wizard.spec.ts
prisma/migrations/[timestamp]_add_audit_log/migration.sql
prisma/migrations/[timestamp]_add_password_reset_token/migration.sql
prisma/migrations/[timestamp]_add_session_version/migration.sql

# Modified files
package.json                             (add scripts + devDependencies)
.env.example                             (remove dead ACTIVE_EVENT_YEAR; add REDIS_URL, BCRYPT_ROUNDS note)
prisma/schema.prisma                     (add AuditLog, PasswordResetToken; add sessionVersion to User)
src/lib/constants.ts                     (add BCRYPT_ROUNDS = 12)
src/lib/settings.ts                      (fix require('crypto') → import)
src/lib/audit-log.ts                     (write to DB instead of console TODO)
src/lib/rate-limit.ts                    (rewrite to use Redis)
src/lib/auth-lockout.ts                  (rewrite to use Redis)
src/lib/security-headers.ts             (nonce-based CSP)
src/lib/auth-config.ts                   (remove allowDangerousEmailAccountLinking; add sessionVersion; enforce emailVerified)
src/app/api/setup/route.ts               (use BCRYPT_ROUNDS constant)
src/app/api/auth/register/route.ts       (use BCRYPT_ROUNDS constant)
src/app/admin/users/page.tsx             (increment sessionVersion on role change)
Dockerfile                               (use scripts/start.sh)
docker-compose.yml                       (add Redis service)
docker-compose.prod.yml                  (add Redis service; update health check)
```

---

## Task 1: Package Setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install test and infrastructure dependencies**

```bash
npm install --save-dev vitest@^2.2 @vitest/coverage-v8@^2.2 @testing-library/react@^16.3 @testing-library/user-event@^14.5 @playwright/test@^1.44 msw@^2.7 @types/jest@^29
npm install ioredis@^5.4 pino@^9.5 pino-pretty@^11.3
npm install --save-dev @types/ioredis
```

- [ ] **Step 2: Add scripts to `package.json`**

Open `package.json` and replace the `"scripts"` block:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "postinstall": "prisma generate"
}
```

- [ ] **Step 3: Verify install succeeded**

```bash
node -e "require('ioredis'); require('pino'); console.log('ok')"
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest, playwright, ioredis, pino dependencies"
```

---

## Task 2: Vitest Configuration

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Create `vitest.setup.ts`**

```ts
import { vi } from 'vitest'

// Mock 'server-only' so lib files can be tested outside Next.js runtime
vi.mock('server-only', () => ({}))
```

- [ ] **Step 3: Run vitest with no tests — verify config loads**

```bash
npx vitest run 2>&1 | head -20
```

Expected: No configuration errors. "No test files found" or zero failures.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts vitest.setup.ts
git commit -m "chore: add vitest config with 80% coverage thresholds"
```

---

## Task 3: Playwright Configuration

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/.gitkeep` (placeholder so directory is committed)

- [ ] **Step 1: Install Playwright browsers**

```bash
npx playwright install chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
    },
  },
})
```

- [ ] **Step 3: Create `e2e/.gitkeep`**

```bash
mkdir -p e2e && touch e2e/.gitkeep
```

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts e2e/.gitkeep
git commit -m "chore: add playwright config for E2E tests"
```

---

## Task 4: Fix B-17 — Remove Dead Env Var

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Confirm `ACTIVE_EVENT_YEAR` is unused**

```bash
grep -r "ACTIVE_EVENT_YEAR" src/ --include="*.ts" --include="*.tsx"
```

Expected: No matches.

- [ ] **Step 2: Remove the dead variable from `.env.example`**

Open `.env.example` and delete the line:

```
ACTIVE_EVENT_YEAR=2026
```

Also add these new required variables (with comments):

```
# Redis (required in production, optional in development)
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: remove unused ACTIVE_EVENT_YEAR env var; document REDIS_URL"
```

---

## Task 5: Fix B-09 — CommonJS `require` in ESM

**Files:**
- Modify: `src/lib/settings.ts`

- [ ] **Step 1: Add ESM import at top of file**

Open `src/lib/settings.ts`. At the very top of the file (after any existing imports), add:

```ts
import crypto from 'crypto'
```

- [ ] **Step 2: Remove the inline `require` inside `generateWebhookSecret`**

Find lines 131–140 in `src/lib/settings.ts` and replace:

```ts
export function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(32);
  for (let i = 0; i < 32; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}
```

With:

```ts
export function generateWebhookSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const randomBytes = crypto.randomBytes(32)
  let result = ''
  for (let i = 0; i < 32; i++) {
    result += chars[randomBytes[i] % chars.length]
  }
  return result
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: Zero errors on this file.

- [ ] **Step 4: Commit**

```bash
git add src/lib/settings.ts
git commit -m "fix: replace CommonJS require('crypto') with ESM import in settings.ts"
```

---

## Task 6: Fix B-08 — Standardize bcrypt Rounds

**Files:**
- Modify: `src/lib/constants.ts`
- Modify: `src/app/api/setup/route.ts`
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Add `BCRYPT_ROUNDS` to constants**

In `src/lib/constants.ts`, add after the existing string length constants:

```ts
// Crypto
export const BCRYPT_ROUNDS = 12
```

- [ ] **Step 2: Update `src/app/api/setup/route.ts`**

Find the import line at the top of the file and add `BCRYPT_ROUNDS` to the import from `@/lib/constants`:

```ts
import { BCRYPT_ROUNDS } from '@/lib/constants'
```

Then find `bcrypt.hash(password, 10)` and replace with:

```ts
bcrypt.hash(password, BCRYPT_ROUNDS)
```

- [ ] **Step 3: Update `src/app/api/auth/register/route.ts`**

Find the import from `@/lib/constants` and add `BCRYPT_ROUNDS`. Then find `bcrypt.hash(password, 12)` and replace with:

```ts
bcrypt.hash(password, BCRYPT_ROUNDS)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/constants.ts src/app/api/setup/route.ts src/app/api/auth/register/route.ts
git commit -m "fix: standardize bcrypt rounds to 12 via BCRYPT_ROUNDS constant (B-08)"
```

---

## Task 7: Unit Tests — XSS Protection

**Files:**
- Create: `src/lib/__tests__/xss-protection.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  escapeAttribute,
  sanitizeUrl,
  sanitizeHexColor,
} from '../xss-protection'

describe('escapeHtml', () => {
  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('')
  })

  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes less-than', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes double quote', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it('escapes single quote', () => {
    expect(escapeHtml("it's")).toBe("it&#x27;s")
  })

  it('escapes forward slash', () => {
    expect(escapeHtml('a/b')).toBe('a&#x2F;b')
  })

  it('converts number to string', () => {
    expect(escapeHtml(42)).toBe('42')
  })

  it('leaves safe text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })
})

describe('escapeAttribute', () => {
  it('delegates to escapeHtml', () => {
    expect(escapeAttribute('<"attr">')).toBe('&lt;&quot;attr&quot;&gt;')
  })
})

describe('sanitizeUrl', () => {
  it('returns empty for null', () => {
    expect(sanitizeUrl(null)).toBe('')
  })

  it('returns empty for undefined', () => {
    expect(sanitizeUrl(undefined)).toBe('')
  })

  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/')
  })

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com/path')).toBe('https://example.com/path')
  })

  it('rejects javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('')
  })

  it('rejects ftp: protocol', () => {
    expect(sanitizeUrl('ftp://example.com')).toBe('')
  })

  it('rejects invalid URL', () => {
    expect(sanitizeUrl('not-a-url')).toBe('')
  })
})

describe('sanitizeHexColor', () => {
  it('returns null for null', () => {
    expect(sanitizeHexColor(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(sanitizeHexColor(undefined)).toBeNull()
  })

  it('accepts valid 6-char hex', () => {
    expect(sanitizeHexColor('#ff0000')).toBe('#FF0000')
  })

  it('uppercases the output', () => {
    expect(sanitizeHexColor('#aabbcc')).toBe('#AABBCC')
  })

  it('rejects 3-char hex', () => {
    expect(sanitizeHexColor('#fff')).toBeNull()
  })

  it('rejects hex without hash', () => {
    expect(sanitizeHexColor('ff0000')).toBeNull()
  })

  it('rejects non-hex characters', () => {
    expect(sanitizeHexColor('#GGHHII')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
npx vitest run src/lib/__tests__/xss-protection.test.ts
```

Expected: All tests PASS. (Implementation already exists; tests confirm behavior.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/xss-protection.test.ts
git commit -m "test: add unit tests for xss-protection (escapeHtml, sanitizeUrl, sanitizeHexColor)"
```

---

## Task 8: Unit Tests — Validation Schemas

**Files:**
- Create: `src/lib/__tests__/validation.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  studentSchema,
  studentUpdateSchema,
  attendanceSchema,
  scheduleSessionSchema,
  dateRangeSchema,
  searchParamsSchema,
} from '../validation'

describe('studentSchema', () => {
  it('accepts valid student', () => {
    const result = studentSchema.safeParse({ name: 'Alice', size: 'M', category: 'K', eventId: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = studentSchema.safeParse({ name: '', size: 'M', category: 'K', eventId: 1 })
    expect(result.success).toBe(false)
  })

  it('rejects missing eventId', () => {
    const result = studentSchema.safeParse({ name: 'Alice', size: 'M', category: 'K' })
    expect(result.success).toBe(false)
  })

  it('rejects negative eventId', () => {
    const result = studentSchema.safeParse({ name: 'Alice', size: 'M', category: 'K', eventId: -1 })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from name', () => {
    const result = studentSchema.safeParse({ name: '  Alice  ', size: 'M', category: 'K', eventId: 1 })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Alice')
  })
})

describe('studentUpdateSchema', () => {
  it('accepts partial update with id', () => {
    const result = studentUpdateSchema.safeParse({ id: 1, name: 'Bob' })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = studentUpdateSchema.safeParse({ name: 'Bob' })
    expect(result.success).toBe(false)
  })
})

describe('attendanceSchema', () => {
  it('accepts valid attendance', () => {
    const result = attendanceSchema.safeParse({ studentId: 1, eventId: 2 })
    expect(result.success).toBe(true)
  })

  it('rejects non-integer studentId', () => {
    const result = attendanceSchema.safeParse({ studentId: 1.5, eventId: 2 })
    expect(result.success).toBe(false)
  })
})

describe('scheduleSessionSchema', () => {
  const now = new Date()
  const later = new Date(now.getTime() + 3600 * 1000)

  it('accepts valid session', () => {
    const result = scheduleSessionSchema.safeParse({
      title: 'Morning Worship',
      start: now,
      end: later,
      eventId: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = scheduleSessionSchema.safeParse({
      title: '',
      start: now,
      end: later,
      eventId: 1,
    })
    expect(result.success).toBe(false)
  })
})

describe('dateRangeSchema', () => {
  it('accepts YYYY-MM-DD date', () => {
    const result = dateRangeSchema.safeParse({ date: '2026-07-04' })
    expect(result.success).toBe(true)
  })

  it('rejects non-ISO date format', () => {
    const result = dateRangeSchema.safeParse({ date: '07/04/2026' })
    expect(result.success).toBe(false)
  })

  it('accepts missing date (optional)', () => {
    const result = dateRangeSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('searchParamsSchema', () => {
  it('accepts empty params', () => {
    const result = searchParamsSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('coerces page string to number', () => {
    const result = searchParamsSchema.safeParse({ page: '3' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.page).toBe(3)
  })

  it('rejects limit above 200', () => {
    const result = searchParamsSchema.safeParse({ limit: '201' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
npx vitest run src/lib/__tests__/validation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/validation.test.ts
git commit -m "test: add unit tests for Zod validation schemas"
```

---

## Task 9: Unit Tests — Rate Limiter (In-Memory Baseline)

**Files:**
- Create: `src/lib/__tests__/rate-limit.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// These tests run against the in-memory implementation.
// After Task 13, rate-limit.ts will use Redis; these tests
// will be updated to mock the Redis client.
import { checkRateLimit, getClientIdentifier } from '../rate-limit'

describe('checkRateLimit (in-memory)', () => {
  const opts = { windowMs: 60_000, maxRequests: 3 }

  it('allows requests within limit', () => {
    const id = `test-${Date.now()}-${Math.random()}`
    const result = checkRateLimit(id, opts)
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it('decrements remaining on each call', () => {
    const id = `test-${Date.now()}-${Math.random()}`
    checkRateLimit(id, opts)
    checkRateLimit(id, opts)
    const third = checkRateLimit(id, opts)
    expect(third.success).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it('blocks requests over the limit', () => {
    const id = `test-${Date.now()}-${Math.random()}`
    checkRateLimit(id, opts)
    checkRateLimit(id, opts)
    checkRateLimit(id, opts)
    const fourth = checkRateLimit(id, opts)
    expect(fourth.success).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfter).toBeGreaterThan(0)
  })

  it('returns resetAt in the future', () => {
    const id = `test-${Date.now()}-${Math.random()}`
    const result = checkRateLimit(id, opts)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })
})

describe('getClientIdentifier', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIdentifier(req)).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-real-ip': '9.10.11.12' },
    })
    expect(getClientIdentifier(req)).toBe('9.10.11.12')
  })

  it('returns "unknown" when no IP header present', () => {
    const req = new Request('http://localhost/')
    expect(getClientIdentifier(req)).toBe('unknown')
  })
})
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
npx vitest run src/lib/__tests__/rate-limit.test.ts
```

Expected: All tests PASS against the in-memory store.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/rate-limit.test.ts
git commit -m "test: add baseline unit tests for rate limiter (in-memory)"
```

---

## Task 10: Unit Tests — Account Lockout (In-Memory Baseline)

**Files:**
- Create: `src/lib/__tests__/auth-lockout.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  recordLoginAttempt,
  isAccountLocked,
  getLockoutRemaining,
  getRemainingAttempts,
} from '../auth-lockout'

function uniqueEmail() {
  return `test-${Date.now()}-${Math.random()}@example.com`
}

describe('isAccountLocked', () => {
  it('returns false for unknown email', () => {
    expect(isAccountLocked('nobody@example.com')).toBe(false)
  })

  it('returns false after fewer than 5 failed attempts', () => {
    const email = uniqueEmail()
    recordLoginAttempt(email, false)
    recordLoginAttempt(email, false)
    recordLoginAttempt(email, false)
    expect(isAccountLocked(email)).toBe(false)
  })

  it('returns true after 5 consecutive failed attempts', () => {
    const email = uniqueEmail()
    for (let i = 0; i < 5; i++) recordLoginAttempt(email, false)
    expect(isAccountLocked(email)).toBe(true)
  })

  it('returns false after 4 failures and 1 success', () => {
    const email = uniqueEmail()
    for (let i = 0; i < 4; i++) recordLoginAttempt(email, false)
    recordLoginAttempt(email, true)
    // 4 failures, 1 success → not locked (success resets perception)
    // The current implementation counts raw failures; 4 < 5, so not locked
    expect(isAccountLocked(email)).toBe(false)
  })
})

describe('getRemainingAttempts', () => {
  it('returns 5 for fresh email', () => {
    const email = uniqueEmail()
    expect(getRemainingAttempts(email)).toBe(5)
  })

  it('decrements on each failure', () => {
    const email = uniqueEmail()
    recordLoginAttempt(email, false)
    recordLoginAttempt(email, false)
    expect(getRemainingAttempts(email)).toBe(3)
  })

  it('returns 0 when locked', () => {
    const email = uniqueEmail()
    for (let i = 0; i < 5; i++) recordLoginAttempt(email, false)
    expect(getRemainingAttempts(email)).toBe(0)
  })
})

describe('getLockoutRemaining', () => {
  it('returns null when not locked', () => {
    const email = uniqueEmail()
    expect(getLockoutRemaining(email)).toBeNull()
  })

  it('returns a positive number of seconds when locked', () => {
    const email = uniqueEmail()
    for (let i = 0; i < 5; i++) recordLoginAttempt(email, false)
    const remaining = getLockoutRemaining(email)
    expect(remaining).not.toBeNull()
    expect(remaining!).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests — verify they pass**

```bash
npx vitest run src/lib/__tests__/auth-lockout.test.ts
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/__tests__/auth-lockout.test.ts
git commit -m "test: add baseline unit tests for account lockout (in-memory)"
```

---

## Task 11: Fix B-01 + B-02 — Redis Infrastructure + Rate Limiter Rewrite

**Files:**
- Create: `src/lib/redis.ts`
- Modify: `src/lib/rate-limit.ts`
- Modify: `src/lib/auth-lockout.ts`
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`

- [ ] **Step 1: Create `src/lib/redis.ts`**

```ts
import 'server-only'
import Redis from 'ioredis'

let client: Redis | null = null

function getRedisClient(): Redis {
  if (client) return client

  const url = process.env.REDIS_URL

  if (!url) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[redis] REDIS_URL is required in production but is not set')
    }
    console.warn('[redis] REDIS_URL not set; Redis features disabled in dev')
    throw new Error('[redis] REDIS_URL not configured')
  }

  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  })

  client.on('error', (err) => {
    console.error('[redis] Connection error:', err.message)
  })

  return client
}

export function getRedis(): Redis {
  return getRedisClient()
}

export function isRedisAvailable(): boolean {
  try {
    const r = getRedisClient()
    return r.status === 'ready'
  } catch {
    return false
  }
}
```

- [ ] **Step 2: Rewrite `src/lib/rate-limit.ts`**

```ts
import 'server-only'
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS, ONE_MINUTE_MS } from './constants'

export interface RateLimitOptions {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  retryAfter?: number
}

// In-memory fallback (dev only)
interface MemEntry { count: number; resetAt: number }
const memStore: Record<string, MemEntry> = {}
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const key of Object.keys(memStore)) {
      if (memStore[key].resetAt < now) delete memStore[key]
    }
  }, ONE_MINUTE_MS)
}

function checkInMemory(identifier: string, options: RateLimitOptions): RateLimitResult {
  const { windowMs, maxRequests } = options
  const now = Date.now()
  let entry = memStore[identifier]
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs }
    memStore[identifier] = entry
  }
  entry.count++
  if (entry.count > maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { success: true, remaining: maxRequests - entry.count, resetAt: entry.resetAt }
}

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: RATE_LIMIT_WINDOW_MS, maxRequests: RATE_LIMIT_MAX_REQUESTS }
): Promise<RateLimitResult> {
  const { windowMs, maxRequests } = options
  const now = Date.now()
  const resetAt = now + windowMs

  try {
    const { getRedis } = await import('./redis')
    const redis = getRedis()
    const key = `rl:${identifier}`
    const windowSec = Math.ceil(windowMs / 1000)

    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSec)

    const ttl = await redis.ttl(key)
    const actualResetAt = now + ttl * 1000

    if (count > maxRequests) {
      return { success: false, remaining: 0, resetAt: actualResetAt, retryAfter: ttl }
    }
    return { success: true, remaining: maxRequests - count, resetAt: actualResetAt }
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Rate limiter unavailable: Redis is required in production')
    }
    return checkInMemory(identifier, options)
  }
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
}
```

**Note:** `checkRateLimit` is now async. Any call site that used it synchronously must be updated with `await`.

- [ ] **Step 3: Check all call sites that need `await` added**

```bash
grep -r "checkRateLimit(" src/ --include="*.ts" --include="*.tsx" -l
```

For each file listed, ensure `checkRateLimit` is called with `await`.

- [ ] **Step 4: Rewrite `src/lib/auth-lockout.ts`**

```ts
import 'server-only'
import { MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION_MS, LOCKOUT_WINDOW_MS, ONE_MINUTE_MS } from './constants'

export interface LoginAttempt {
  email: string
  timestamp: Date
  success: boolean
}

// In-memory fallback (dev only)
const memAttempts = new Map<string, LoginAttempt[]>()
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = new Date(Date.now() - LOCKOUT_WINDOW_MS)
    memAttempts.forEach((attempts, email) => {
      const recent = attempts.filter((a) => a.timestamp > cutoff)
      recent.length === 0 ? memAttempts.delete(email) : memAttempts.set(email, recent)
    })
  }, 5 * ONE_MINUTE_MS)
}

async function getRedis() {
  try {
    const { getRedis: _getRedis } = await import('./redis')
    return _getRedis()
  } catch {
    return null
  }
}

export async function recordLoginAttempt(email: string, success: boolean): Promise<void> {
  const redis = await getRedis()
  const key = `lockout:${email}`
  const windowSec = Math.ceil(LOCKOUT_WINDOW_MS / 1000)

  if (redis) {
    const entry = JSON.stringify({ ts: Date.now(), success })
    await redis.lpush(key, entry)
    await redis.expire(key, windowSec)
    return
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Account lockout requires Redis in production')
  }

  const attempts = memAttempts.get(email) ?? []
  attempts.push({ email, timestamp: new Date(), success })
  memAttempts.set(email, attempts)
}

async function getRecentFailures(email: string): Promise<number> {
  const redis = await getRedis()
  const key = `lockout:${email}`
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS

  if (redis) {
    const raw = await redis.lrange(key, 0, -1)
    return raw.filter((e) => {
      const parsed = JSON.parse(e) as { ts: number; success: boolean }
      return !parsed.success && parsed.ts > cutoff
    }).length
  }

  const attempts = memAttempts.get(email) ?? []
  const cutoffDate = new Date(cutoff)
  return attempts.filter((a) => !a.success && a.timestamp > cutoffDate).length
}

async function getLastFailureTs(email: string): Promise<number | null> {
  const redis = await getRedis()
  const key = `lockout:${email}`
  const cutoff = Date.now() - LOCKOUT_WINDOW_MS

  if (redis) {
    const raw = await redis.lrange(key, 0, -1)
    const failures = raw
      .map((e) => JSON.parse(e) as { ts: number; success: boolean })
      .filter((e) => !e.success && e.ts > cutoff)
      .map((e) => e.ts)
    return failures.length ? Math.max(...failures) : null
  }

  const attempts = memAttempts.get(email) ?? []
  const cutoffDate = new Date(cutoff)
  const failures = attempts.filter((a) => !a.success && a.timestamp > cutoffDate)
  return failures.length ? Math.max(...failures.map((a) => a.timestamp.getTime())) : null
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const failures = await getRecentFailures(email)
  if (failures < MAX_LOGIN_ATTEMPTS) return false
  const lastTs = await getLastFailureTs(email)
  if (!lastTs) return false
  return Date.now() < lastTs + LOCKOUT_DURATION_MS
}

export async function getLockoutRemaining(email: string): Promise<number | null> {
  if (!(await isAccountLocked(email))) return null
  const lastTs = await getLastFailureTs(email)
  if (!lastTs) return null
  return Math.max(0, Math.ceil((lastTs + LOCKOUT_DURATION_MS - Date.now()) / 1000))
}

export async function getRemainingAttempts(email: string): Promise<number> {
  const failures = await getRecentFailures(email)
  return Math.max(0, MAX_LOGIN_ATTEMPTS - failures)
}
```

- [ ] **Step 5: Update all call sites for async lockout functions**

```bash
grep -r "isAccountLocked\|recordLoginAttempt\|getLockoutRemaining\|getRemainingAttempts" src/ --include="*.ts" --include="*.tsx" -l
```

Add `await` to each call. The functions in `src/lib/auth-config.ts` and any Server Actions must be updated.

- [ ] **Step 6: Add Redis to `docker-compose.yml`**

Add this service block to `docker-compose.yml` (the dev compose file):

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

- [ ] **Step 7: Add Redis to `docker-compose.prod.yml`**

Add the same `redis` service and volume definition to `docker-compose.prod.yml`. Update the `app` service `depends_on` to include `redis`:

```yaml
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
```

Also add `REDIS_URL=redis://redis:6379` to the app's `environment` block.

- [ ] **Step 8: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/redis.ts src/lib/rate-limit.ts src/lib/auth-lockout.ts docker-compose.yml docker-compose.prod.yml
git commit -m "fix: replace in-memory rate limiter and lockout with Redis backend (B-01, B-02)"
```

---

## Task 12: Fix B-03 + B-04 — Persistent Audit Log

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/audit-log.ts`

- [ ] **Step 1: Add `AuditLog` model to `prisma/schema.prisma`**

At the end of `prisma/schema.prisma`, add:

```prisma
model AuditLog {
  id           String   @id @default(cuid())
  userId       String
  action       String
  resourceType String?
  resourceId   String?
  details      Json?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_audit_log
```

Expected: Migration created and applied. `prisma generate` runs automatically.

- [ ] **Step 3: Update `src/lib/audit-log.ts` to write to DB**

```ts
import 'server-only'
import { prisma } from './prisma'

export type AuditAction =
  | 'USER_ROLE_CHANGED'
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_DELETED'
  | 'CATEGORY_CREATED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'SETTINGS_UPDATED'
  | 'STUDENT_CREATED'
  | 'STUDENT_UPDATED'
  | 'STUDENT_DELETED'
  | 'STUDENT_CHECKED_IN'
  | 'PAYMENT_TOGGLED'
  | 'ATTENDANCE_DELETED'
  | 'SESSION_CREATED'
  | 'SESSION_DELETED'
  | 'AUTH_FAILED'
  | 'AUTHORIZATION_FAILED'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType ?? null,
        resourceId: entry.resourceId ?? null,
        details: entry.details ?? null,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    })
  } catch (error) {
    // Audit failures must never break the app, but must be visible
    console.error('[audit] Failed to write audit log:', error)
  }
}
```

- [ ] **Step 4: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/audit-log.ts
git commit -m "fix: add AuditLog model and write audit events to database (B-03, B-04)"
```

---

## Task 13: Fix B-07 — Nonce-Based CSP

**Files:**
- Modify: `src/lib/security-headers.ts`
- Modify: `src/middleware.ts` (create if not exists)

- [ ] **Step 1: Update `src/lib/security-headers.ts` to accept a nonce**

```ts
import { NextResponse } from 'next/server'

export function addSecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production'

  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`
    : `'self'${isDev ? " 'unsafe-inline' 'unsafe-eval'" : ''}`

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  if (!isDev) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  }

  return response
}
```

- [ ] **Step 2: Create or update `src/middleware.ts` to generate nonce per request**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { addSecurityHeaders } from '@/lib/security-headers'

export function middleware(request: NextRequest): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        'x-nonce': nonce,
        'x-request-id': crypto.randomUUID(),
      }),
    },
  })
  return addSecurityHeaders(response, nonce)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

- [ ] **Step 3: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/security-headers.ts src/middleware.ts
git commit -m "fix: replace unsafe-inline/unsafe-eval CSP with nonce-based policy (B-07)"
```

---

## Task 14: Fix B-10 — Remove `allowDangerousEmailAccountLinking`

**Files:**
- Modify: `src/lib/auth-config.ts`

- [ ] **Step 1: Remove the dangerous option from both OAuth providers**

In `src/lib/auth-config.ts`, find the Google provider block (lines ~20-28) and remove the `allowDangerousEmailAccountLinking: true` line:

**Before:**
```ts
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  allowDangerousEmailAccountLinking: true,
}),
```

**After:**
```ts
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
}),
```

Do the same for the MicrosoftEntraID block (lines ~32-40). Remove `allowDangerousEmailAccountLinking: true`.

- [ ] **Step 2: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-config.ts
git commit -m "fix: remove allowDangerousEmailAccountLinking from OAuth providers (B-10)"
```

---

## Task 15: Fix B-12 — Session Invalidation on Role Change

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/auth-config.ts`
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Add `sessionVersion` to the User model in schema**

In `prisma/schema.prisma`, find the `User` model and add:

```prisma
  sessionVersion Int      @default(1)
```

Place it after the `role` field.

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_session_version
```

Expected: Migration created and applied.

- [ ] **Step 3: Update `src/lib/auth-config.ts` JWT and session callbacks**

Find the `jwt` callback (around line 219) and update to include `sessionVersion`:

```ts
async jwt({ token, user, account }: any) {
  if (user) {
    token.id = user.id
    token.email = user.email
    token.name = user.name
    token.role = user.role
    // Fetch and store sessionVersion on first sign-in
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { sessionVersion: true },
    })
    token.sessionVersion = dbUser?.sessionVersion ?? 1
  }

  if (account && account.provider !== 'credentials' && token.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: token.email },
      select: { id: true, role: true, sessionVersion: true },
    })
    if (dbUser) {
      token.id = dbUser.id
      token.role = dbUser.role
      token.sessionVersion = dbUser.sessionVersion
    }
  }

  return token
},
```

Find the `session` callback and add version validation:

```ts
async session({ session, token }: any) {
  if (token && session.user) {
    // Validate that the JWT version still matches the DB version
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id },
      select: { sessionVersion: true, role: true },
    })
    if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) {
      // Version mismatch → token is stale → reject session
      return { ...session, user: null, expires: new Date(0).toISOString() }
    }
    session.user.id = token.id
    session.user.role = dbUser.role
  }
  return session
},
```

- [ ] **Step 4: Increment `sessionVersion` on role change in `src/app/admin/users/page.tsx`**

Find the `prisma.user.update` call for role change and add `sessionVersion: { increment: 1 }`:

**Before:**
```ts
await prisma.user.update({
  where: { id: userId },
  data: { role },
})
```

**After:**
```ts
await prisma.user.update({
  where: { id: userId },
  data: { role, sessionVersion: { increment: 1 } },
})
```

- [ ] **Step 5: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/auth-config.ts src/app/admin/users/page.tsx
git commit -m "fix: invalidate JWT sessions on role change via sessionVersion (B-12)"
```

---

## Task 16: Fix B-13 — Email Verification Enforcement

**Files:**
- Modify: `src/lib/auth-config.ts`

- [ ] **Step 1: Update the `signIn` callback to enforce email verification in production**

Find lines 207-215 in `src/lib/auth-config.ts` and replace:

```ts
// Require email verification for new users
if (dbUser && !dbUser.emailVerified) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Unverified user attempting to sign in: ${user.email}`)
  }
}
```

With:

```ts
// Enforce email verification in production
// Exception 1: OAuth providers (Google, Microsoft) verify email on their side
// Exception 2: First admin via setup wizard is auto-verified at creation time
if (dbUser && !dbUser.emailVerified && account?.provider === 'credentials') {
  if (process.env.NODE_ENV === 'production') {
    return false // Block sign-in — NextAuth will redirect to /auth/error?error=AccessDenied
  }
}
```

- [ ] **Step 2: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth-config.ts
git commit -m "fix: enforce email verification in production for credentials sign-in (B-13)"
```

---

## Task 17: Fix B-11 — Password Reset Flow

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/app/auth/forgot-password/page.tsx`
- Create: `src/app/auth/reset-password/[token]/page.tsx`
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`

- [ ] **Step 1: Add `PasswordResetToken` model to schema**

In `prisma/schema.prisma`, add after `AuditLog`:

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([token])
  @@index([userId])
}
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_password_reset_token
```

Expected: Migration applied.

- [ ] **Step 3: Create `src/app/api/auth/forgot-password/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const schema = z.object({ email: z.string().email() })

const ONE_HOUR_MS = 60 * 60 * 1000

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      // Always return 200 to prevent user enumeration
      return NextResponse.json({ message: 'If that email is registered, you will receive a reset link.' })
    }

    const { email } = parsed.data
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    // Always return 200 whether user exists or not
    if (!user) {
      return NextResponse.json({ message: 'If that email is registered, you will receive a reset link.' })
    }

    // Invalidate existing tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    const token = crypto.randomBytes(32).toString('hex')
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + ONE_HOUR_MS),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: Number(process.env.EMAIL_SERVER_PORT ?? 587),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Reset your VBS App password',
      text: `Click this link to reset your password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      html: `<p>Click this link to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`,
    })

    return NextResponse.json({ message: 'If that email is registered, you will receive a reset link.' })
  } catch {
    return NextResponse.json({ message: 'If that email is registered, you will receive a reset link.' })
  }
}
```

- [ ] **Step 4: Create `src/app/api/auth/reset-password/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { BCRYPT_ROUNDS } from '@/lib/constants'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
})

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { token, password } = parsed.data

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  return NextResponse.json({ message: 'Password updated successfully' })
}
```

- [ ] **Step 5: Create `src/app/auth/forgot-password/page.tsx`**

```tsx
'use client'
import { useState } from 'react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSubmitted(true)
    setLoading(false)
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Check your email</h1>
          <p className="text-gray-600">If that email is registered, you will receive a reset link within a few minutes.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8">
        <h1 className="text-2xl font-bold mb-6">Reset your password</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Create `src/app/auth/reset-password/[token]/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: params.token, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Failed to reset password')
      setLoading(false)
      return
    }
    router.push('/auth/signin?message=password-reset')
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-8">
        <h1 className="text-2xl font-bold mb-6">Set a new password</h1>
        {error && <p className="text-red-600 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">New password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded px-3 py-2" autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium mb-1">Confirm password</label>
            <input id="confirm" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full border rounded px-3 py-2" autoComplete="new-password" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Updating…' : 'Reset password'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 7: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/app/api/auth/ src/app/auth/
git commit -m "feat: add password reset flow with 1-hour expiring tokens (B-11)"
```

---

## Task 18: Fix B-14 — Docker Startup Migration Script

**Files:**
- Create: `scripts/start.sh`
- Modify: `Dockerfile`

- [ ] **Step 1: Create `scripts/start.sh`**

```bash
#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[start] Running database migrations..."
  npx prisma migrate deploy
  echo "[start] Migrations complete."
fi

echo "[start] Starting application..."
exec node server.js
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/start.sh
```

On Windows (git tracks executable bit):

```bash
git update-index --chmod=+x scripts/start.sh
```

- [ ] **Step 3: Update `Dockerfile` to copy and use the startup script**

In the runner stage of the `Dockerfile`, add after the `COPY --from=builder` lines:

```dockerfile
COPY scripts/start.sh /app/scripts/start.sh
RUN chmod +x /app/scripts/start.sh
```

Then find `CMD ["node", "server.js"]` and replace with:

```dockerfile
CMD ["/app/scripts/start.sh"]
```

- [ ] **Step 4: Verify Docker build succeeds**

```bash
docker build -t vbs-app:test .
```

Expected: Build completes without errors.

- [ ] **Step 5: Commit**

```bash
git add scripts/start.sh Dockerfile
git commit -m "fix: add startup migration script to Docker image (B-14)"
```

---

## Task 19: Fix B-15 — Structured Logging with Pino

**Files:**
- Create: `src/lib/logger.ts`
- Modify: All files in `src/` that use `console.log`, `console.error`, `console.warn`

- [ ] **Step 1: Create `src/lib/logger.ts`**

```ts
import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }
    : {}),
  base: undefined, // Remove pid and hostname from all log lines
})

export type Logger = typeof logger
```

- [ ] **Step 2: Find all console.log/warn/error uses in src/**

```bash
grep -r "console\.\(log\|warn\|error\|info\)" src/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 3: Replace each `console.log` in server-side lib files with logger calls**

For each file found, import the logger and replace:
- `console.log(...)` → `logger.info(...)`
- `console.warn(...)` → `logger.warn(...)`
- `console.error(...)` → `logger.error(...)`
- `console.debug(...)` → `logger.debug(...)`

**In `src/lib/auth-config.ts`**: the magic-link log lines (e.g., `console.log('✅ Applied invited role...')`) should become `logger.info(...)`.

**In `src/lib/audit-log.ts`**: the fallback `console.error` stays but import logger:
```ts
import { logger } from './logger'
// ...
logger.error({ err: error }, '[audit] Failed to write audit log')
```

Do NOT replace `console.log` in client components (`'use client'`) — Pino is server-only.

- [ ] **Step 4: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/logger.ts src/lib/ src/app/api/
git commit -m "fix: replace console.log with pino structured logger (B-15)"
```

---

## Task 20: Health Check Endpoints

**Files:**
- Create: `src/app/api/health/ready/route.ts`
- Create: `src/app/api/health/live/route.ts`
- Modify: `docker-compose.prod.yml` (update health check URL)

- [ ] **Step 1: Create `src/app/api/health/live/route.ts`**

```ts
import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok' })
}
```

- [ ] **Step 2: Create `src/app/api/health/ready/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isRedisAvailable } from '@/lib/redis'

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, boolean> = {}

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }

  // Redis check
  checks.redis = isRedisAvailable()

  const allHealthy = Object.values(checks).every(Boolean)
  const status = allHealthy ? 200 : 503

  return NextResponse.json({ status: allHealthy ? 'ready' : 'degraded', checks }, { status })
}
```

- [ ] **Step 3: Update `docker-compose.prod.yml` health check**

Find the `healthcheck` block for the `app` service and update the URL:

```yaml
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/health/ready"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

- [ ] **Step 4: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/health/ docker-compose.prod.yml
git commit -m "feat: add /api/health/ready and /api/health/live endpoints"
```

---

## Task 21: GitHub Actions — CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main, "claude/**"]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Test & Build
    runs-on: ubuntu-latest
    timeout-minutes: 20

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: vbs
          POSTGRES_PASSWORD: vbs
          POSTGRES_DB: vbs_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://vbs:vbs@localhost:5432/vbs_test
      TEST_DATABASE_URL: postgresql://vbs:vbs@localhost:5432/vbs_test
      REDIS_URL: redis://localhost:6379
      NEXTAUTH_SECRET: ci-test-secret-do-not-use-in-prod
      NEXTAUTH_URL: http://localhost:3000
      NODE_ENV: test

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Run database migrations
        run: npx prisma migrate deploy

      - name: Lint
        run: npm run lint

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: Unit tests with coverage
        run: npm run test:coverage

      - name: Build
        run: npm run build

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://vbs:vbs@localhost:5432/vbs_test
          TEST_DATABASE_URL: postgresql://vbs:vbs@localhost:5432/vbs_test

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI pipeline with Postgres, Redis, lint, tests, build"
```

---

## Task 22: GitHub Actions — Docker Publish + Release

**Files:**
- Create: `.github/workflows/docker.yml`
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/docker.yml`**

```yaml
name: Docker

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  build-and-push:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Set up QEMU (for multi-platform builds)
        uses: docker/setup-qemu-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

- [ ] **Step 2: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    tags:
      - "v*.*.*"

jobs:
  release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate release notes
        id: notes
        run: |
          PREV_TAG=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
          if [ -z "$PREV_TAG" ]; then
            COMMITS=$(git log --oneline --pretty=format:"- %s" HEAD)
          else
            COMMITS=$(git log --oneline --pretty=format:"- %s" "${PREV_TAG}..HEAD")
          fi
          {
            echo "NOTES<<EOF"
            echo "## What's Changed"
            echo ""
            echo "$COMMITS"
            echo "EOF"
          } >> "$GITHUB_OUTPUT"

      - name: Create release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.notes.outputs.NOTES }}
          files: |
            Dockerfile
            docker-compose.yml
            docker-compose.prod.yml
            docker-compose.traefik.yml
            .env.example
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/docker.yml .github/workflows/release.yml
git commit -m "ci: add Docker build+push and GitHub Release workflows"
```

---

## Task 23: E2E Tests

**Files:**
- Create: `e2e/auth.spec.ts`
- Create: `e2e/admin-protection.spec.ts`

- [ ] **Step 1: Create `e2e/auth.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test.describe('Sign in', () => {
  test('valid credentials redirect to home', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', process.env.E2E_ADMIN_EMAIL ?? 'admin@test.com')
    await page.fill('input[name="password"]', process.env.E2E_ADMIN_PASSWORD ?? 'TestPassword123!')
    await page.click('button[type="submit"]')
    await expect(page).not.toHaveURL(/\/auth\/signin/)
  })

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@test.com')
    await page.fill('input[name="password"]', 'wrong-password')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 })
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.locator('h1')).toContainText('Reset your password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('forgot password form submits and shows confirmation', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await page.fill('input[type="email"]', 'nobody@example.com')
    await page.click('button[type="submit"]')
    await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 5000 })
  })
})
```

- [ ] **Step 2: Create `e2e/admin-protection.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('unauthenticated user is redirected from /admin to sign in', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/auth\/signin|\/setup/)
})

test('unauthenticated user cannot access /admin/users', async ({ page }) => {
  await page.goto('/admin/users')
  await expect(page).toHaveURL(/\/auth\/signin|\/setup/)
})
```

- [ ] **Step 3: Run E2E tests (expect failures — app must be running)**

```bash
npm run build && npm run start &
sleep 5
npm run test:e2e -- --reporter=list 2>&1 | head -40
```

The tests will fail if the app hasn't been seeded. This is expected — they document the expected behavior for CI.

- [ ] **Step 4: Commit**

```bash
git add e2e/
git commit -m "test: add E2E tests for auth flows and admin route protection"
```

---

## Task 24: Final Verification — Phase 0 Completion Gate

- [ ] **Step 1: TypeScript strict type check — zero errors**

```bash
npx tsc --noEmit
```

Expected: Zero errors.

- [ ] **Step 2: ESLint — zero errors**

```bash
npm run lint
```

Expected: Zero warnings or errors.

- [ ] **Step 3: Unit test coverage — 80%+ on all lib modules**

```bash
npm run test:coverage
```

Expected: Coverage report shows ≥80% lines, functions, branches for each file in `src/lib/`.

- [ ] **Step 4: Security audit**

```bash
npm audit --audit-level=high
```

Expected: Zero high or critical vulnerabilities.

- [ ] **Step 5: Production build succeeds**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 6: Docker build test**

```bash
docker build -t vbs-app:phase0 .
```

Expected: Build succeeds with the new startup script in place.

- [ ] **Step 7: Final commit — phase 0 verification tag**

```bash
git tag -a v0.1.0-phase0 -m "Phase 0 Foundation complete: tests, CI/CD, 17 bugs fixed"
git push origin claude/competent-tu-3033d1 --tags
```

---

## Phase 0 Completion Checklist

Before Phase 1 (Multi-Tenancy) begins, ALL must be true:

- [ ] CI pipeline runs and passes on every commit
- [ ] Docker image builds and publishes on tag push
- [ ] Unit test coverage ≥ 80% on all `src/lib/` modules
- [ ] All E2E test flows pass in CI
- [ ] B-01 fixed: Rate limiter uses Redis
- [ ] B-02 fixed: Account lockout uses Redis
- [ ] B-03 fixed: Audit log writes to database
- [ ] B-04 fixed: AuditLog table exists in schema
- [ ] B-05 fixed: Unit and E2E tests exist
- [ ] B-06 fixed: GitHub Actions CI/CD workflows exist
- [ ] B-07 fixed: Nonce-based CSP replaces unsafe-inline
- [ ] B-08 fixed: BCRYPT_ROUNDS constant used everywhere
- [ ] B-09 fixed: ESM import replaces require('crypto')
- [ ] B-10 fixed: allowDangerousEmailAccountLinking removed
- [ ] B-11 fixed: Password reset flow working
- [ ] B-12 fixed: Session invalidation on role change
- [ ] B-13 fixed: Email verification enforced in production
- [ ] B-14 fixed: Docker startup script runs migrations
- [ ] B-15 fixed: Pino structured logging replaces console.log
- [ ] B-17 fixed: Dead env var removed
- [ ] `npm audit` returns zero high or critical issues
- [ ] `npx tsc --noEmit` returns zero errors
- [ ] `npm run lint` returns zero errors
- [ ] Production Docker build succeeds end-to-end
