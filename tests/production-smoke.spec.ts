import { test, expect } from '@playwright/test'

test.describe('Production Smoke Tests', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('ok', true)
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('environment')
  })

  test('homepage loads without errors', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // Listen for network errors
    const networkErrors: string[] = []
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push(`${response.status()} ${response.url()}`)
      }
    })

    await page.goto('/')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('bursts') &&
      !error.includes('favicon')
    )
    
    expect(criticalErrors).toHaveLength(0)
    
    // Check that page title is set
    const title = await page.title()
    expect(title).toBeTruthy()
    
    // Check that main content is visible
    await expect(page.locator('body')).toBeVisible()
  })

  test('login page loads without errors', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    // Check for critical errors
    const criticalErrors = consoleErrors.filter(error =>
      !error.includes('bursts') &&
      !error.includes('favicon')
    )
    
    expect(criticalErrors).toHaveLength(0)
    
    // Check that login form is visible
    await expect(page.locator('form')).toBeVisible()
  })

  test('crypto API stubs return 204', async ({ request }) => {
    const cryptoEndpoints = [
      '/api/bursts?symbol=BTCUSDT&hours=24&minMagnitude=100000'
    ]

    for (const endpoint of cryptoEndpoints) {
      const response = await request.get(endpoint)
      expect(response.status()).toBe(204)
    }
  })

  test('service worker is not registered when disabled', async ({ page }) => {
    // Set environment variable to disable service worker
    await page.addInitScript(() => {
      // @ts-ignore
      window.process = window.process || { env: { NEXT_PUBLIC_SW_ENABLED: 'false' } }
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Check that no service worker is registered
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker.getRegistration()
    })

    expect(swRegistration).toBeNull()
  })

  test('analytics events endpoint works', async ({ request }) => {
    const testEvent = {
      id: 'test-event',
      type: 'test',
      category: 'user_action',
      action: 'test',
      sessionId: 'test-session',
      page: '/',
      timestamp: Date.now()
    }

    const response = await request.post('/api/analytics/events', {
      data: { events: [testEvent] }
    })

    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('received', 1)
  })
})

test.describe('Authentication Flow', () => {
  test('unauthenticated API calls return 401', async ({ request }) => {
    const protectedEndpoints = [
      '/api/organizations',
      '/api/projects',
      '/api/tasks'
    ]

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint)
      expect(response.status()).toBe(401)
      
      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data.error).toHaveProperty('code', 'AUTH_REQUIRED')
    }
  })
})
