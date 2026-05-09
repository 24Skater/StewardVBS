# VBS App — SaaS + Self-Hosted Dual Product Design

**Date**: 2026-05-08  
**Status**: Approved for Implementation  
**Scope**: Full roadmap from current state to production-ready SaaS + self-hosted open-source product  
**Methodology**: Incremental — Foundation → Multi-tenancy → SaaS Layer → Premium Features  

---

## 1. Current State Baseline (Confirmed Facts from Code Review)

This section records only what was directly observed in the codebase. No assumptions.

### 1.1 What Works

| Area | Status | Key Files |
|---|---|---|
| Credentials auth (email+password) | Working | `src/lib/auth-config.ts`, `src/app/api/auth/register/route.ts` |
| Google OAuth | Working (optional) | `src/lib/auth-config.ts:20-28` |
| Microsoft Entra ID OAuth | Working (optional) | `src/lib/auth-config.ts:29-41` |
| Magic link email | Working | `src/lib/auth-config.ts:79-154` |
| RBAC (ADMIN/STAFF/VIEWER) | Working | `src/lib/auth.ts`, `requireRole()` |
| IDOR protection | Working | `src/lib/resource-access.ts` |
| XSS escaping | Working | `src/lib/xss-protection.ts`, `src/components/SafeText.tsx` |
| Zod input validation | Working | `src/lib/validation.ts` on all API routes |
| Security headers | Working | `src/lib/security-headers.ts` |
| HMAC-SHA256 webhook validation | Working | `src/app/api/webhooks/google-forms/route.ts:60-69` |
| Student management (full CRUD) | Working | `src/app/students/` |
| Attendance check-in | Working | `src/app/checkin/actions.ts` |
| Schedule management | Working | `src/app/schedule/` |
| Reports + export | Working | `src/app/reports/`, `src/app/attendance/export/` |
| Admin panel | Working | `src/app/admin/` |
| First-launch setup wizard | Working | `src/app/setup/`, `src/app/api/setup/route.ts` |
| Docker multi-stage build | Working | `Dockerfile` |
| Docker production compose | Working | `docker-compose.prod.yml`, `docker-compose.traefik.yml` |
| User invitation system | Working | `src/lib/invitations.ts`, `src/app/admin/users/invite/` |
| Base64 image upload | Working (not scalable) | `src/app/api/upload/image/route.ts` |

### 1.2 Confirmed Bugs and Gaps

Every item below was directly verified in source code with file and line reference.

| # | Severity | Description | File:Line |
|---|---|---|---|
| B-01 | CRITICAL | In-memory rate limiter — resets on restart, fails with multiple instances | `src/lib/rate-limit.ts:16` |
| B-02 | CRITICAL | In-memory account lockout — same problem as B-01 | `src/lib/auth-lockout.ts:21` |
| B-03 | CRITICAL | Audit log writes only to console — no persistence | `src/lib/audit-log.ts:45` |
| B-04 | CRITICAL | No AuditLog table in schema — audit data is permanently lost | `prisma/schema.prisma` (absent) |
| B-05 | CRITICAL | Zero tests — no unit, integration, or E2E tests exist | entire `src/` |
| B-06 | CRITICAL | Zero CI/CD — no GitHub Actions workflows | `.github/` (absent) |
| B-07 | HIGH | CSP uses `unsafe-inline` and `unsafe-eval` — weakens XSS protection | `src/lib/security-headers.ts:9-10` |
| B-08 | HIGH | bcrypt rounds inconsistency — register uses 12, setup uses 10 | `src/app/api/setup/route.ts:49` vs `src/app/api/auth/register/route.ts:67` |
| B-09 | HIGH | `require('crypto')` inside ESM context — wrong module system | `src/lib/settings.ts:133` |
| B-10 | HIGH | `allowDangerousEmailAccountLinking: true` on Google and Microsoft — enables account takeover via OAuth | `src/lib/auth-config.ts:25,39` |
| B-11 | HIGH | No password reset flow — users with forgotten passwords cannot recover | roadmap Phase 5.4, not started |
| B-12 | HIGH | No session invalidation on role change — demoted users retain access until JWT expires | `src/app/admin/users/page.tsx:51` |
| B-13 | HIGH | No email verification enforcement — unverified users can sign in | `src/lib/auth-config.ts:207-215` |
| B-14 | MEDIUM | No startup migration script — migrations must be run manually after deploy | `Dockerfile:63` |
| B-15 | MEDIUM | No structured logging — `console.log` throughout, no correlation IDs | all files |
| B-16 | MEDIUM | Base64 images in DB column — not scalable, bloats DB | `prisma/schema.prisma:178` |
| B-17 | LOW | `ACTIVE_EVENT_YEAR` in `.env.example` — not used anywhere in code | `.env.example:14` |

### 1.3 Architecture: Single-Tenant by Design

The current schema has no concept of an organization or tenant:

- `AppSettings` uses a hardcoded singleton `id = "singleton"` (`prisma/schema.prisma:93`)
- `Event`, `Student`, `Teacher`, `Attendance`, `Payment`, `ScheduleSession`, `StudentCategory`, `Invitation` have no `organizationId`
- `User` has no `organizationId`

This is the root constraint that must be resolved before SaaS can work.

---

## 2. Product Model

### 2.1 Deployment Modes

| Mode | Who runs it | Cost to user | Feature set | Multi-tenant |
|---|---|---|---|---|
| Self-hosted | Church IT / tech volunteer | Free | Core features | No — single org per install |
| SaaS hosted | We run it | Subscription via Stripe | Core + Premium | Yes — one database, many orgs |

### 2.2 Feature Tiers

**Core (free in both modes):**
- Student registration and management
- Daily check-in / attendance
- Schedule management
- Basic reports (student list, attendance, schedule, enrollment)
- Google Forms webhook integration
- Role-based access (ADMIN / STAFF / VIEWER)
- Church branding (logo, colors, name)
- User invitation system
- Badge printing

