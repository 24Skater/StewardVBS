import { test, expect } from "@playwright/test";

test.describe("Registration flow", () => {
  test("renders the register form", async ({ page }) => {
    await page.goto("/auth/register");
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("shows validation error for weak password", async ({ page }) => {
    await page.goto("/auth/register");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "weak");
    await page.click('button[type="submit"]');
    // Should show some form of error feedback
    await expect(page.locator("body")).toContainText(/password|invalid/i, {
      timeout: 5_000,
    });
  });

  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/auth/register");
    await page.fill('input[name="email"]', "not-an-email");
    await page.fill('input[name="password"]', "StrongPass1");
    await page.click('button[type="submit"]');
    await expect(page.locator("body")).toContainText(/email|invalid/i, {
      timeout: 5_000,
    });
  });

  test("rate limiting returns 429 after 10 rapid API requests", async ({
    request,
  }) => {
    const email = `rl-test-${Date.now()}@example.com`;
    const results: number[] = [];

    for (let i = 0; i < 12; i++) {
      const res = await request.post("/api/auth/register", {
        data: { email, password: "StrongPass1" },
      });
      results.push(res.status());
    }

    // At some point we must get a 429
    expect(results).toContain(429);
  });
});
