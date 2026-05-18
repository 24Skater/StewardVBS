import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // Setup project — runs once to create an authenticated session
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Public tests — no auth required
    {
      name: "public",
      testMatch: /\/(auth-flow|auth|admin-protection|register)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Authenticated tests — depend on setup
    {
      name: "authenticated",
      testMatch: /\/(student-crud|checkin|dashboard|admin)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/admin.json",
      },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
    },
  },
});
