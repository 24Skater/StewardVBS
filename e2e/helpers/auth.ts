import { Page } from "@playwright/test";

export const TEST_ADMIN_EMAIL = "e2e-admin@vbs-test.local";
export const TEST_ADMIN_PASSWORD = "TestAdmin1!";

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/auth/signin");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from signin
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"), {
    timeout: 10_000,
  });
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
}
