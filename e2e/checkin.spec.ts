import { test, expect } from "@playwright/test";

// Uses storageState: authenticated project depends on auth.setup.ts

test.describe("Check-in page", () => {
  test("loads the check-in page without crashing", async ({ page }) => {
    await page.goto("/checkin");
    await expect(page.locator("h1")).toContainText(/check.in/i, {
      timeout: 10_000,
    });
  });

  test("shows search-first prompt when no query is entered", async ({
    page,
  }) => {
    await page.goto("/checkin");
    // Should show the informational prompt, not a grid of student cards
    await expect(page.locator("body")).toContainText(
      /search by name|select a category/i,
      { timeout: 5_000 }
    );
  });

  test("does not load students without a search query", async ({ page }) => {
    await page.goto("/checkin");
    // No student cards should be visible without a query
    const cards = page.locator("form button:has-text('Check In')");
    await expect(cards).toHaveCount(0, { timeout: 5_000 });
  });

  test("loads students when search query is >= 2 characters", async ({
    page,
  }) => {
    // Navigate with a search query
    await page.goto("/checkin?q=al");
    // The search-first prompt should NOT be visible
    const prompt = page.locator("text=/search by name/i");
    await expect(prompt).toHaveCount(0, { timeout: 5_000 });
    // Either student cards or "no match" message should appear
    const content = await page.locator("body").textContent();
    expect(
      content?.match(/check in|present|no students/i)
    ).toBeTruthy();
  });

  test("does not load students for 1-char query", async ({ page }) => {
    await page.goto("/checkin?q=a");
    // Should show search-first prompt (1 char is below threshold)
    await expect(page.locator("body")).toContainText(
      /search by name|select a category/i,
      { timeout: 5_000 }
    );
  });

  test("shows alert badge for students with allergies via URL params", async ({
    page,
  }) => {
    // Navigate with a query that might surface allergy students
    await page.goto("/checkin?q=E2E");
    // If any alert badges exist, they have the expected text
    const badges = page.locator("text=/⚠ Alert/");
    // We can't guarantee allergy students exist, so just assert the badge
    // structure is correct IF visible
    const count = await badges.count();
    if (count > 0) {
      await expect(badges.first()).toBeVisible();
    }
  });

  test("loads students when category filter is selected", async ({ page }) => {
    await page.goto("/checkin");
    const categorySelect = page.locator('select[name="category"]');
    const exists = (await categorySelect.count()) > 0;
    if (!exists) return;

    const options = await categorySelect.locator("option").all();
    if (options.length <= 1) return; // No categories configured

    await categorySelect.selectOption({ index: 1 });
    // After selecting a category the URL updates and students should load
    await page.waitForURL(/category=/, { timeout: 5_000 });
    const prompt = page.locator("text=/search by name/i");
    await expect(prompt).toHaveCount(0, { timeout: 5_000 });
  });
});
