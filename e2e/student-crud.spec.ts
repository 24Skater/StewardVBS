import { test, expect } from "@playwright/test";

// Uses storageState: authenticated project depends on auth.setup.ts

const STUDENT_NAME = `E2E-Student-${Date.now()}`;

test.describe("Student CRUD", () => {
  test("lists student page without crashing", async ({ page }) => {
    await page.goto("/students");
    await expect(page).not.toHaveURL(/signin/, { timeout: 5_000 });
    // Either a list or an empty state — page must load
    await expect(page.locator("h1")).toBeVisible();
  });

  test("navigates to new student form", async ({ page }) => {
    await page.goto("/students/new");
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('select[name="category"]')).toBeVisible();
    await expect(page.locator('select[name="size"]')).toBeVisible();
  });

  test("new student form has photo consent checkbox", async ({ page }) => {
    await page.goto("/students/new");
    const checkbox = page.locator('input[name="photoConsent"]');
    await expect(checkbox).toBeVisible();
    await expect(checkbox).not.toBeChecked();
  });

  test("new student form has medical / allergy fields", async ({ page }) => {
    await page.goto("/students/new");
    await expect(page.locator('textarea[name="allergies"]')).toBeVisible();
    await expect(page.locator('textarea[name="medicalNotes"]')).toBeVisible();
  });

  test("shows validation error when required fields are missing", async ({
    page,
  }) => {
    await page.goto("/students/new");
    // Submit without filling required fields
    await page.click('button[type="submit"]');
    // HTML5 required validation or server-side error
    const nameInput = page.locator('input[name="name"]');
    const validity = await nameInput.evaluate(
      (el: HTMLInputElement) => el.validity.valid
    );
    expect(validity).toBe(false);
  });

  test("creates a student and lands on profile page", async ({ page }) => {
    await page.goto("/students/new");

    // Fill required fields
    await page.fill('input[name="name"]', STUDENT_NAME);

    // Select first available category (may not exist if no event active)
    const categorySelect = page.locator('select[name="category"]');
    const options = await categorySelect.locator("option").all();
    if (options.length > 1) {
      await categorySelect.selectOption({ index: 1 });
    } else {
      // No active event — skip the create test
      test.skip();
      return;
    }

    await page.locator('select[name="size"]').selectOption("YM");
    await page.check('input[name="photoConsent"]');

    await page.click('button[type="submit"]');

    // Should redirect to student profile
    await page.waitForURL(/\/students\/\d+/, { timeout: 10_000 });
    await expect(page.locator("body")).toContainText(STUDENT_NAME);
  });

  test("edit form pre-populates photoConsent from saved value", async ({
    page,
  }) => {
    // Navigate to students list and find the test student
    await page.goto("/students");
    const link = page.locator(`a:has-text("${STUDENT_NAME}")`).first();
    const exists = (await link.count()) > 0;
    if (!exists) {
      test.skip();
      return;
    }

    await link.click();
    // Should be on profile — navigate to edit
    await page.waitForURL(/\/students\/\d+/);
    await page.goto(page.url() + "/edit");

    const checkbox = page.locator('input[name="photoConsent"]');
    await expect(checkbox).toBeChecked();
  });
});
