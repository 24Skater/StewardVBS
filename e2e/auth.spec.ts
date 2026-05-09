import { test, expect } from '@playwright/test'

test.describe('Forgot password page', () => {
  test('renders form with email input', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await expect(page.locator('h1')).toContainText('Reset your password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows confirmation after form submit', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await page.fill('input[type="email"]', 'nobody@example.com')
    await page.click('button[type="submit"]')
    await expect(page.locator('h1')).toContainText('Check your email', { timeout: 5000 })
  })
})
