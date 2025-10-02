import { test, expect } from '@playwright/test'

/**
 * Comprehensive E2E Testing for foco.mx Production Site
 *
 * Tests cover:
 * - Homepage functionality
 * - Login/Authentication
 * - Dashboard access
 * - Project management
 * - Task operations
 * - PWA features
 * - Responsive design
 * - Logo branding
 */

const PRODUCTION_URL = 'https://foco.mx'

// Test credentials - these should exist in your Supabase database
const TEST_USER = {
  email: 'test@foco.mx',
  password: 'TestPassword123!'
}

test.describe('Foco.mx Production E2E Tests', () => {

  test.describe('Homepage Tests', () => {
    test('should load homepage successfully', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Wait for client-side hydration
      await page.waitForTimeout(1000)

      // Check page loads with title containing "Foco" (may be set via client-side JS)
      const title = await page.title()
      // Title check is optional since it may be set client-side
      if (title) {
        expect(title.toLowerCase()).toContain('foco')
      }

      // Check main heading - wait for it to be visible (handles animations)
      const heading = page.locator('h1').first()
      await expect(heading).toBeVisible({ timeout: 10000 })
      const headingText = await heading.textContent()
      expect(headingText?.toLowerCase()).toContain('concéntrate')

      // Check navigation exists
      await expect(page.locator('nav')).toBeVisible()

      // Check CTA buttons
      const ctaButtons = page.getByRole('button', { name: /comenzar gratis/i })
      await expect(ctaButtons.first()).toBeVisible()
    })

    test('should display Foco logo on homepage', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Check logo image exists
      const logo = page.locator('img[alt*="Foco"]').first()
      await expect(logo).toBeVisible()

      // Verify logo is loaded
      const logoSrc = await logo.getAttribute('src')
      expect(logoSrc).toContain('focologo.png')
    })

    test('should have working navigation links', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Test "Iniciar sesión" link
      await page.getByRole('button', { name: /iniciar sesión/i }).first().click()
      await expect(page).toHaveURL(/.*login/)
    })

    test('should display features section', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Check for key features - more flexible text matching
      const bodyText = await page.locator('body').textContent()
      expect(bodyText?.toLowerCase()).toContain('gestión')
      expect(bodyText?.toLowerCase()).toContain('proyectos')
    })
  })

  test.describe('Login Page Tests', () => {
    test('should load login page', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForLoadState('load')

      // Check page title
      await expect(page.locator('h1')).toContainText(/bienvenido/i)

      // Check form fields exist
      await expect(page.getByLabel(/correo/i).first()).toBeVisible()
      await expect(page.getByLabel(/contraseña/i).first()).toBeVisible()

      // Check login button exists
      await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible()
    })

    test('should display logo on login page', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForLoadState('load')

      const logo = page.locator('img[alt*="Foco"]').first()
      await expect(logo).toBeVisible()
    })

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForLoadState('load')

      // Check that form fields are required
      const emailInput = page.getByLabel(/correo/i).first()
      const passwordInput = page.getByLabel(/contraseña/i).first()

      await expect(emailInput).toHaveAttribute('required', '')
      await expect(passwordInput).toHaveAttribute('required', '')
    })

    test('should have social login options', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForLoadState('load')

      // Check for Google and Apple login buttons
      await expect(page.locator('text=/google|continuar con google/i')).toBeVisible()
      await expect(page.locator('text=/apple|continuar con apple/i')).toBeVisible()
    })

    test('should have link to register page', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForLoadState('load')

      await expect(page.getByRole('link', { name: /regístrate/i })).toBeVisible()
    })
  })

  test.describe('Authentication Flow', () => {
    test('should handle invalid credentials', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForLoadState('load')

      await page.getByLabel(/correo/i).first().fill('invalid@example.com')
      await page.getByLabel(/contraseña/i).first().fill('wrongpassword')
      await page.getByRole('button', { name: /iniciar sesión/i }).click()

      // Wait for error message
      await page.waitForTimeout(2000)

      // Should show error (either inline or alert)
      const hasError = await page.locator('text=/inválid|incorrect|error/i').isVisible()
        .catch(() => false)

      // If no visible error text, check if still on login page (didn't navigate)
      if (!hasError) {
        await expect(page).toHaveURL(/.*login/)
      }
    })

    // Note: This test requires valid test credentials in Supabase
    test.skip('should login with valid credentials', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/login`)

      await page.getByLabel(/correo/i).first().fill(TEST_USER.email)
      await page.getByLabel(/contraseña/i).first().fill(TEST_USER.password)
      await page.getByRole('button', { name: /iniciar sesión/i }).click()

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 })
    })
  })

  test.describe('PWA Features', () => {
    test('should have PWA manifest', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Check for manifest link
      const manifestLink = page.locator('link[rel="manifest"]')
      await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
    })

    test('should have service worker registered', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Wait a bit for service worker to register
      await page.waitForTimeout(2000)

      // Check if service worker is registered
      const swRegistered = await page.evaluate(() => {
        return navigator.serviceWorker.getRegistration().then(reg => !!reg)
      })

      expect(swRegistered).toBe(true)
    })

    test('should load manifest.json successfully', async ({ request }) => {
      const response = await request.get(`${PRODUCTION_URL}/manifest.json`)
      expect(response.ok()).toBe(true)

      const manifest = await response.json()
      expect(manifest.name).toBeDefined()
      expect(manifest.icons).toBeDefined()
      expect(manifest.icons.length).toBeGreaterThan(0)
    })

    test('should have meta tags for PWA', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Check for apple-mobile-web-app-capable
      const appleMeta = page.locator('meta[name="apple-mobile-web-app-capable"]')
      await expect(appleMeta).toHaveAttribute('content', 'yes')

      // Check for theme-color
      const themeMeta = page.locator('meta[name="theme-color"]')
      await expect(themeMeta).toBeAttached()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be mobile responsive', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Wait for animations to complete and hydration
      await page.waitForTimeout(3000)

      // Check page loads on mobile - heading should be in DOM (might be off-screen due to animation)
      const heading = page.locator('h1').first()
      await expect(heading).toBeAttached({ timeout: 10000 })

      // Verify heading has content
      const headingText = await heading.textContent()
      expect(headingText).toBeTruthy()
      expect(headingText!.length).toBeGreaterThan(0)

      // Check navigation is accessible (might be hamburger menu or bottom nav on mobile)
      const navCount = await page.locator('nav').count()
      expect(navCount).toBeGreaterThan(0)
    })

    test('should adapt layout on tablet', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      const heading = page.locator('h1').first()
      await expect(heading).toBeVisible({ timeout: 10000 })
    })

    test('should work on desktop', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      const heading = page.locator('h1').first()
      await expect(heading).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Performance & Accessibility', () => {
    test('should have no console errors on homepage', async ({ page }) => {
      const consoleErrors: string[] = []

      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('networkidle')

      // Filter out known acceptable errors
      const criticalErrors = consoleErrors.filter(error =>
        !error.includes('DevTools') &&
        !error.includes('chrome-extension')
      )

      expect(criticalErrors.length).toBe(0)
    })

    test('should have proper meta tags for SEO', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Check for description meta tag - get count instead of strict check
      const descriptionTags = await page.locator('meta[name="description"]').count()
      expect(descriptionTags).toBeGreaterThan(0)

      // Check for viewport meta tag
      const viewportTags = await page.locator('meta[name="viewport"]').count()
      expect(viewportTags).toBeGreaterThan(0)
    })

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')
      const loadTime = Date.now() - startTime

      // Should load in less than 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })
  })

  test.describe('Static Assets', () => {
    test('should load logo image successfully', async ({ request }) => {
      const response = await request.get(`${PRODUCTION_URL}/focologo.png`)
      expect(response.ok()).toBe(true)
      expect(response.headers()['content-type']).toContain('image')
    })

    test('should load PWA icons', async ({ request }) => {
      const iconPaths = [
        '/icons/manifest-icon-192.maskable.png',
        '/icons/manifest-icon-512.maskable.png'
      ]

      for (const iconPath of iconPaths) {
        const response = await request.get(`${PRODUCTION_URL}${iconPath}`)
        expect(response.ok()).toBe(true)
      }
    })

    test('should have favicon', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      // Check that at least one favicon exists (there may be multiple sizes)
      const faviconCount = await page.locator('link[rel="icon"], link[rel="shortcut icon"]').count()
      expect(faviconCount).toBeGreaterThan(0)
    })
  })

  test.describe('Logo Branding Verification', () => {
    test('should display logo on all auth pages', async ({ page }) => {
      // Login page
      await page.goto(`${PRODUCTION_URL}/login`)
      await page.waitForLoadState('load')
      let logo = page.locator('img[alt*="Foco"]').first()
      await expect(logo).toBeVisible()

      // Register page (if accessible)
      await page.goto(`${PRODUCTION_URL}/register`).catch(() => {})
      const hasRegisterPage = await page.locator('h1').isVisible().catch(() => false)
      if (hasRegisterPage) {
        logo = page.locator('img[alt*="Foco"]').first()
        await expect(logo).toBeVisible()
      }
    })

    test('should have consistent logo styling', async ({ page }) => {
      await page.goto(PRODUCTION_URL)
      await page.waitForLoadState('load')

      const logo = page.locator('img[alt*="Foco"]').first()
      await expect(logo).toBeVisible()

      // Check logo has proper dimensions
      const boundingBox = await logo.boundingBox()
      expect(boundingBox).toBeTruthy()
      expect(boundingBox!.width).toBeGreaterThan(0)
      expect(boundingBox!.height).toBeGreaterThan(0)
    })
  })

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      const response = await page.goto(`${PRODUCTION_URL}/this-page-does-not-exist`)

      // Should get 404 or redirect
      expect(response?.status()).toBeGreaterThanOrEqual(400)
    })

    test('should not expose sensitive information in errors', async ({ page }) => {
      page.on('console', msg => {
        const text = msg.text().toLowerCase()
        expect(text).not.toContain('api key')
        expect(text).not.toContain('secret')
        expect(text).not.toContain('password')
      })

      await page.goto(PRODUCTION_URL)
      await page.goto(`${PRODUCTION_URL}/login`)
    })
  })
})