**Pro (SaaS only):**
- Advanced analytics and dashboard charts
- Email notifications (attendance alerts, payment reminders)
- Unlimited active events (core: 1 active event at a time)
- CSV bulk import wizard
- REST API access with API keys
- Priority email support
- Automated backup and restore (managed by us)

**Enterprise (SaaS only):**
- SSO via SAML 2.0 / OIDC
- Audit log viewer and export
- Custom domain (e.g., `vbs.yourchurch.org` pointing to our SaaS)
- SLA
- Planning Center integration
- Dedicated onboarding call

### 2.3 Self-Hosted Compatibility Guarantee

Self-hosted installations continue to work exactly as today — single organization, all core features, no license key required. When `DEPLOYMENT_MODE=self-hosted` is set:

- All core features are unlocked without any plan check
- Premium feature routes return 404 (not 403, to avoid leaking that they exist)
- No Stripe calls are made
- No organization signup UI is shown
- A single default organization is created at first-launch setup

---

## 3. Implementation Phases

---

### Phase 0: Foundation (prerequisite for everything else)

**Gate**: Nothing from Phase 1 onward starts until Phase 0 is complete and passing in CI.

**Rationale**: The schema migration in Phase 1 touches every table. Running it without a test suite and without CI is unsafe. Every bug found after a destructive migration costs 10x what it costs to catch it now.

---

#### 0.1 — CI/CD Pipeline

**Files to create:**

```
.github/
  workflows/
    ci.yml
    docker.yml
    release.yml
```

**`ci.yml`** — Runs on every push and every PR to `main`:
1. `npm ci`
2. `npx prisma generate`
3. `npm run lint` (ESLint)
4. `npx tsc --noEmit` (TypeScript strict check)
5. `npm test` (Vitest unit tests)
6. `npm run build` (Next.js production build)
7. E2E tests against the built app (Playwright)

PR merge to `main` is blocked if any step fails.

**`docker.yml`** — Runs on tag push matching `v*.*.*`:
1. Build multi-platform Docker image (linux/amd64, linux/arm64)
2. Push to GitHub Container Registry (`ghcr.io/[owner]/vbs-app`)
3. Tag with version and `latest`

**`release.yml`** — Runs on tag push matching `v*.*.*`:
1. Generate CHANGELOG from conventional commits since last tag
2. Create GitHub Release with CHANGELOG body
3. Attach Dockerfile and docker-compose files as release assets

**Required secrets** (in GitHub repo settings):
- `GITHUB_TOKEN` — already present, needed for GHCR push

**`package.json` changes:**
- Add `"test": "vitest run"` script
- Add `"test:e2e": "playwright test"` script
- Add `"test:coverage": "vitest run --coverage"` script

---

#### 0.2 — Test Infrastructure

**Dependencies to add:**
```json
{
  "devDependencies": {
    "vitest": "^2.x",
    "@vitest/coverage-v8": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/user-event": "^14.x",
    "@playwright/test": "^1.44.x",
    "msw": "^2.x"
  }
}
```

**Files to create:**

```
vitest.config.ts
vitest.setup.ts
playwright.config.ts
src/
  lib/
    __tests__/
      auth-lockout.test.ts
      rate-limit.test.ts
      validation.test.ts
      resource-access.test.ts
      invitations.test.ts
      pagination.test.ts
      date-utils.test.ts
      xss-protection.test.ts
e2e/
  auth.spec.ts
  checkin.spec.ts
  admin-protection.spec.ts
  setup-wizard.spec.ts
```

**Unit test coverage targets (minimum 80% per module):**

| Module | What to test |
|---|---|
| `src/lib/auth-lockout.ts` | Lock triggers after 5 failures; unlocks after 15 min; window resets on success |
| `src/lib/rate-limit.ts` | Limit enforced after N requests; resets after window; concurrent requests handled |
| `src/lib/validation.ts` | Valid inputs pass; boundary values; invalid inputs return correct Zod errors |
| `src/lib/resource-access.ts` | `verifyStudentAccess` throws on wrong event; passes on correct event |
| `src/lib/invitations.ts` | Expired token rejected; wrong email rejected; used token rejected |
| `src/lib/pagination.ts` | Page calculation correct at boundaries; clamping works |
| `src/lib/xss-protection.ts` | All 6 HTML entities escaped; URL sanitization; color validation |

**E2E test coverage targets:**

| Flow | Scenarios |
|---|---|
| Auth: Sign in | Correct credentials succeed; wrong password fails and increments lockout counter; account locked message shown |
| Auth: Register | Valid registration creates account; weak password rejected; duplicate email rejected |
| Auth: Setup wizard | Redirects to `/setup` on empty DB; creates admin; setup endpoint returns 403 on second call |
| Admin protection | `/admin/*` redirects STAFF and VIEWER to home; ADMIN can access |
| Check-in | STAFF can check in a student; duplicate check-in within same day is idempotent |
| Student management | Create student with valid data; validation errors shown on bad data |

**Playwright config:**
- Base URL: `http://localhost:3000`
- Uses a test PostgreSQL database (separate from dev DB)
- Runs migrations and seeds before test suite
- Cleans up after each test file

---

#### 0.3 — Security Hardening

All 17 bugs from Section 1.2 are addressed here. Ordered by severity.

**B-01 + B-02: Replace in-memory stores with Redis**

Add Redis to the stack:
- Add `ioredis` package
- Create `src/lib/redis.ts` — singleton Redis client with graceful fallback warning if `REDIS_URL` not set
- Rewrite `src/lib/rate-limit.ts` — use Redis `INCR` + `EXPIRE` (sliding window)
- Rewrite `src/lib/auth-lockout.ts` — use Redis sorted sets for attempt tracking
- Add `REDIS_URL=redis://localhost:6379` to `.env.example`
- Add Redis service to `docker-compose.yml` (dev) and `docker-compose.prod.yml` (prod)

Graceful fallback: if Redis is unavailable and `NODE_ENV !== production`, fall back to in-memory with a startup warning. In production, fail fast with a clear error message.

**B-03 + B-04: Persistent Audit Log**

