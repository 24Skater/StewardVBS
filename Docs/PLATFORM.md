# Steward Platform

Steward VBS is one app in the Steward platform. This file records the
platform-level constraints that apply to *this repository* and points at the
decision record that explains why they exist.

**Decision record:** https://claude.ai/code/artifact/fffcde73-8186-4c63-83f9-979d80f82f42

It covers seven decisions - hosting model, identity, tenancy, where platform
code lives, billing and entitlements, routing, and cross-app integration - plus
the phased roadmap this repository is working through.

## Where this repo sits

VBS is **single-tenant today**. It runs on its own dedicated stack, sold at the
Managed price, and it stays that way until Phase 2 ports StewardTable's
ORM-level tenancy guard into `src/lib/db.ts`.

That is deliberate: revenue is not held hostage to the hardest migration. Do
not add multi-org behaviour piecemeal ahead of Phase 2 - a half-enforced tenancy
boundary is worse than an honest single-tenant one.

## Invariants

Enforced by `scripts/ci/check-platform-boundaries.sh`, which runs as the
`Platform Boundaries` job in CI.

### 1. No hardcoded platform domain

The platform root domain is configuration, never a source constant. This repo
is currently clean; keep it that way. When Phase 2 introduces host-based tenant
resolution, derive it from `PLATFORM_ROOT_DOMAIN` the way
`steward-table/lib/platform-domain.ts` does.

### 2. Platform billing is not this app's business

Churches pay Steward for the subscription through the console. That money has
nothing to do with any money this app handles.

- `STRIPE_PLATFORM_*` credentials exist only in the console's environment and
  must never appear in this repository.
- This app never imports the console's Stripe client. It knows about
  entitlements; it does not know about invoices.

## Secrets

Credentials belong in `.env`, which is gitignored - never in a script, a test
fixture, or a comment. `scripts/*.mjs` read `REDIS_PASSWORD` and container
names from the environment and take the target account from argv.

The Redis password that was previously inlined in `scripts/clear-lockout.mjs`
and `scripts/fix-admin.mjs` has been rotated. Any running stack must be
restarted to pick up the new value:

```sh
docker compose -f docker-compose.prod.yml up -d --force-recreate redis app
```

## Roadmap position

- **Phase 0 (done here):** secret rotation, the boundary guard in CI.
- **Phase 2 (next):** move profile images out of base64 into object storage
  *first*, then `Org` + `Membership` + `orgId`, the `src/lib/db.ts` tenancy
  guard, per-org `AppSettings`, host-based tenant resolution, and org-prefixed
  Redis keys.

See the decision record for the full sequence.
