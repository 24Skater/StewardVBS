import { test, expect } from "@playwright/test";

// Uses storageState — requires authenticated project

test.describe("Dashboard", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/signin/, { timeout: 5_000 });
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("does not show raw errors on screen", async ({ page }) => {
    await page.goto("/dashboard");
    // Use innerText (not textContent) to exclude <script>/<style> content from RSC flight data
    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/prisma|unhandled|500|stack trace/i);
  });

  test("navigation links are present", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator("nav, [role='navigation']")).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Reports pages", () => {
  test("reports index loads", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("attendance report page loads", async ({ page }) => {
    await page.goto("/reports/attendance");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("enrollment report page loads", async ({ page }) => {
    await page.goto("/reports/enrollment");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Schedule page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/schedule");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Attendance page", () => {
  test("loads without error", async ({ page }) => {
    await page.goto("/attendance");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });
});
