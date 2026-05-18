# VBS App — Deep Code Audit Report

**Date**: 2026-05-18  
**Auditor**: Claude Code (Sonnet 4.6)  
**Branch**: fix/critical-security-issues  
**Audience**: Churches (self-hosted & SaaS), open-source contributors  
**Deployment targets**: VPS, AWS, Azure, Serverless  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)  
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)  
3. [Phase 0 Completion Status](#3-phase-0-completion-status)  
4. [Remaining Security Issues](#4-remaining-security-issues)  
5. [Code Quality Findings](#5-code-quality-findings)  
6. [Feature & Workflow Gaps for Churches](#6-feature--workflow-gaps-for-churches)  
7. [DevOps: Dev / QA / Prod Docker Environments](#7-devops-dev--qa--prod-docker-environments)  
8. [Deployment Targets: VPS, AWS, Azure, Serverless](#8-deployment-targets-vps-aws-azure-serverless)  
9. [Infrastructure-as-Code (Terraform)](#9-infrastructure-as-code-terraform)  
10. [CI/CD Assessment](#10-cicd-assessment)  
11. [Missing Scripts](#11-missing-scripts)  
12. [Priority Fix List](#12-priority-fix-list)  
13. [Recommended Build Order](#13-recommended-build-order)  

---

## 1. Executive Summary

The VBS App is a solid foundation for church VBS management. The team has already executed the bulk of Phase 0 from the prior roadmap spec (2026-05-08). Auth is well-designed, Zod validation is consistent, XSS escaping is applied, security headers with nonce-based CSP are in place, and CI/CD pipelines exist.

**What is healthy:**
- Authentication (credentials + Google OAuth + Microsoft OAuth + magic links) is production-grade
- RBAC (ADMIN / STAFF / VIEWER) is enforced on every route
- Redis-backed rate limiting and account lockout are in place
- Audit log persists to PostgreSQL
- Password reset flow works end-to-end
- Session invalidation on role change (sessionVersion) works
- Multi-stage Docker build is production-ready
- GitHub Actions CI runs lint, TypeScript check, unit tests, build, and E2E

**What needs work now:**
- Redis in production has no password — any process on the Docker network can read lockout and rate-limit data
- Image upload validates MIME type but not file magic bytes (bypass-able)
- No rate limiting on the registration endpoint
- The dashboard fetches ALL students to compute counts — will degrade with large datasets
- No Dev/QA/Prod environment separation in Docker Compose
- No Terraform for any cloud deployment
- No backup scripts
- Phase 1 (multi-tenancy) has not started — the schema is still single-tenant

**Church-specific gaps (high value):**
- No authorized pickup tracking / release workflow
- No photo/media permission consent per student
- No parent-facing registration (Google Forms is the only intake path)
- No health/allergy alert workflow for staff at check-in
- No parent communication (SMS / email)
- No volunteer check-in (only students)

---

## 2. Tech Stack & Dependencies

### Runtime Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | ^15.5.18 | App Router, Server Actions, standalone output |
| Language | TypeScript | 5.4.5 | Strict mode not explicitly enabled |
| ORM | Prisma | ^5.17.0 | PostgreSQL adapter |
| Database | PostgreSQL | 16-alpine (Docker) | |
| Cache / Sessions | Redis | 7-alpine (Docker) | via ioredis |
| Auth | NextAuth v5 | 5.0.0-beta.20 | **Still in beta** |
| Styling | Tailwind CSS | ^4.1.12 | |
| Logging | pino + pino-pretty | ^9.14.0 | |
| Validation | Zod | ^3.23.8 | |
| Email | nodemailer | ^7.0.7 | |
| Password hashing | bcryptjs | ^2.4.3 | |

### Testing Stack

| Tool | Purpose | Version |
|------|---------|---------|
| Vitest | Unit tests | ^4.1.5 |
| @testing-library/react | Component tests | ^16.3.2 |
| Playwright | E2E tests | ^1.59.1 |
| msw | API mocking | ^2.14.5 |
| @vitest/coverage-v8 | Coverage | ^4.1.5 |

### Key Observations

- **NextAuth v5 is beta**: `next-auth@5.0.0-beta.20` is not production-stable. APIs have changed between betas. This is a dependency risk — pin the exact version and track breaking changes.
- **eslint-config-next** pins to `14.2.5` while Next.js is `^15.5.x` — version mismatch in ESLint config.
- **No `strict: true` in tsconfig** — should be verified to ensure `strictNullChecks` is active.
- **`overrides` for `fast-xml-parser` and `tar`** — indicates known vulnerability overrides. These should be re-reviewed with `npm audit`.

---

## 3. Phase 0 Completion Status

The previous spec (2026-05-08) identified 17 bugs (B-01 through B-17). Status today:

| Bug | Severity | Description | Status |
|-----|----------|-------------|--------|
| B-01 | CRITICAL | In-memory rate limiter | ✅ FIXED — Redis-backed with in-memory dev fallback |
| B-02 | CRITICAL | In-memory account lockout | ✅ FIXED — Redis-backed with in-memory dev fallback |
| B-03 | CRITICAL | Audit log to console only | ✅ FIXED — Persists to `AuditLog` table |
| B-04 | CRITICAL | No AuditLog table | ✅ FIXED — Model exists in schema |
| B-05 | CRITICAL | Zero tests | ✅ FIXED — Unit tests + E2E exist |
| B-06 | CRITICAL | Zero CI/CD | ✅ FIXED — ci.yml, docker.yml, release.yml |
| B-07 | HIGH | CSP uses unsafe-inline / unsafe-eval | ✅ FIXED — Nonce-based CSP in middleware |
| B-08 | HIGH | bcrypt rounds inconsistency | ✅ FIXED — `BCRYPT_ROUNDS=12` constant |
| B-09 | HIGH | require('crypto') in ESM | ✅ FIXED — `import crypto from 'crypto'` |
| B-10 | HIGH | allowDangerousEmailAccountLinking | ✅ FIXED — Removed from auth-config.ts |
| B-11 | HIGH | No password reset | ✅ FIXED — Full flow implemented |
| B-12 | HIGH | No session invalidation on role change | ✅ FIXED — sessionVersion pattern works |
| B-13 | HIGH | No email verification enforcement | ✅ FIXED — Enforced in production |
| B-14 | MEDIUM | No startup migration script | ✅ FIXED — scripts/start.sh |
| B-15 | MEDIUM | No structured logging | ✅ FIXED — pino logger with request IDs |
| B-16 | MEDIUM | Base64 images in DB | ⏳ DEFERRED — Intentional (Phase 5) |
| B-17 | LOW | Dead ACTIVE_EVENT_YEAR env var | Need to verify .env.example |

**Phase 0 is substantially complete.** The remaining work is Phase 1 (multi-tenancy).

---

## 4. Remaining Security Issues

These are NEW findings not covered in the original spec.

### SEC-01 — CRITICAL: Redis Has No Authentication in Production

**File**: `docker-compose.prod.yml`  
**Lines**: redis service definition (no password configured)

The production Redis instance has no password. Any process on the Docker internal network can read and write rate-limit counters and account lockout state. An attacker who gains access to any container in the compose stack (including the app) can reset lockouts and bypass rate limiting.

**Fix**: Add `--requirepass ${REDIS_PASSWORD}` to the Redis command and update `REDIS_URL` to include credentials:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD}
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD}
```
Update `docker-compose.prod.yml`, `.env.example`, and `src/lib/redis.ts`.

---

### SEC-02 — HIGH: No Rate Limiting on Registration Endpoint

**File**: `src/app/api/auth/register/route.ts`  
**Line**: 21 (POST handler)

The `/api/auth/register` route has no rate limiting. An attacker can create thousands of VIEWER accounts in seconds or hammer bcrypt (BCRYPT_ROUNDS=12 is expensive) to exhaust CPU.

**Fix**: Add `checkRateLimit` at the top of the handler — 10 registrations per IP per hour.

---

### SEC-03 — HIGH: Image Upload Validates MIME Type but Not Magic Bytes

**File**: `src/app/api/upload/image/route.ts`  
**Lines**: 25–28

The upload route checks `file.type` (the MIME type declared by the client), but an attacker can set `Content-Type: image/jpeg` while uploading a script or HTML file. Magic byte validation (checking the actual file header) is missing.

**Fix**: After reading the buffer, check the first bytes match known image signatures:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- GIF: `47 49 46 38`
- WebP: `52 49 46 46` + offset check

Also add: `console.error` in this file (line 54) and `register/route.ts` (line 105) should be replaced with the `logger.error` from `src/lib/logger.ts`.

---

### SEC-04 — MEDIUM: Registration Auto-Verifies Email (Inconsistent with Auth Policy)

**File**: `src/app/api/auth/register/route.ts`  
**Line**: 78

```typescript
emailVerified: new Date(), // Consider email verified for credentials users
```

The comment says "consider" — but this silently bypasses the email verification gate enforced in `auth-config.ts` for production. A user who registers via credentials is immediately verified without ever clicking a link. This is inconsistent.

**Decision needed**: Either send a verification email on registration (recommended for production) OR explicitly document that credentials registration skips email verification and remove the comment. Currently the behavior is inconsistent with the stated policy.

---

### SEC-05 — MEDIUM: `as any` Cast on PrismaAdapter

**File**: `src/lib/auth-config.ts`  
**Line**: 17

```typescript
adapter: PrismaAdapter(prisma) as any,
```

This cast disables type checking on the adapter. It likely exists because NextAuth v5 beta has adapter type incompatibilities. The risk is that a future beta upgrade could silently break the adapter contract. Track the NextAuth v5 stable release.

---

### SEC-06 — LOW: Webhook Secret Exposed in Google Forms Integration Docs

**File**: `Docs/GOOGLE_FORMS_INTEGRATION.md` — need to verify no secrets were committed.  
**File**: `src/app/admin/settings/page.tsx` — webhook secret rendered in UI.

The webhook secret is stored in `AppSettings.googleFormsWebhookSecret`. Verify this field is not logged in any audit log entry and is not included in any API response that returns the full settings object.

---

## 5. Code Quality Findings

### CQ-01 — HIGH: Dashboard Fetches All Students (Scalability)

**File**: `src/app/dashboard/page.tsx`  
**Lines**: 21–46

```typescript
const [students, ...] = await Promise.all([
  prisma.student.findMany({
    where: { eventId: event.id },
    select: { id, name, category, dateOfBirth, createdAt },
  }),
  ...
])
```

The dashboard fetches the full student list (all fields selected) then computes counts and age breakdowns in JavaScript. With 500+ students this returns megabytes of data. 

**Fix**: Replace with:
- `prisma.student.count()` for totals
- `prisma.student.groupBy()` for category counts
- `prisma.student.aggregate()` for age distribution (or a raw SQL query)
- Keep the recent-5 query as is

---

### CQ-02 — HIGH: Check-In Page Has No Pagination

**File**: `src/app/checkin/page.tsx`  
**Lines**: 46–58

All students for the active event are loaded at once. With 300 students this renders 300 form elements. On a slow device (tablet used for check-in) this is noticeable.

**Fix**: Add pagination or virtual scrolling. Since check-in is typically searched by name, a search-first pattern (require at least 2 characters before showing results) is better UX and fixes the performance issue.

---

### CQ-03 — MEDIUM: TypeScript Not in Strict Mode

**File**: `tsconfig.json`

Verify `"strict": true` is set. Without it, `strictNullChecks` and `strictFunctionTypes` may be off, allowing null-dereference bugs that TypeScript would otherwise catch.

---

### CQ-04 — MEDIUM: ESLint Version Mismatch

**File**: `package.json` line 49

```json
"eslint-config-next": "14.2.5"
```

Next.js is at `^15.5.x`. The ESLint config should track the Next.js major version. Update to `eslint-config-next@15.x`.

---

### CQ-05 — MEDIUM: `any` Used in Auth Callbacks

**File**: `src/lib/auth-config.ts`  
**Lines**: 148, 204, 234

```typescript
async signIn(params: any) {
async jwt({ token, user, account }: any) {
async session({ session, token }: any) {
```

These should use the typed callback parameters from NextAuth v5. Using `any` disables TypeScript safety on the most security-critical code in the app.

---

### CQ-06 — LOW: console.error Remnants

**Files**:  
- `src/app/api/auth/register/route.ts:105`  
- `src/app/api/upload/image/route.ts:54`

These should use `logger.error()` from `src/lib/logger.ts` for consistent structured logging.

---

### CQ-07 — LOW: Dashboard formatTimeAgo Is a Module-Level Utility

**File**: `src/app/dashboard/page.tsx`  
**Line**: 470

`formatTimeAgo` is defined at the bottom of a page file. It belongs in `src/lib/date-utils.ts` where other date utilities live.

---

## 6. Feature & Workflow Gaps for Churches

These are workflow loops that are incomplete — a church staff member cannot complete a real-world task without workarounds.

### WF-01 — CRITICAL: No Authorized Pickup Tracking

**Impact**: Safety / liability  
**Current state**: Parents are tracked in `StudentParent` with `canPickup: Boolean`, but check-in only records arrival — there is no check-OUT.

Churches legally need to track who picked up a child. Without this, a non-authorized person could pick up a child with no record. This is the single most important safety feature missing.

**Needed**:
- Check-out action on attendance record (timestamps arrival + departure)
- Check-out confirms name of person picking up
- Alert if person is not on the authorized pickup list
- Override with staff confirmation and reason logged to audit trail

---

### WF-02 — HIGH: No Health / Allergy Workflow at Check-In

**Impact**: Child safety  
**Current state**: `Student.allergies` and `Student.medicalNotes` exist in the schema but are not surfaced during check-in.

A staff member checking in a child should immediately see allergy and medical alerts — before the child enters the classroom.

**Needed**:
- Red alert badge on the check-in card if `allergies` or `medicalNotes` is populated
- Click to expand and read the full note
- Optional: require staff to acknowledge the alert before completing check-in

---

### WF-03 — HIGH: No Photo / Media Permission Consent

**Impact**: Legal / privacy  
**Current state**: No consent field exists.

Many churches are legally required to track whether parents have consented to their child being photographed or appearing in social media. Missing this creates liability.

**Needed**:
- `photoConsent: Boolean` on `Student` model
- Consent status visible on student profile and at check-in
- Export includes consent status in CSV reports

---

### WF-04 — HIGH: No Parent Self-Registration

**Impact**: Operational efficiency  
**Current state**: Staff must manually add each student, or use the Google Forms webhook.

The Google Forms integration is clever but fragile (requires a webhook and manual field mapping). A built-in parent registration form (public-facing, no login required) would remove the Google Forms dependency.

**Needed**:
- Public `/register` page (no auth required)
- Parent fills in: student name, DOB, allergies, parent name/phone, emergency contact
- Registration goes into a "pending" state — admin approves before student is fully enrolled
- Approval sends confirmation email to parent
- Optional: QR code on flyers linking to registration form

---

### WF-05 — MEDIUM: No Volunteer / Teacher Check-In

**Impact**: Program management  
**Current state**: Only students are tracked for attendance. Volunteers/teachers have no check-in.

Churches need to verify volunteers arrive before children. Low teacher/volunteer ratio is a safety concern.

**Needed**:
- Volunteer check-in flow separate from student check-in
- Volunteer list by day/session
- Alert if a class has no teacher checked in

---

### WF-06 — MEDIUM: No Parent Communication

**Impact**: Engagement and safety  
**Current state**: No way to send messages to parents.

Churches expect to send: check-in confirmations, schedule changes, reminders, emergencies.

**Needed** (phased):
- **Phase A**: Email to parents via admin action (bulk send to all parents of checked-in students)
- **Phase B**: Twilio SMS integration for urgent messages
- **Phase C**: Per-event broadcast from admin panel

---

### WF-07 — MEDIUM: No Time-of-Check-In Tracking

**Impact**: Late arrival reporting, safety  
**Current state**: `Attendance.date` is `DateTime @default(now())` but the UI sets it to start-of-day for uniqueness. The actual time of check-in is lost.

**Needed**:
- Store actual check-in timestamp as `checkedInAt DateTime @default(now())`
- Show arrival time on the student profile and attendance report
- Late arrivals highlighted in daily attendance report

---

### WF-08 — LOW: No Batch Badge Printing

**Impact**: Operational efficiency  
**Current state**: Badge printing exists per-student (`/students/[id]/badge/page.tsx`) but there is no "print all badges" or "print badges for category" function.

Churches print badges before VBS starts. Clicking 100 individual student pages is not workable.

**Needed**:
- Batch print from student list: select students → print all badges in one print job
- Filter by category before batch printing
- Badge includes: name, category, photo (if any), allergy indicator

---

## 7. DevOps: Dev / QA / Prod Docker Environments

### Current State

| File | Purpose | Status |
|------|---------|--------|
| `docker-compose.yml` | Dev environment | Has hardcoded `postgres/postgres` credentials, no app service |
| `docker-compose.prod.yml` | Production | Good structure, missing Redis auth |
| `docker-compose.traefik.yml` | Prod + reverse proxy | Exists |
| No `docker-compose.qa.yml` | QA/staging | **MISSING** |

### Required: Three-Environment Docker Compose Strategy

#### docker-compose.yml (Dev — already exists, needs minor fixes)

```yaml
# Dev: No app container — developer runs Next.js locally
# Database + Redis only
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vbsdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres  # OK for dev only
    ports:
      - "5432:5432"
    volumes:
      - devpg:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
```

#### docker-compose.qa.yml (New — needed)

```yaml
# QA: Full stack, production build, test data, isolated ports
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-vbsdb_qa}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - qa_postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - qa_redis:/data
    restart: unless-stopped

  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-3001}:3000"   # Different port from prod
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-vbsdb_qa}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      NODE_ENV: production
      DEPLOYMENT_MODE: self-hosted
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

volumes:
  qa_postgres:
  qa_redis:
```

#### docker-compose.prod.yml (Fix Redis auth — existing file)

Add to Redis service:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD}
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD}
```

Update app `REDIS_URL`:
```yaml
REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
```

Add `REDIS_PASSWORD` to `.env.example`.

### Environment Variable Files

Create three `.env` template files:
- `.env.example` — development defaults (already exists, update it)
- `.env.qa.example` — QA-specific overrides
- `.env.prod.example` — production checklist with all required vars

### Makefile for Environment Management

Create a `Makefile` at the repo root:
```makefile
.PHONY: dev qa prod-up prod-down logs backup

dev:
	docker compose up -d

qa:
	docker compose -f docker-compose.qa.yml --env-file .env.qa up -d

prod-up:
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

prod-down:
	docker compose -f docker-compose.prod.yml down

logs:
	docker compose -f docker-compose.prod.yml logs -f app

backup:
	./scripts/backup.sh
```

---

## 8. Deployment Targets: VPS, AWS, Azure, Serverless

### Option A: VPS (Recommended for Self-Hosted Churches)

**Stack**: Single server (2+ vCPU, 4GB RAM), Ubuntu 24.04 LTS, Docker Compose, Traefik reverse proxy, Let's Encrypt TLS.

**Architecture**:
```
Internet → Traefik (port 80/443) → VBS App container (port 3000)
                                  → PostgreSQL container
                                  → Redis container
```

**Providers**: Hetzner (cheapest, EU), DigitalOcean, Linode/Akamai, Vultr.

**Required scripts** (currently missing):
- `scripts/install-vps.sh` — installs Docker, Docker Compose, clones repo, configures `.env`
- `scripts/update.sh` — pulls new image, runs migrations, restarts
- `scripts/backup.sh` — pg_dump to timestamped file, optional S3 upload

The `docker-compose.traefik.yml` is already well-structured for this.

---

### Option B: AWS Deployment

**Three sub-options by complexity:**

#### B1: AWS EC2 + Docker Compose (simplest, same as VPS)
- Launch EC2 (t3.small or t3.medium)
- Use Elastic IP for stable address
- Use RDS PostgreSQL (instead of container) for managed backups
- Use ElastiCache Redis (instead of container) for HA
- Route 53 for DNS
- ACM for TLS (via ALB) or Let's Encrypt on EC2

**Cost**: ~$50-100/month (t3.small + db.t3.micro RDS + cache.t3.micro)

#### B2: AWS ECS Fargate (containerized, serverless compute)
- ECS Task definition from the existing Docker image
- ALB for load balancing + TLS
- RDS PostgreSQL (multi-AZ for prod)
- ElastiCache Redis
- ECR for Docker image registry (alternative to GHCR)
- Secrets Manager for env vars
- CloudWatch for logs

**Cost**: ~$80-150/month

#### B3: AWS Lightsail (simplest managed option)
- Lightsail Container Service (wraps ECS)
- Lightsail Database (managed PostgreSQL)
- Lightsail CDN for static assets
- Cheapest managed AWS option

**Cost**: ~$40-80/month

**Recommended for most churches**: B3 (Lightsail) or B1 (EC2) for simplicity.

---

### Option C: Azure Deployment

#### C1: Azure Container Apps (serverless containers — best fit)
- Container Apps Environment from existing Docker image
- Azure Database for PostgreSQL (managed)
- Azure Cache for Redis (managed)
- Azure Container Registry for images
- Azure Key Vault for secrets
- Application Insights for monitoring

**Cost**: ~$60-120/month

#### C2: Azure VM + Docker Compose (same as VPS)
- Identical to Option A but on Azure

**Recommended for Microsoft/Azure shops**: C1 (Container Apps).

---

### Option D: Serverless (serverless.tf / Terraform)

**Important note**: The VBS App as currently built is **NOT serverless-compatible** in the traditional sense (API Gateway + Lambda) because:

1. It uses NextAuth with JWT sessions that require consistent headers
2. Prisma requires a persistent database connection (not connection-per-request)
3. `output: "standalone"` in `next.config.mjs` produces a Node.js server binary — not a Lambda handler

**However, "serverless" can mean different things:**

#### D1: Vercel (Next.js native, truly serverless)
The existing code is compatible with Vercel deployment:
- `next.config.mjs` needs `output: "standalone"` removed (Vercel handles this)
- PostgreSQL via Neon (serverless Postgres) or Supabase
- Redis via Upstash (serverless Redis with HTTP API)
- Replace `ioredis` with `@upstash/redis` (HTTP-based, no persistent connection)
- No Docker needed

**Cost**: Vercel Pro ~$20/month + Neon ~$20/month + Upstash ~$10/month = ~$50/month

#### D2: AWS Lambda via SST or OpenNext
- SST (Serverless Stack) can deploy Next.js to Lambda + CloudFront
- Requires Neon or RDS Proxy for database connections (Lambda cold starts + Prisma connection pooling is tricky)
- Not recommended unless Vercel is off the table

#### D3: serverless.tf (Terraform module for serverless)
`serverless.tf` is a Terraform framework for AWS serverless infrastructure. For a Next.js app, the recommended module is `terraform-aws-modules/lambda/aws` + CloudFront + API Gateway.

**This requires significant refactoring** for the current architecture. Recommended only if the team is committed to AWS-native serverless.

**Recommendation**: For self-hosted churches, use VPS (Option A). For SaaS, use Vercel + Neon + Upstash (Option D1) — zero infrastructure management.

---

## 9. Infrastructure-as-Code (Terraform)

### Proposed Structure

```
infra/
├── modules/
│   ├── vps/                    # Generic VPS setup (Hetzner/DO)
│   │   └── main.tf
│   ├── aws-ec2/                # AWS EC2 + RDS + ElastiCache
│   │   └── main.tf
│   ├── aws-ecs/                # AWS ECS Fargate
│   │   └── main.tf
│   ├── aws-lightsail/          # AWS Lightsail (simplest)
│   │   └── main.tf
│   └── azure-container-apps/   # Azure Container Apps
│       └── main.tf
├── environments/
│   ├── dev/
│   │   └── main.tf             # Points to vps or aws-ec2 module
│   ├── qa/
│   │   └── main.tf
│   └── prod/
│       └── main.tf
├── shared/
│   ├── dns.tf                  # Route 53 / Azure DNS
│   ├── tls.tf                  # ACM certificates
│   └── monitoring.tf           # CloudWatch / Azure Monitor
└── README.md
```

### Minimum Viable Terraform (Start Here)

For VPS deployment, Terraform manages:
- DNS record (Route 53 or Cloudflare)
- TLS certificate (ACM or Let's Encrypt via ACME provider)
- The server itself is managed by Docker Compose (not Terraform)

For AWS ECS:
```hcl
# infra/modules/aws-ecs/main.tf
module "ecs" {
  source = "terraform-aws-modules/ecs/aws"
  
  cluster_name = "vbs-app-${var.environment}"
  
  fargate_capacity_providers = {
    FARGATE = {
      default_capacity_provider_strategy = {
        weight = 100
      }
    }
  }
}
```

**Priority**: Create the VPS module first (most churches will self-host on a VPS). AWS ECS is second. Azure Container Apps is third.

---

## 10. CI/CD Assessment

### What Works Well

- `ci.yml`: lint → TypeScript → unit tests → build → E2E — correct order
- `docker.yml`: multi-platform build (amd64 + arm64), GHCR push on tags — excellent
- `release.yml`: needs to verify CHANGELOG generation step
- Playwright `webServer` config: correctly starts the built app before E2E

### Issues Found

#### CI-01 — E2E Tests Build the App on Every Run (Slow)

**File**: `playwright.config.ts` line 22

```typescript
command: 'npm run build && npm run start',
```

In CI, `npm run build` runs again after the build step in `ci.yml` already built. This doubles build time.

**Fix**: Use the artifact from the build step in CI, or cache `.next/` between steps:
```yaml
- name: Start app for E2E
  run: npm run start &
  env:
    DATABASE_URL: ...
```

#### CI-02 — No Dependabot Configuration

No `.github/dependabot.yml`. Dependency updates are not automated. This was called out in the original spec (Phase 0) but never implemented.

**Fix**: Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "monthly"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

#### CI-03 — No `npm audit` Step

CI does not run `npm audit --audit-level=high`. Vulnerabilities in dependencies are not caught.

**Fix**: Add between lint and TypeScript check:
```yaml
- name: Security audit
  run: npm audit --audit-level=high
```

#### CI-04 — No Branch Protection on `fix/*` Branches

The `ci.yml` runs on `main` and `claude/**` branches. The current branch (`fix/critical-security-issues`) is not covered by the push trigger.

**Fix**: Add `fix/**` to the push branches list.

---

## 11. Missing Scripts

From the original spec, these were listed as Phase 0 deliverables but have not been created:

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/backup.sh` | Database backup with timestamp | ❌ MISSING |
| `scripts/update.sh` | Pull new image and restart | ❌ MISSING |
| `scripts/update.ps1` | Windows PowerShell equivalent | ❌ MISSING |
| `scripts/install-vps.sh` | First-time VPS server setup | ❌ NOT IN SPEC (new) |

### scripts/backup.sh

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="vbs_backup_${TIMESTAMP}.sql.gz"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

mkdir -p "$BACKUP_DIR"

echo "[backup] Creating database backup: $BACKUP_FILE"
docker compose exec -T db pg_dump \
  -U "${POSTGRES_USER:-postgres}" \
  "${POSTGRES_DB:-vbsdb}" | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

echo "[backup] Backup saved to: ${BACKUP_DIR}/${BACKUP_FILE}"
echo "[backup] Size: $(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)"

# Optional: upload to S3
if [ -n "$BACKUP_S3_BUCKET" ]; then
  aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "s3://${BACKUP_S3_BUCKET}/backups/${BACKUP_FILE}"
  echo "[backup] Uploaded to S3: s3://${BACKUP_S3_BUCKET}/backups/${BACKUP_FILE}"
fi

# Clean up local backups older than 7 days
find "$BACKUP_DIR" -name "vbs_backup_*.sql.gz" -mtime +7 -delete
echo "[backup] Cleaned up old backups"
```

### scripts/update.sh

```bash
#!/bin/bash
set -e

echo "[update] Backing up database before update..."
./scripts/backup.sh

echo "[update] Pulling latest Docker image..."
docker compose -f docker-compose.prod.yml pull app

echo "[update] Restarting with new image..."
docker compose -f docker-compose.prod.yml up -d app

echo "[update] Waiting for health check..."
sleep 10
curl -f http://localhost:3000/api/health/ready || {
  echo "[update] ERROR: App did not become healthy. Rolling back..."
  docker compose -f docker-compose.prod.yml down
  exit 1
}

echo "[update] Update complete!"
```

---

## 12. Priority Fix List

Ordered by impact × urgency for a church audience:

| # | Priority | Category | Issue | Effort |
|---|----------|----------|-------|--------|
| 1 | CRITICAL | Security | Redis no auth in production | 1 hour |
| 2 | CRITICAL | Safety | No authorized pickup / checkout tracking | 3 days |
| 3 | HIGH | Security | No rate limit on registration endpoint | 2 hours |
| 4 | HIGH | Security | Image upload magic byte validation | 2 hours |
| 5 | HIGH | Safety | No allergy/medical alert at check-in | 1 day |
| 6 | HIGH | Safety | No photo consent tracking | 4 hours |
| 7 | HIGH | Performance | Dashboard fetches all students | 4 hours |
| 8 | HIGH | Performance | Check-in has no pagination | 1 day |
| 9 | HIGH | DevOps | No QA/staging docker-compose | 4 hours |
| 10 | HIGH | CI | No Dependabot | 1 hour |
| 11 | MEDIUM | CI | npm audit missing | 30 min |
| 12 | MEDIUM | DevOps | No backup script | 2 hours |
| 13 | MEDIUM | DevOps | No update script | 2 hours |
| 14 | MEDIUM | UX | No parent self-registration | 3 days |
| 15 | MEDIUM | UX | No batch badge printing | 1 day |
| 16 | MEDIUM | Code | ESLint version mismatch | 30 min |
| 17 | MEDIUM | Code | console.error in 2 routes | 30 min |
| 18 | LOW | Infra | Terraform for VPS/AWS/Azure | 2 weeks |
| 19 | LOW | Feature | Volunteer check-in | 2 days |
| 20 | LOW | Feature | Parent communication (email) | 3 days |

---

## 13. Recommended Build Order

Given the church audience and the dual self-hosted / SaaS goal, recommended sequence:

### Sprint 1 (This Week) — Safety & Security

1. Fix Redis authentication in production (SEC-01)
2. Add rate limiting to registration endpoint (SEC-02)
3. Add magic byte validation to image upload (SEC-03)
4. Add allergy/medical alert to check-in cards (WF-02)
5. Add photo consent field to student model (WF-03)
6. Fix check-in performance (search-first, no bulk load) (CQ-02)

### Sprint 2 (Next Week) — DevOps & Operations

1. Create `docker-compose.qa.yml`
2. Create `scripts/backup.sh`
3. Create `scripts/update.sh`
4. Add Dependabot config
5. Add `npm audit` to CI
6. Fix dashboard aggregate queries (CQ-01)

### Sprint 3 (Week 3) — Church Workflows

1. Add check-out / authorized pickup tracking (WF-01) — this is the biggest safety gap
2. Add batch badge printing (WF-08)
3. Add time-of-check-in to attendance records (WF-07)

### Sprint 4 (Week 4) — Multi-Tenancy (Phase 1)

Start the Phase 1 org migration as specified in the existing roadmap spec.

### Sprint 5+ — SaaS & Advanced Features

Continue Phase 2 (entitlements), Phase 3 (Stripe), Phase 4 (premium features), Terraform.

---

## Appendix A: Files That Need Changes (Summary)

| File | Changes Needed |
|------|---------------|
| `docker-compose.prod.yml` | Add Redis password authentication |
| `docker-compose.qa.yml` | Create new file |
| `.env.example` | Add REDIS_PASSWORD |
| `src/app/api/auth/register/route.ts` | Add rate limiting; fix console.error |
| `src/app/api/upload/image/route.ts` | Add magic byte validation; fix console.error |
| `src/app/dashboard/page.tsx` | Replace full student fetch with aggregate queries |
| `src/app/checkin/page.tsx` | Add search-first pattern, remove bulk load |
| `prisma/schema.prisma` | Add photoConsent, add checkOutAt to Attendance |
| `src/lib/auth-config.ts` | Add proper types to callbacks (remove `any`) |
| `.github/dependabot.yml` | Create new file |
| `.github/workflows/ci.yml` | Add npm audit step; add fix/** branch trigger |
| `scripts/backup.sh` | Create new file |
| `scripts/update.sh` | Create new file |
| `scripts/update.ps1` | Create new file |
| `infra/` | Create Terraform module structure |

---

*Audit completed: 2026-05-18*  
*Next step: Prioritize Sprint 1 items and implement them one by one, using the code-reviewer agent after each change.*
