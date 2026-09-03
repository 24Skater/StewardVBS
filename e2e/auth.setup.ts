import { test as setup, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from "./helpers/auth";

// This runs once before authenticated specs. It registers a test admin user
// (if not already registered), upgrades them to ADMIN role, and saves session
// cookies to playwright/.auth/admin.json.

/**
 * Promote the registered test user to ADMIN.
 *
 * Registration defaults to a non-admin role, and `needsSetup()` redirects
 * /auth/signin to /setup whenever no ADMIN exists — so without this the whole
 * public suite sees the first-launch wizard instead of the sign-in page.
 *
 * This talks to the database through Prisma rather than shelling into a
 * container. The previous `docker exec vbs-app-db-1 psql ...` only ever worked
 * against a local docker-compose stack; in CI, where Postgres is a service
 * container, it failed with "No such container" and merely warned, leaving the
 * suite to fail later and somewhere else.
 */
async function upgradeTestAdminRole(prisma: PrismaClient): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: { email: TEST_ADMIN_EMAIL },
    data: { role: "ADMIN" },
  });
  // Fail here, loudly, rather than letting every downstream spec fail
  // obscurely against the setup wizard.
  expect(
    count,
    `Expected to promote ${TEST_ADMIN_EMAIL} to ADMIN, but no such user exists. Did registration fail?`
  ).toBeGreaterThan(0);
}

/**
 * Ensure an active Event exists.
 *
 * `getActiveEvent()` throws NotFoundError when no Event has isActive=true, and
 * /checkin surfaces that as "No active event found. Please activate an event in
 * the admin panel." The check-in specs assert on real page content, so without
 * this they test the error state instead of the feature.
 *
 * Idempotent: Event.year is unique, so re-running upserts rather than duplicates.
 */
async function ensureActiveEvent(prisma: PrismaClient): Promise<void> {
  const year = new Date().getFullYear();
  await prisma.event.upsert({
    where: { year },
    update: { isActive: true },
    create: { year, theme: "E2E Test Event", isActive: true },
  });
}

setup("create test admin session", async ({ page }) => {
  // Try to register the test admin user — idempotent (server ignores duplicate email)
  await page.request.post("/api/auth/register", {
    data: {
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD,
      name: "E2E Admin",
    },
  });

  // Prepare the database state every downstream spec assumes.
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL or DATABASE_URL must be set so the E2E fixtures can be prepared."
    );
  }
  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    // Registration defaults to a non-admin role.
    await upgradeTestAdminRole(prisma);
    await ensureActiveEvent(prisma);
  } finally {
    await prisma.$disconnect();
  }

  // Sign in
  await page.goto("/auth/signin");
  await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
  await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Should land on a protected page after sign-in
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"), {
    timeout: 10_000,
  });

  await page.context().storageState({ path: "playwright/.auth/admin.json" });
});