Add `AuditLog` model to `prisma/schema.prisma`:

```prisma
model AuditLog {
  id           String    @id @default(cuid())
  userId       String
  action       String
  resourceType String?
  resourceId   String?
  details      Json?
  ipAddress    String?
  userAgent    String?
  createdAt    DateTime  @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

Update `src/lib/audit-log.ts`:
- Remove the `// TODO` comment
- Write to `prisma.auditLog.create()` in production
- Keep console fallback in development
- Add `organizationId` to the model when Phase 1 runs (tracked as Phase 1 dependency)

**B-05 + B-06:** Covered by sections 0.1 and 0.2.

**B-07: Nonce-based CSP**

Replace `unsafe-inline` and `unsafe-eval` in `src/lib/security-headers.ts`:
- Generate a per-request nonce via `crypto.randomUUID()`
- Set `Content-Security-Policy` with `'nonce-{value}'` for `script-src`
- Pass nonce to Next.js via `headers()` API
- Remove `unsafe-eval` — requires verifying Next.js 15 no longer needs it in production builds (it does not; `unsafe-eval` is only needed in dev mode HMR)
- Keep `unsafe-inline` only in dev, remove in production

**B-08: Standardize bcrypt rounds**

- Add `BCRYPT_ROUNDS = 12` constant to `src/lib/constants.ts`
- Update `src/app/api/setup/route.ts:49` — change `bcrypt.hash(password, 10)` to `bcrypt.hash(password, BCRYPT_ROUNDS)`
- Update `src/app/api/auth/register/route.ts:67` — use `BCRYPT_ROUNDS` constant
- Both files now import from the same constant

**B-09: Fix CommonJS `require` in ESM**

In `src/lib/settings.ts:133`:
- Remove `const crypto = require('crypto')`
- Add `import crypto from 'crypto'` at top of file (it is already available in Node.js)
- The `generateWebhookSecret()` function body stays the same

**B-10: Remove `allowDangerousEmailAccountLinking`**

In `src/lib/auth-config.ts:25` and `:39`:
- Remove `allowDangerousEmailAccountLinking: true` from both Google and Microsoft providers
- This means a user who signs in with OAuth whose email matches an existing password user will get an error instead of silently linking
- Implement a safe account-linking flow: show a UI prompt asking the user to sign in with their original method first, then link from account settings
- Create `src/app/account/settings/page.tsx` with OAuth account linking

**B-11: Password Reset Flow**

Files to create:
- `prisma/schema.prisma` — Add `PasswordResetToken` model:
  ```prisma
  model PasswordResetToken {
    id        String   @id @default(cuid())
    userId    String
    token     String   @unique
    expiresAt DateTime
    usedAt    DateTime?
    createdAt DateTime @default(now())

    @@index([token])
    @@index([userId])
  }
  ```
- `src/app/auth/forgot-password/page.tsx` — Email input form
- `src/app/auth/reset-password/[token]/page.tsx` — New password form
- `src/app/api/auth/forgot-password/route.ts` — Generate token, send email, always return 200 (no user enumeration)
- `src/app/api/auth/reset-password/route.ts` — Validate token (1-hour expiry), hash new password, invalidate all sessions for user, mark token used

**B-12: Session Invalidation on Role Change**

NextAuth v5 uses JWT sessions. To invalidate them on role change:
- Add a `sessionVersion` integer to the `User` model (increments on role/password change)
- Add `sessionVersion` to the JWT payload in `src/lib/auth-config.ts` `jwt` callback
- In the `session` callback, re-fetch `sessionVersion` from DB; if it doesn't match the token, reject the session
- On role change in `src/app/admin/users/page.tsx` — increment `sessionVersion` after `prisma.user.update`

**B-13: Email Verification Enforcement**

In `src/lib/auth-config.ts:207-215`:
- In production (`NODE_ENV === 'production'`): return `false` from `signIn` callback if `!dbUser.emailVerified`
- Add clear error message via NextAuth error page
- Exception: OAuth sign-ins from Google/Microsoft mark email as verified automatically (this is correct, as those providers verify email)
- Exception: The first admin created via setup wizard is auto-verified (this is correct — `emailVerified: new Date()` in `src/app/api/setup/route.ts:57`)

**B-14: Startup Migration Script**

Create `scripts/start.sh`:
```bash
#!/bin/sh
set -e

echo "[start] Running database migrations..."
npx prisma migrate deploy

echo "[start] Starting application..."
exec node server.js
```

Update `Dockerfile:63`:
- Copy `scripts/start.sh` into the runner image
- Change `CMD ["node", "server.js"]` to `CMD ["/app/scripts/start.sh"]`
- Make script executable: `RUN chmod +x /app/scripts/start.sh`

Add env var `RUN_MIGRATIONS=true/false` to allow opting out (for users who manage migrations separately).

**B-15: Structured Logging**

- Add `pino` and `pino-pretty` packages
- Create `src/lib/logger.ts`:
  - JSON output in production
  - Pretty output in development  
  - Log levels: `debug`, `info`, `warn`, `error`
  - Default fields: `timestamp`, `level`, `requestId`
- Create `src/middleware.ts` (or update if exists) to generate a `requestId` per request and attach to headers
- Replace all `console.log` / `console.error` / `console.warn` calls throughout `src/` with the logger
- Audit `console.log` calls in `src/lib/auth-config.ts` (many magic-link debug logs) — convert to `logger.debug` in production, `logger.info` in development

**B-16: Image Storage**

Do NOT migrate this in Phase 0. Base64 in DB works and changing it requires object storage infrastructure. Track as a Phase 3 task when the SaaS infrastructure is built (S3 or Cloudflare R2). Self-hosted users would need to configure storage — design that carefully.

**B-17: Remove dead env var**

- Remove `ACTIVE_EVENT_YEAR=2026` from `.env.example` — it is not used in any source file
- If there is intent to use it, add an issue to track. Do not add code that reads it without a clear use case.

---

#### 0.4 — Health Checks

