import { test as setup } from "@playwright/test";
import { spawnSync } from "child_process";
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from "./helpers/auth";

// This runs once before authenticated specs. It registers a test admin user
// (if not already registered), upgrades them to ADMIN role, and saves session
// cookies to playwright/.auth/admin.json.

function upgradeTestAdminRole() {
  const result = spawnSync(
    "docker",
    [
      "exec",
      "vbs-app-db-1",
      "psql",
      "-U",
      "postgres",
      "-d",
      "vbsdb",
      "-c",
      `UPDATE "User" SET role = 'ADMIN' WHERE email = '${TEST_ADMIN_EMAIL}'`,
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    console.warn("Could not upgrade test admin role via docker exec:", result.stderr);
  }
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

  // Ensure the test user has ADMIN role (registration defaults to VIEWER)
  upgradeTestAdminRole();

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
