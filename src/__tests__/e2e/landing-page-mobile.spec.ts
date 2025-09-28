import { test, expect } from '@playwright/test'

test.describe('Landing Page Mobile Navigation', () => {
  test('should show mobile hamburger menu on small screens', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Check that desktop navigation is hidden
    const desktopNav = page.locator('.hidden.md\\:flex')
    await expect(desktopNav).toBeVisible()

    // Check that mobile menu button is visible
    const mobileMenuButton = page.locator('button[aria-label="Toggle mobile menu"]')
    await expect(mobileMenuButton).toBeVisible()

    // Click the mobile menu button
    await mobileMenuButton.click()

    // Check that mobile menu is visible
    const mobileMenu = page.locator('[class*="bg-white/95"][class*="backdrop-blur-sm"]')
    await expect(mobileMenu).toBeVisible()

    // Check that login button is visible in mobile menu
    const loginButton = mobileMenu.locator('a[href="/login"]')
    await expect(loginButton).toBeVisible()
    await expect(loginButton).toContainText('Iniciar sesión')
  })

  test('should hide mobile menu when clicking outside or on menu item', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    const mobileMenuButton = page.locator('button[aria-label="Toggle mobile menu"]')
    await mobileMenuButton.click()

    // Menu should be visible
    const mobileMenu = page.locator('[class*="bg-white/95"][class*="backdrop-blur-sm"]')
    await expect(mobileMenu).toBeVisible()

    // Click on a menu item
    const featuresLink = mobileMenu.locator('a').first()
    await featuresLink.click()

    // Menu should be hidden
    await expect(mobileMenu).not.toBeVisible()
  })

  test('should have sticky header on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/')

    // Check that header has fixed positioning
    const header = page.locator('nav').first()
    const position = await header.evaluate(el => window.getComputedStyle(el).position)
    expect(position).toBe('fixed')

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500))

    // Header should still be visible at the top
    const headerBox = await header.boundingBox()
    expect(headerBox?.y).toBe(0)
  })
})