Expand `src/app/api/health/route.ts`:
- `/api/health` — unchanged (basic DB ping)
- Create `/api/health/ready/route.ts` — checks DB connection AND Redis connection AND that at least one migration has been applied
- Create `/api/health/live/route.ts` — lightweight (returns 200 immediately, no DB call)

Update `docker-compose.prod.yml` health check to use `/api/health/ready`.

---

#### 0.5 — Phase 0 Completion Gate

Before Phase 1 starts, ALL of the following must be true:

- [ ] CI pipeline runs and passes on every commit
- [ ] Docker image builds and publishes on tag
- [ ] Unit test coverage ≥ 80% on all `src/lib/` modules
- [ ] All E2E test flows pass
- [ ] All 17 bugs from Section 1.2 are fixed and verified
- [ ] `npm audit` returns zero high or critical vulnerabilities
- [ ] `npx tsc --noEmit` returns zero errors
- [ ] `npm run lint` returns zero errors
- [ ] Production Docker build succeeds with startup migration script

---

### Phase 1: Multi-Tenancy Schema Migration

**Gate**: Phase 0 completion gate must be fully satisfied.

**Rationale**: This migration touches every table. It must run with CI watching it and tests verifying every query.

---

#### 1.1 — Organization Model

Add to `prisma/schema.prisma`:

```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  plan        Plan     @default(FREE)
  isActive    Boolean  @default(true)
  
  // Stripe (populated after Phase 3)
  stripeCustomerId     String? @unique
  stripeSubscriptionId String? @unique
  stripePriceId        String?
  stripeCurrentPeriodEnd DateTime?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users             User[]
  events            Event[]
  teachers          Teacher[]
  invitations       Invitation[]
  appSettings       AppSettings?
  auditLogs         AuditLog[]

  @@index([slug])
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}
```

---

#### 1.2 — Add `organizationId` to All Models

Every model listed below gets:
```prisma
organizationId String
organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
```
Plus a `@@index([organizationId])`.

**Models to update:**
- `User`
- `Event`
- `Student`
- `StudentParent` (via Student cascade — but index for queries)
- `StudentEmergencyContact` (via Student cascade)
- `Teacher`
- `StudentTeacher` (via Student and Teacher cascade)
- `Attendance` (via Student and Event cascade)
- `Payment` (via Student and Event cascade)
- `ScheduleSession` (via Event cascade)
- `StudentCategory` (via Event cascade)
- `Invitation`
- `AuditLog`

**`AppSettings` model change:**
- Remove `id String @id @default("singleton")` hardcoded pattern
- Change to `id String @id @default(cuid())`
- Add `organizationId String @unique` — one settings record per org
- Remove the `"singleton"` string from `src/lib/settings.ts` — replace with org-scoped lookup

---

#### 1.3 — Migration Strategy

This is a destructive migration on a live system. The procedure is:

**Step 1 — Additive migration only (non-breaking):**
Write a Prisma migration that:
1. Creates the `Organization` table
2. Adds `organizationId` as `String?` (nullable, no FK constraint yet) to all tables
3. Creates an index on `organizationId` for all tables

At this point, the app still runs. The column exists but is empty.

**Step 2 — Backfill script:**
Write `scripts/backfill-org.ts`:
1. Create one `Organization` record with `id = "default-org"`, `slug = "default"`, `name = "Default Organization"`, `plan = FREE`
2. Update all rows in all tables to set `organizationId = "default-org"` using `prisma.model.updateMany()`
3. Log progress and row counts
4. This script is idempotent — safe to run multiple times

**Step 3 — Constraint migration (breaking if run before backfill):**
Write a second Prisma migration that:
1. Adds NOT NULL constraint and FK relationship to all `organizationId` columns
2. Drops the nullable status

**Step 4 — Update `AppSettings` singleton:**
1. Create one `AppSettings` record linked to the default org
2. Remove the `"singleton"` lookup from `src/lib/settings.ts`
3. Replace with org-scoped lookup: `prisma.appSettings.findUnique({ where: { organizationId } })`

---

#### 1.4 — Application Code Updates

Every Prisma query in the application must include `organizationId` in the WHERE clause.

**Middleware: Tenant resolution**

Create `src/middleware.ts`:
- Runs on every request matching `/(admin|students|checkin|attendance|schedule|reports|dashboard|api)(.*)`
- Reads session JWT to get `organizationId`
- Injects `organizationId` into request headers for use in Server Components and API routes
- Redirects unauthenticated requests to sign-in

Create `src/lib/tenant.ts`:
```typescript
export async function getOrganizationId(): Promise<string>
```
- Reads `organizationId` from the session
- Throws `UnauthorizedError` if not present
- Used at the top of every Server Action and API route

**Query update pattern:**

Every existing query like:
```typescript
prisma.student.findMany({ where: { eventId: event.id } })
```

Becomes:
```typescript
const orgId = await getOrganizationId();
prisma.student.findMany({ where: { eventId: event.id, organizationId: orgId } })
```

Files that contain Prisma queries (all must be updated):
- `src/app/students/page.tsx`
- `src/app/students/[id]/page.tsx`
- `src/app/students/[id]/actions.ts`
- `src/app/students/new/page.tsx`
- `src/app/checkin/page.tsx`
- `src/app/checkin/actions.ts`
- `src/app/attendance/page.tsx`
- `src/app/attendance/actions.ts`
- `src/app/attendance/export/route.ts`
- `src/app/schedule/page.tsx`
- `src/app/schedule/actions.ts`
- `src/app/schedule/export/route.ts`
- `src/app/reports/` (all report pages)
- `src/app/admin/` (all admin pages and actions)
- `src/app/api/` (all API routes)
- `src/lib/settings.ts`
- `src/lib/event.ts`
- `src/lib/categories.ts`
- `src/lib/invitations.ts`
- `src/lib/resource-access.ts`

---

#### 1.5 — Self-Hosted Compatibility

When `DEPLOYMENT_MODE=self-hosted`:
- First-launch setup wizard creates the default org automatically
- `getOrganizationId()` returns the single org's ID without needing it in the session
- No multi-org UI is rendered
- No org switcher in navigation
- Admin panel does not show organization management

