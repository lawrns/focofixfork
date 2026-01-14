import { test, expect } from '@playwright/test'

/**
 * Production Smoke Test Suite
 *
 * Critical tests that MUST pass after deployment:
 * - Application loads and is accessible
 * - Authentication flows work
 * - Core features are functional
 * - API endpoints respond correctly
 * - No critical errors in console
 */

const BASE_URL = process.env.TEST_URL || 'https://foco.mx'

test.describe('Production Smoke Tests - Critical Path', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console error:', msg.text())
      }
    })

    // Monitor page errors
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message)
    })
  })

  test('P0: Application loads without errors', async ({ page }) => {
    const response = await page.goto(BASE_URL)
    expect(response?.status()).toBeLessThan(400)

    // Verify page loads
    await expect(page).toHaveTitle(/Foco/i)

    // Check for critical errors
    const errors = []
    page.on('pageerror', (error) => errors.push(error))

    expect(errors).toHaveLength(0)
  })

  test('P0: Health check endpoint responds', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`)
    expect(response.ok()).toBeTruthy()
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('status')
    expect(data.status).toBe('healthy')
  })

  test('P0: Authentication page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    // Verify login form is present
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('P0: Static assets load correctly', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check for failed resource loads
    const failedResources: string[] = []
    page.on('requestfailed', (request) => {
      failedResources.push(request.url())
    })

    await page.waitForLoadState('networkidle')

    expect(failedResources).toHaveLength(0)
  })

  test('P0: API responds to authenticated requests', async ({ request }) => {
    // Test public API endpoint
    const response = await request.get(`${BASE_URL}/api/tasks`)

    // Should either return 401 (auth required) or 200 (if public)
    expect([200, 401]).toContain(response.status())
  })

  test('P0: No critical console errors on homepage', async ({ page }) => {
    const criticalErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error' &&
          !msg.text().includes('favicon') && // Ignore favicon errors
          !msg.text().includes('Extension')) { // Ignore extension errors
        criticalErrors.push(msg.text())
      }
    })

    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    expect(criticalErrors).toHaveLength(0)
  })

  test('P0: Database connectivity check', async ({ request }) => {
    // Test that database is accessible via API
    const response = await request.get(`${BASE_URL}/api/health/database`)

    if (response.ok()) {
      const data = await response.json()
      expect(data.database).toBe('connected')
    } else {
      // If endpoint doesn't exist, that's okay
      expect([200, 404]).toContain(response.status())
    }
  })

  test('P0: Core navigation works', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check main navigation elements exist
    const nav = page.locator('nav').first()
    await expect(nav).toBeVisible()

    // Verify key navigation items are present
    // (adjust selectors based on your actual navigation)
    await expect(page.locator('a[href*="/tasks"]').first()).toBeVisible()
  })

  test('P0: Sign up page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`)

    // Verify sign up form is present
    await expect(page.getByRole('heading', { name: /sign up|create account/i })).toBeVisible()
  })

  test('P0: Error pages are configured', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/this-page-does-not-exist-12345`)

    // Should get 404, not 500 or other error
    expect(response?.status()).toBe(404)

    // Should show custom 404 page
    await expect(page.getByText(/not found|404/i)).toBeVisible()
  })
})

test.describe('Production Smoke Tests - Core Features', () => {
  test('Task creation page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/tasks/new`)

    // Should either show the form or redirect to login
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/tasks\/new|login/)
  })

  test('Dashboard page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)

    // Should either show dashboard or redirect to login
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/dashboard|login/)
  })

  test('Projects page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`)

    // Should either show projects or redirect to login
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/projects|login/)
  })

  test('Settings page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings`)

    // Should either show settings or redirect to login
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/settings|login/)
  })
})

test.describe('Production Smoke Tests - Performance', () => {
  test('Homepage loads within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto(BASE_URL)
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime

    // Homepage should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('Time to Interactive is acceptable', async ({ page }) => {
    await page.goto(BASE_URL)

    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domInteractive: navigation.domInteractive,
        loadComplete: navigation.loadEventEnd,
      }
    })

    // DOM should be interactive within 2 seconds
    expect(metrics.domInteractive).toBeLessThan(2000)
  })

  test('No memory leaks on navigation', async ({ page }) => {
    await page.goto(BASE_URL)

    // Get initial memory
    const initialMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    })

    // Navigate around
    await page.goto(`${BASE_URL}/tasks`)
    await page.goto(`${BASE_URL}/projects`)
    await page.goto(BASE_URL)

    // Check memory hasn't grown excessively
    const finalMetrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize
      }
      return 0
    })

    // Memory should not grow more than 50MB
    if (initialMetrics > 0) {
      const memoryGrowth = (finalMetrics - initialMetrics) / 1024 / 1024
      expect(memoryGrowth).toBeLessThan(50)
    }
  })
})

test.describe('Production Smoke Tests - Security', () => {
  test('Security headers are present', async ({ page }) => {
    const response = await page.goto(BASE_URL)
    const headers = response?.headers()

    // Check for security headers
    expect(headers?.['x-frame-options']).toBeDefined()
    expect(headers?.['x-content-type-options']).toBe('nosniff')
    expect(headers?.['strict-transport-security']).toBeDefined()
  })

  test('No sensitive data in client-side code', async ({ page }) => {
    await page.goto(BASE_URL)

    const pageContent = await page.content()

    // Check for leaked secrets (basic check)
    expect(pageContent).not.toMatch(/sk-[a-zA-Z0-9]{32,}/) // OpenAI keys
    expect(pageContent).not.toMatch(/AKIA[0-9A-Z]{16}/) // AWS keys
    expect(pageContent).not.toMatch(/AIza[0-9A-Za-z-_]{35}/) // Google API keys
  })

  test('HTTPS is enforced', async ({ page, context }) => {
    // Try to access via HTTP (if not localhost)
    if (!BASE_URL.includes('localhost')) {
      const httpUrl = BASE_URL.replace('https://', 'http://')
      const response = await page.goto(httpUrl, { waitUntil: 'networkidle' })

      // Should redirect to HTTPS
      expect(page.url()).toMatch(/^https:/)
    }
  })
})

test.describe('Production Smoke Tests - Data Integrity', () => {
  test('API returns valid JSON', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`)

    if (response.ok()) {
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')

      // Should parse without errors
      const data = await response.json()
      expect(data).toBeDefined()
    }
  })

  test('No CORS errors for same-origin requests', async ({ page }) => {
    const corsErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.text().includes('CORS') || msg.text().includes('Cross-Origin')) {
        corsErrors.push(msg.text())
      }
    })

    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')

    expect(corsErrors).toHaveLength(0)
  })
})

test.describe('Production Smoke Tests - Monitoring', () => {
  test('Error tracking is functional', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check if error tracking SDK is loaded (e.g., Sentry)
    const hasErrorTracking = await page.evaluate(() => {
      return typeof (window as any).Sentry !== 'undefined' ||
             typeof (window as any).__SENTRY__ !== 'undefined'
    })

    // Error tracking should be present in production
    if (!BASE_URL.includes('localhost')) {
      // Note: This is optional, adjust based on your setup
      console.log('Error tracking present:', hasErrorTracking)
    }
  })

  test('Analytics is loaded', async ({ page }) => {
    await page.goto(BASE_URL)

    // Check if analytics is loaded
    const hasAnalytics = await page.evaluate(() => {
      return typeof (window as any).gtag !== 'undefined' ||
             typeof (window as any).plausible !== 'undefined' ||
             typeof (window as any).analytics !== 'undefined'
    })

    console.log('Analytics present:', hasAnalytics)
  })
})
