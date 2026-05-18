import { test, expect } from "@playwright/test";
import { TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } from "./helpers/auth";

// Public (no storageState) — tests sign-in, sign-out, and protected redirects

test.describe("Sign-in page", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', "nobody@example.com");
    await page.fill('input[name="password"]', "WrongPass1");
    await page.click('button[type="submit"]');
    await expect(page.locator("body")).toContainText(
      /invalid|error|incorrect|failed/i,
      { timeout: 8_000 }
    );
  });

  test("has a link to forgot-password", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator('a[href*="forgot-password"]')).toBeVisible();
  });

  test("has a link to register", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator('a[href*="register"]')).toBeVisible();
  });
});

test.describe("Forgot password page", () => {
  test("renders form", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows confirmation for any email (no user enumeration)", async ({
    page,
  }) => {
    await page.goto("/auth/forgot-password");
    await page.fill('input[type="email"]', "nobody-real@example.com");
    await page.click('button[type="submit"]');
    await expect(page.locator("body")).toContainText(
      /check your email|if that email|reset link/i,
      { timeout: 8_000 }
    );
  });
});

test.describe("Protected route redirects (unauthenticated)", () => {
  const protectedRoutes = [
    "/dashboard",
    "/students",
    "/checkin",
    "/attendance",
    "/schedule",
    "/reports",
    "/admin",
    "/admin/users",
    "/admin/events",
    "/admin/categories",
    "/admin/teachers",
    "/admin/settings",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveURL(route, { timeout: 6_000 });
      // Should land on signin or setup
      const url = page.url();
      expect(url).toMatch(/signin|setup/i);
    });
  }
});

test.describe("Sign-in success (uses real credentials from setup)", () => {
  test("redirects to dashboard or home after successful sign-in", async ({
    page,
  }) => {
    await page.goto("/auth/signin");
    await page.fill('input[name="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[name="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(
      (url) => !url.pathname.includes("/auth/signin"),
      { timeout: 10_000 }
    );
    // Should be on a protected page, not signin
    expect(page.url()).not.toMatch(/signin/);
  });
});