When `DEPLOYMENT_MODE=saas` (or env var absent):
- `getOrganizationId()` reads from session
- Org switcher is available if user belongs to multiple orgs (for our internal admin)
- Org provisioning flow is active

Add `DEPLOYMENT_MODE=self-hosted` to `.env.example`.

---

#### 1.6 — Phase 1 Completion Gate

- [ ] All existing tests still pass after migration
- [ ] New tests written for all `organizationId`-scoped queries
- [ ] A user from Org A cannot read or write data belonging to Org B (E2E test)
- [ ] Self-hosted mode works identically to pre-migration behavior
- [ ] `prisma migrate deploy` succeeds on a fresh database
- [ ] Backfill script is idempotent and documented

---

### Phase 2: Entitlement System

**Gate**: Phase 1 completion gate.

---

#### 2.1 — Feature Registry

Create `src/lib/features.ts`:

```typescript
export enum Feature {
  // Core — available to all plans and self-hosted
  STUDENT_MANAGEMENT   = 'student_management',
  ATTENDANCE           = 'attendance',
  CHECK_IN             = 'check_in',
  BASIC_REPORTS        = 'basic_reports',
  GOOGLE_FORMS         = 'google_forms',
  BRANDING             = 'branding',
  USER_INVITATIONS     = 'user_invitations',
  BADGE_PRINTING       = 'badge_printing',
  SCHEDULE_MANAGEMENT  = 'schedule_management',

  // Pro — SaaS only
  ADVANCED_ANALYTICS   = 'advanced_analytics',
  EMAIL_NOTIFICATIONS  = 'email_notifications',
  UNLIMITED_EVENTS     = 'unlimited_events',
  CSV_BULK_IMPORT      = 'csv_bulk_import',
  API_ACCESS           = 'api_access',

  // Enterprise — SaaS only
  SSO                  = 'sso',
  AUDIT_LOG_EXPORT     = 'audit_log_export',
  CUSTOM_DOMAIN        = 'custom_domain',
  PLANNING_CENTER      = 'planning_center',
}

export const PLAN_FEATURES: Record<Plan, Set<Feature>> = {
  FREE: new Set([
    Feature.STUDENT_MANAGEMENT,
    Feature.ATTENDANCE,
    Feature.CHECK_IN,
    Feature.BASIC_REPORTS,
    Feature.GOOGLE_FORMS,
    Feature.BRANDING,
    Feature.USER_INVITATIONS,
    Feature.BADGE_PRINTING,
    Feature.SCHEDULE_MANAGEMENT,
  ]),
  PRO: new Set([
    // all FREE features plus:
    Feature.ADVANCED_ANALYTICS,
    Feature.EMAIL_NOTIFICATIONS,
    Feature.UNLIMITED_EVENTS,
    Feature.CSV_BULK_IMPORT,
    Feature.API_ACCESS,
  ]),
  ENTERPRISE: new Set([
    // all PRO features plus:
    Feature.SSO,
    Feature.AUDIT_LOG_EXPORT,
    Feature.CUSTOM_DOMAIN,
    Feature.PLANNING_CENTER,
  ]),
};
```

---

#### 2.2 — Feature Check Utility

Create `src/lib/entitlements.ts`:

```typescript
export async function hasFeature(
  organizationId: string,
  feature: Feature
): Promise<boolean>
```

