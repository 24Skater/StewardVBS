import { test, expect } from '@playwright/test'

test('unauthenticated user is redirected away from /admin', async ({ page }) => {
  await page.goto('/admin')
  // Should redirect to signin or setup — not stay on /admin
  await expect(page).not.toHaveURL('/admin', { timeout: 5000 })
})

test('unauthenticated user is redirected away from /admin/users', async ({ page }) => {
  await page.goto('/admin/users')
  await expect(page).not.toHaveURL('/admin/users', { timeout: 5000 })
})
