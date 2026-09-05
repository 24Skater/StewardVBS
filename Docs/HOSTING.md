# Hosting invariants

Two rules this repository holds itself to, both enforced by
`scripts/ci/check-platform-boundaries.sh` as the **Platform Boundaries** CI job,
plus how secrets are handled here.

None of this requires anything hosted. StewardVBS runs standalone.

## 1. No hardcoded production domain

A deployment domain is configuration, never a source constant. It has changed
once already and cost one line, which is only true because nothing hardcodes it.

Today that means `docker-compose.traefik.yml`'s `Host()` rule and anything else
that would otherwise name a real hostname. If you add something that needs to
know where it is deployed, read it from the environment.

The demo banner follows the same rule: it reads `VITE_DEMO_ADMIN_EMAIL` and
`VITE_DEMO_ADMIN_PASSWORD` rather than naming values in source, so the demo
credentials and the demo seed cannot drift apart.

## 2. No hosted-billing credentials

If this app is ever run as part of a hosted subscription, the billing for that
subscription is not this app's business. Credentials named `STRIPE_PLATFORM_*`
must never appear in this repository, and this app never imports a billing
client belonging to whoever hosts it.

That is a separate concern from any Stripe integration VBS itself might use for
a church's own money, which is ordinary application configuration.

## Secrets

Credentials belong in `.env`, which is gitignored — never in a script, a test
fixture, or a comment. `scripts/*.mjs` read `REDIS_PASSWORD` and container names
from the environment and take the target account from argv.

The Redis password that was previously inlined in `scripts/clear-lockout.mjs`
and `scripts/fix-admin.mjs` has been rotated. Any running stack must be
restarted to pick up the new value:

```sh
docker compose -f docker-compose.prod.yml up -d --force-recreate redis app
```

## Not yet: multi-tenancy

StewardVBS is single-organization today. `AppSettings` is a singleton row and
nothing carries an organization id.

Two things have to happen before that changes, in this order. Profile images
move out of base64 columns and into object storage — base64 photographs of
minors in a shared database is simultaneously a bloat problem, a backup problem
and the most sensitive data here. Then the schema gains an organization and the
data-layer guard that enforces it.

Until that work lands, run one instance per organization.
