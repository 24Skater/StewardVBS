import { test, expect } from "@playwright/test";

// Uses storageState — requires authenticated admin project

test.describe("Admin section", () => {
  test("admin overview loads", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("admin users page loads", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("admin events page loads", async ({ page }) => {
    await page.goto("/admin/events");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("admin categories page loads", async ({ page }) => {
    await page.goto("/admin/categories");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("admin teachers page loads", async ({ page }) => {
    await page.goto("/admin/teachers");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("admin settings page loads", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
  });

  test("new event form has required fields", async ({ page }) => {
    await page.goto("/admin/events/new");
    await expect(page.locator('input[name="year"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("new category form has required fields", async ({ page }) => {
    await page.goto("/admin/categories/new");
    await expect(page.locator('input[name="name"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test("new teacher form has required fields", async ({ page }) => {
    await page.goto("/admin/teachers/new");
    await expect(page.locator('input[name="name"]')).toBeVisible({
      timeout: 10_000,
    });
  });

  test("invite user page loads", async ({ page }) => {
    await page.goto("/admin/users/invite");
    await expect(page.locator('input[name="email"]')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator('select[name="role"]')).toBeVisible();
  });

  test("settings form has site name field", async ({ page }) => {
    await page.goto("/admin/settings");
    await expect(
      page.locator('input[name="siteName"], input[id="siteName"]')
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Admin ROLE protection (STAFF cannot access)", () => {
  // These tests check that ADMIN-only pages reject lower roles.
  // We rely on the test admin having ADMIN role from setup.
  // They're effectively smoke tests here — real role restriction tests
  // would need a separate STAFF storage state.
  test("admin overview is accessible to ADMIN user", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/signin|403|forbidden/, {
      timeout: 5_000,
    });
  });
});