Logic:
1. If `DEPLOYMENT_MODE=self-hosted` → return `true` for all core features, return `false` for all SaaS-only features (they simply don't exist in self-hosted)
2. Otherwise, fetch org `plan` from DB (cache with Redis, 60-second TTL)
3. Check `PLAN_FEATURES[plan].has(feature)`

Create `src/lib/require-feature.ts`:
```typescript
export async function requireFeature(
  organizationId: string,
  feature: Feature
): Promise<void>
// Throws ForbiddenError with upgrade prompt if feature not available
```

---

#### 2.3 — Enforcement Points

Every premium feature route or action calls `requireFeature` before executing:

```typescript
// Example: Advanced analytics page
export default async function AnalyticsPage() {
  const { organizationId } = await requireAuth();
  await requireFeature(organizationId, Feature.ADVANCED_ANALYTICS);
  // ... rest of page
}
```

UI: Premium feature links in navigation show a lock icon and upgrade prompt instead of 404 when the feature is not available.

---

#### 2.4 — Active Event Limit (Core vs. Pro)

Core plan: maximum 1 active event at a time.
Pro plan: unlimited active events.

Enforce in `src/app/admin/events/[id]/page.tsx` (activate event action):
- Check `hasFeature(orgId, Feature.UNLIMITED_EVENTS)`
- If false and org already has 1 active event, return error with upgrade prompt

---

### Phase 3: SaaS Public Layer

**Gate**: Phase 2 completion gate.

---

#### 3.1 — Public Signup Flow

**New pages:**
- `/signup` — Public, no auth required
  - Fields: Church name, Admin full name, Admin email, Password
  - Zod validation matching existing password policy (8+ chars, uppercase, lowercase, number)
  - Creates: `Organization`, `User` (role=ADMIN), `AppSettings` (defaults), sends verification email
  - On success: redirect to `/auth/verify` with instructions to check email

**New API route:**
- `src/app/api/public/signup/route.ts` (POST)
  - Rate limited: 3 signups per IP per hour (Redis-backed)
  - Creates org atomically with Prisma transaction
  - Creates Stripe customer immediately (no subscription yet — starts free trial)
  - Sends welcome email
  - Returns `{ organizationId, userId }` on success

**New pages:**
- `/pricing` — Static page showing plan comparison table, links to `/signup`
- `/` — Marketing landing page (replaces current app landing page when `DEPLOYMENT_MODE=saas`)

---

#### 3.2 — Stripe Integration

**Dependencies:**
- Add `stripe` package (server-side)
- Add `@stripe/stripe-js` package (client-side, for redirect to Checkout)

**Environment variables to add to `.env.example`:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

**New fields on `Organization` model** (already listed in 1.1):
- `stripeCustomerId`
- `stripeSubscriptionId`
- `stripePriceId`
- `stripeCurrentPeriodEnd`

**New files:**
- `src/lib/stripe.ts` — Singleton Stripe client
- `src/app/api/webhooks/stripe/route.ts` — Webhook handler
  - Verify signature using `stripe.webhooks.constructEvent()` with raw body
  - Handle events:
    - `checkout.session.completed` → activate subscription, update org plan
    - `customer.subscription.updated` → update plan, update `stripeCurrentPeriodEnd`
    - `customer.subscription.deleted` → downgrade org to FREE plan
    - `invoice.payment_failed` → send payment failure email, flag org

**Billing portal:**
- `src/app/dashboard/billing/page.tsx` — Shows current plan, next renewal date, usage
- Upgrade button → redirects to Stripe Checkout (hosted payment page)
- Manage billing button → redirects to Stripe Customer Portal (cancel, update card, invoices)
- `src/app/api/billing/create-checkout/route.ts` — Creates Stripe Checkout session
- `src/app/api/billing/create-portal/route.ts` — Creates Stripe Customer Portal session

**Free trial:**
- New orgs get 14-day trial of PRO plan (controlled by Stripe trial period)
- After trial: downgrades to FREE unless subscription started
- Trial banner shown in app during trial period

---

#### 3.3 — SaaS Admin Panel (Internal)

A separate internal dashboard for us to manage all organizations:
- Route: `/internal/admin/*` — protected by a separate `INTERNAL_ADMIN_SECRET` env var or a special user flag
- View all organizations, their plans, user counts, last activity
- Manually change a plan (for support or comps)
- Impersonate an org (for debugging support tickets)
- View system-wide metrics

This is not part of the org-level admin panel. It is entirely separate.

---

#### 3.4 — Phase 3 Completion Gate

- [ ] New org signup flow creates org, user, Stripe customer in one transaction
- [ ] Stripe webhook correctly updates org plan on subscription events
- [ ] Plan downgrade disables premium feature access immediately
- [ ] Free trial works end-to-end
- [ ] Billing portal accessible and functional
- [ ] Self-hosted mode: Stripe env vars absent → no Stripe calls made → no errors
- [ ] E2E tests cover signup → trial → upgrade → downgrade flows

---

### Phase 4: Premium Features

**Gate**: Phase 3 completion gate.

Each feature is gated behind `requireFeature()`. Build in this order (highest value first):

#### 4.1 — CSV Bulk Import (Pro)

- `src/app/admin/students/import/page.tsx` — Multi-step wizard
- Step 1: Upload CSV file (validate MIME type, max 10MB)
- Step 2: Column mapping UI (map CSV columns to student fields)
- Step 3: Preview with validation errors highlighted per row
- Step 4: Import with progress indicator (streaming response or polling)
- Handles duplicates: skip, update, or error (user's choice)
- Download error report for failed rows

#### 4.2 — Email Notifications (Pro)

- Add `resend` package (Resend API — simpler than raw SMTP for transactional email)
- Add `RESEND_API_KEY` to `.env.example`
- Notification types:
  - Daily attendance summary (sent to admins after check-in closes)
  - Payment reminder (configurable days before event)
  - Welcome email to new students' parents
- Notification preferences configurable per org in admin settings

#### 4.3 — Advanced Analytics (Pro)

- Expand `src/app/dashboard/page.tsx` with charts gated behind `Feature.ADVANCED_ANALYTICS`
- Add `recharts` or `chart.js` for visualization
- Charts: attendance trends over days, category distribution, payment completion rate, teacher-to-student ratio

#### 4.4 — REST API Access (Pro)

- API key model in schema: `ApiKey { id, organizationId, key (hashed), label, lastUsedAt, expiresAt }`
- `src/app/api/v1/` — REST API routes
- Auth: `Authorization: Bearer <api-key>` header
- Endpoints: GET students, GET attendance, POST check-in
- Rate limited per API key (Redis): 1000 requests/hour for PRO, 10000 for ENTERPRISE
- API key management UI in admin settings

#### 4.5 — SSO (Enterprise)

- Use `next-auth` with a custom SAML provider or `@boxyhq/saml-jackson`
- Allow orgs to configure their identity provider URL and certificate
- `SsoConfig` model in schema: `{ organizationId, providerUrl, certificate, ... }`
- Admin UI to configure SSO settings (Enterprise plan only)

#### 4.6 — Audit Log Viewer (Enterprise)

- `src/app/admin/audit/page.tsx` — View audit log with filters
- Filter by: action, user, date range, resource type
- Export to CSV (time-range bounded, max 10,000 rows)
- Gated behind `Feature.AUDIT_LOG_EXPORT`

---

### Phase 5: Image Storage Migration

**Gate**: Phase 3 (SaaS infrastructure available).

Move from base64-in-DB to object storage:

**Self-hosted option:**
- Local filesystem storage via `src/lib/storage.ts` abstraction
- Files stored in a configurable `UPLOAD_DIR` path
- Backward compatible: existing base64 values continue to work, new uploads go to filesystem

**SaaS option:**
- Cloudflare R2 (S3-compatible, no egress fees)
- Add `@aws-sdk/client-s3` (R2 is S3-compatible)
- Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` to `.env.example`
- Pre-signed URLs for direct upload from browser (no server memory pressure)
- Images served via Cloudflare CDN

**Migration:**
- Write a one-time migration script that reads all base64 values from DB, uploads to storage, updates the URL column, and nulls the base64 column
- Run after deploying the new storage code

---

## 4. Security Architecture

### 4.1 Defense in Depth

| Layer | Control | Status after Phase 0 |
|---|---|---|
| Network | HTTPS only via Traefik + Let's Encrypt | Existing |
| Network | Cloudflare Tunnel option (no exposed ports) | Documented |
| Application | RBAC on every route and action | Existing |
| Application | IDOR protection on every resource | Existing |
| Application | Zod validation on all inputs | Existing |
| Application | Nonce-based CSP | Fixed in Phase 0 |
| Application | HMAC-SHA256 webhook validation | Existing |
| Application | Redis-backed rate limiting | Fixed in Phase 0 |
| Application | Redis-backed account lockout | Fixed in Phase 0 |
| Application | Persistent audit log | Fixed in Phase 0 |
| Application | Email verification enforcement | Fixed in Phase 0 |
| Application | Session invalidation on role change | Fixed in Phase 0 |
| Application | Password reset with expiring tokens | Fixed in Phase 0 |
| Application | Standardized bcrypt rounds (12) | Fixed in Phase 0 |
| Application | No dangerous OAuth account linking | Fixed in Phase 0 |
| Data | Parameterized queries via Prisma | Existing |
| Data | XSS escaping on all output | Existing |
| Data | organizationId tenant isolation | Phase 1 |
| Data | Stripe webhook signature verification | Phase 3 |
| Secrets | All secrets via env vars | Existing |
| Secrets | No secrets in source code or git | Verified |
| Monitoring | Structured logging with request IDs | Phase 0 |
| Monitoring | Health check endpoints (live + ready) | Phase 0 |

### 4.2 Data Privacy

- Tenant data is isolated by `organizationId` on every query — a query without `organizationId` in WHERE cannot be written without explicitly bypassing `getOrganizationId()`
- Medical notes and allergy fields (`Student.allergies`, `Student.medicalNotes`) are sensitive — do not include in API responses unless explicitly requested
- Parent and emergency contact data is PII — audit log must record access to these fields
- Stripe stores payment data — we never store raw card numbers

### 4.3 Dependency Security

- Run `npm audit` in CI — fail on high or critical vulnerabilities
- Add `dependabot` configuration (`.github/dependabot.yml`) for automated dependency updates
- Review Dependabot PRs weekly — do not auto-merge without passing tests

---

## 5. Testing Strategy

### 5.1 Test Pyramid

| Layer | Tool | Target Coverage | Run Frequency |
|---|---|---|---|
| Unit tests | Vitest | ≥ 80% of `src/lib/` | Every commit |
| Component tests | Testing Library + Vitest | Key form components | Every commit |
| Integration tests | Vitest + real test DB | All API routes | Every commit |
| E2E tests | Playwright | All critical user flows | Every PR |
| Security tests | OWASP ZAP (manual) | Before each major release | Per release |

### 5.2 Test Database

- Separate PostgreSQL database for tests: `vbsdb_test`
- Prisma `datasource` uses `DATABASE_URL` env var — CI sets `TEST_DATABASE_URL`
- `vitest.setup.ts` runs `prisma migrate deploy` and seeds test data before suite
- Each test file that writes to DB wraps operations in a transaction and rolls back

### 5.3 E2E Test Scenarios (Complete List)

**Authentication:**
- Sign in with valid credentials → success
- Sign in with wrong password × 5 → account locked message
- Sign in with locked account → informative lockout message
- Sign in as unverified user in production → blocked with verification prompt
- Magic link sign in → success
- Register with valid data → account created
- Register with existing email → generic error (no user enumeration)
- Register with weak password → specific validation errors
- Forgot password → email sent → reset link works → old sessions invalidated
- OAuth sign-in (mocked) → account created with VIEWER role

**Authorization:**
- VIEWER cannot access `/admin/*` → redirected
- STAFF cannot access `/admin/*` → redirected
- ADMIN can access `/admin/*` → permitted
- STAFF can access `/students/*` → permitted
- VIEWER cannot modify student → action fails with 403

**Multi-tenancy (Phase 1+):**
- User from Org A cannot GET student belonging to Org B
- User from Org A cannot POST to Org B's check-in
- Org A's branding settings do not appear in Org B

**Core features:**
- Create student → appears in list
- Check-in student → attendance record created → duplicate check-in returns same result (idempotent)
- Create schedule session → appears in schedule
- Export attendance CSV → file downloads with correct data
- Admin creates event → event appears in list
- Admin marks event active → event is active

**Billing (Phase 3+):**
- New signup → free trial created in Stripe → PRO features accessible
- Trial ends → downgraded to FREE → PRO features inaccessible
- Upgrade → Stripe checkout → subscription active → PRO features accessible
- Subscription cancelled → downgraded to FREE

---

## 6. CI/CD Pipeline Specification

### 6.1 Branch Strategy

| Branch | Purpose | Protection |
|---|---|---|
| `main` | Production-ready code | Require PR, require CI pass, no direct push |
| `develop` | Integration branch | Require PR, require CI pass |
| `feature/*` | Feature work | No protection — deleted after merge |
| `fix/*` | Bug fixes | No protection |
| `release/v*.*.*` | Release preparation | Require PR to main |

### 6.2 Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`

- MAJOR: Breaking changes (schema migrations that require manual intervention, removed features)
- MINOR: New features, new migrations that are backward compatible
- PATCH: Bug fixes, security patches

Tags (`v1.0.0`) trigger Docker build and GitHub Release.

### 6.3 Release Process

1. Create `release/v1.0.0` branch from `develop`
2. Update `package.json` version
3. Update `CHANGELOG.md` (Keep a Changelog format)
4. Open PR to `main`
5. CI runs full suite including E2E
6. Merge to `main`
7. Tag `v1.0.0`
8. GitHub Actions builds Docker image, pushes to GHCR
9. GitHub Release created with CHANGELOG

### 6.4 Self-Hosted Update Path

Documented in `docs/UPDATING.md`:
1. Back up database: `docker compose exec db pg_dump ...`
2. Pull new image: `docker compose pull`
3. Restart with migration: `docker compose up -d` (startup script runs `prisma migrate deploy`)
4. Verify health: `curl http://localhost:3000/api/health/ready`

Also provide:
- `scripts/update.sh` — automates steps above for Linux/Mac
- `scripts/update.ps1` — PowerShell equivalent for Windows
- `scripts/backup.sh` — standalone backup with timestamp

---

## 7. Open Questions (To Resolve During Implementation)

These are not assumptions — they are confirmed unknowns that need a decision before the relevant phase begins.

| # | Question | Must decide by | Impact |
|---|---|---|---|
| Q-01 | What is the base domain for the SaaS product? | Phase 3 start | Affects `NEXTAUTH_URL` config, Stripe callback URLs |
| Q-02 | What SMTP provider for transactional email in SaaS? (Resend, SendGrid, SES) | Phase 3 start | Affects email notification implementation |
| Q-03 | What pricing (dollar amounts) for Pro and Enterprise? | Phase 3 start | Affects Stripe product/price setup |
| Q-04 | What is the free trial length? | Phase 3 start | Affects Stripe trial config |
| Q-05 | Does self-hosted ever get premium features via a license key (vs. never)? | Phase 2 start | Affects entitlement system design |
| Q-06 | Where is the marketing site hosted? Same Next.js app or separate? | Phase 3 start | Affects routing and build |
| Q-07 | Should the Internal Admin panel require a separate login or a special flag on the User model? | Phase 3 start | Affects auth config |

---

## 8. Files That Will Be Created or Modified

### Phase 0

**New files:**
- `.github/workflows/ci.yml`
- `.github/workflows/docker.yml`
- `.github/workflows/release.yml`
- `.github/dependabot.yml`
- `vitest.config.ts`
- `vitest.setup.ts`
- `playwright.config.ts`
- `src/lib/__tests__/auth-lockout.test.ts`
- `src/lib/__tests__/rate-limit.test.ts`
- `src/lib/__tests__/validation.test.ts`
- `src/lib/__tests__/resource-access.test.ts`
- `src/lib/__tests__/invitations.test.ts`
- `src/lib/__tests__/pagination.test.ts`
- `src/lib/__tests__/xss-protection.test.ts`
- `src/lib/redis.ts`
- `src/lib/logger.ts`
- `src/lib/features.ts` (stub for Phase 2)
- `src/app/api/health/ready/route.ts`
- `src/app/api/health/live/route.ts`
- `src/app/auth/forgot-password/page.tsx`
- `src/app/auth/reset-password/[token]/page.tsx`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/account/settings/page.tsx`
- `scripts/start.sh`
- `scripts/update.sh`
- `scripts/update.ps1`
- `scripts/backup.sh`
- `e2e/auth.spec.ts`
- `e2e/checkin.spec.ts`
- `e2e/admin-protection.spec.ts`
- `e2e/setup-wizard.spec.ts`
- `CHANGELOG.md`
- `docs/UPDATING.md`

**Modified files:**
- `prisma/schema.prisma` — Add `AuditLog`, `PasswordResetToken` models
- `src/lib/rate-limit.ts` — Redis backend
- `src/lib/auth-lockout.ts` — Redis backend
- `src/lib/audit-log.ts` — DB persistence
- `src/lib/security-headers.ts` — Nonce-based CSP
- `src/lib/settings.ts` — Fix `require('crypto')`
- `src/lib/constants.ts` — Add `BCRYPT_ROUNDS = 12`
- `src/lib/auth-config.ts` — Remove dangerous linking, enforce email verification, add session version check
- `src/app/api/setup/route.ts` — Use `BCRYPT_ROUNDS` constant
- `src/app/api/auth/register/route.ts` — Use `BCRYPT_ROUNDS` constant
- `src/app/admin/users/page.tsx` — Increment `sessionVersion` on role change
- `docker-compose.yml` — Add Redis service
- `docker-compose.prod.yml` — Add Redis service, update health check
- `.env.example` — Add `REDIS_URL`, `DEPLOYMENT_MODE`, remove dead `ACTIVE_EVENT_YEAR`
- `Dockerfile` — Use startup script
- `package.json` — Add test scripts and devDependencies

### Phase 1

**New files:**
- `prisma/migrations/[timestamp]_add_organization/migration.sql`
- `prisma/migrations/[timestamp]_add_org_constraints/migration.sql`
- `scripts/backfill-org.ts`
- `src/lib/tenant.ts`
- `src/middleware.ts`
- `e2e/multi-tenancy.spec.ts`

**Modified files:**
- `prisma/schema.prisma` — Add `Organization` model, add `organizationId` to all models, change `AppSettings` singleton
- All files with Prisma queries — add `organizationId` to WHERE clauses
- `src/lib/settings.ts` — Remove singleton pattern
- `src/lib/auth-config.ts` — Add `organizationId` to JWT token
- `src/app/api/setup/route.ts` — Create default org on first launch
- `src/app/layout.tsx` — Read settings org-scoped

### Phase 2

**New files:**
- `src/lib/features.ts` (full implementation)
- `src/lib/entitlements.ts`
- `src/lib/require-feature.ts`
- `src/components/UpgradePrompt.tsx`

**Modified files:**
- `src/app/admin/events/[id]/page.tsx` — Enforce 1 active event limit for FREE plan

### Phase 3

**New files:**
- `src/lib/stripe.ts`
- `src/app/signup/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/dashboard/billing/page.tsx`
- `src/app/api/public/signup/route.ts`
- `src/app/api/webhooks/stripe/route.ts`
- `src/app/api/billing/create-checkout/route.ts`
- `src/app/api/billing/create-portal/route.ts`
- `src/app/internal/admin/page.tsx`
- `e2e/billing.spec.ts`
- `e2e/signup.spec.ts`

**Modified files:**
- `prisma/schema.prisma` — Add Stripe fields to `Organization`
- `.env.example` — Add Stripe env vars
- `src/app/page.tsx` — Conditional render: SaaS marketing page vs. self-hosted app landing

---

## 9. Implementation Order Within Each Phase

Within each phase, work proceeds in this order to minimize broken states:

1. Write tests for the behavior you are about to change (RED)
2. Implement the change (GREEN)
3. Verify tests pass
4. Open PR — CI must pass before merge
5. Update CHANGELOG

Never merge code that breaks existing tests. Never skip step 1.

---

*Document written: 2026-05-08*  
*Next step: Implementation plan via writing-plans skill*
