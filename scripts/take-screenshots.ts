import { chromium } from "@playwright/test";
import path from "path";

const BASE_URL = "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "docs", "screenshots");
const EMAIL = "e2e-admin@vbs-test.local";
const PASSWORD = "TestAdmin1!";

async function ensureAdminUser() {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "Admin" }),
  });
  console.log("Register:", res.status);
}

async function upgradeRole() {
  const { spawnSync } = await import("child_process");
  spawnSync(
    "docker",
    [
      "exec", "vbs-app-db-1",
      "psql", "-U", "postgres", "-d", "vbsdb", "-c",
      `UPDATE "User" SET role = 'ADMIN' WHERE email = '${EMAIL}'`,
    ],
    { encoding: "utf8" }
  );
}

async function main() {
  await ensureAdminUser();
  await upgradeRole();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // --- Sign in ---
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"), {
    timeout: 15_000,
  });
  console.log("Signed in");

  const shots: Array<{ name: string; path: string; clip?: { x: number; y: number; width: number; height: number } }> = [
    { name: "landing", path: "/" },
    { name: "signin", path: "/auth/signin" },
    { name: "dashboard", path: "/dashboard" },
    { name: "students", path: "/students" },
    { name: "checkin", path: "/checkin" },
    { name: "schedule", path: "/schedule" },
    { name: "reports", path: "/reports" },
    { name: "admin-settings", path: "/admin/settings" },
    { name: "admin-events", path: "/admin/events" },
    { name: "admin-users", path: "/admin/users" },
  ];

  for (const shot of shots) {
    console.log(`Capturing ${shot.name}...`);
    try {
      await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "networkidle", timeout: 20_000 });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `${OUT_DIR}/${shot.name}.png`,
        fullPage: false,
      });
      console.log(`  -> ${shot.name}.png`);
    } catch (e) {
      console.warn(`  SKIP ${shot.name}: ${(e as Error).message.split("\n")[0]}`);
    }
  }

  await browser.close();
  console.log("Done. Screenshots saved to docs/screenshots/");
}

main().catch(console.error);
