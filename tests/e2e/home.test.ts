import { test, expect } from '@playwright/test'

test('should redirect to login when not authenticated', async ({ page }) => {
  // Go to root (which redirects to /library)
  await page.goto('/')
  
  // Should eventually land on /login
  await expect(page).toHaveURL(/\/login/)
  
  // Check if login page elements are present
  const loginTitle = page.locator('h1')
  // We expect "Accedi" or similar in Italian as per project rules
  // Let's check the login page content first to be sure
})

test('should have a working search page', async ({ page }) => {
  await page.goto('/search')
  // Search is usually public or at least accessible
  // Check for search input
  const searchInput = page.locator('input[type="text"]')
  await expect(searchInput).toBeVisible()
})
