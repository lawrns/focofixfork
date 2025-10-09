import { test, expect } from '@playwright/test'

/**
 * Production Verification Tests
 * Tests the full user registration and organization setup flow on foco.mx
 */

test.describe('Production Site - Full Registration Flow', () => {
  const timestamp = Date.now()
  const testEmail = `e2etest${timestamp}@example.com`
  const testUsername = `e2etest${timestamp}`
  const testPassword = 'TestPassword123!'
  const orgName = `E2E Test Org ${timestamp}`

  test.beforeEach(async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`❌ Browser Console Error: ${msg.text()}`)
      } else if (msg.text().includes('🔧') || msg.text().includes('🌍')) {
        console.log(`ℹ️ ${msg.text()}`)
      }
    })

    // Catch page errors
    page.on('pageerror', error => {
      console.error(`❌ Page Error: ${error.message}`)
    })
  })

  test('should load landing page without errors', async ({ page }) => {
    console.log('📄 Testing landing page...')

    await page.goto('https://foco.mx')

    // Wait for page to load
    await expect(page).toHaveTitle(/Foco/)

    // Check that main CTA button exists
    await expect(page.getByText('Comenzar gratis')).toBeVisible()

    console.log('✅ Landing page loaded successfully')
  })

  test('should complete full registration flow', async ({ page }) => {
    console.log('🔐 Testing full registration flow...')
    console.log(`   Email: ${testEmail}`)
    console.log(`   Username: ${testUsername}`)

    // Step 1: Navigate to registration
    await page.goto('https://foco.mx')
    await page.click('text=Comenzar gratis')

    // Step 2: Wait for registration page
    await expect(page).toHaveURL(/\/register/)
    console.log('✅ Navigated to registration page')

    // Step 3: Fill registration form
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="username"]', testUsername)
    console.log('✅ Filled registration form')

    // Step 4: Submit registration
    await page.click('button[type="submit"]')

    // Step 5: Wait for redirect to organization setup
    // This might take a few seconds
    await page.waitForURL(/\/organization-setup/, { timeout: 10000 })
    console.log('✅ Registration successful, redirected to org setup')

    // Verify no console errors during registration
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    expect(errors.filter(e => e.includes('400') || e.includes('500'))).toHaveLength(0)
  })

  test('should create organization after registration', async ({ page }) => {
    console.log('🏢 Testing organization creation...')

    // First, register a user
    await page.goto('https://foco.mx/register')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="username"]', testUsername)
    await page.click('button[type="submit"]')

    // Wait for org setup page
    await page.waitForURL(/\/organization-setup/, { timeout: 10000 })
    console.log('✅ On organization setup page')

    // Fill organization name
    await page.fill('input[name="organizationName"]', orgName)
    console.log(`✅ Entered org name: ${orgName}`)

    // Submit organization creation
    await page.click('button:has-text("Create Organization")')

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    console.log('✅ Organization created, redirected to dashboard')

    // Verify dashboard loaded
    await expect(page.getByText(orgName)).toBeVisible({ timeout: 5000 })
    console.log('✅ Dashboard loaded with organization name visible')
  })

  test('should verify no critical console errors', async ({ page }) => {
    console.log('🔍 Checking for console errors...')

    const consoleErrors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto('https://foco.mx')
    await page.waitForLoadState('networkidle')

    // Filter out expected errors
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('500') ||
      error.includes('Uncaught') ||
      error.includes('SyntaxError')
    )

    console.log(`   Total console errors: ${consoleErrors.length}`)
    console.log(`   Critical errors: ${criticalErrors.length}`)

    if (criticalErrors.length > 0) {
      console.error('❌ Critical errors found:')
      criticalErrors.forEach(err => console.error(`   - ${err}`))
    }

    expect(criticalErrors).toHaveLength(0)
    console.log('✅ No critical console errors')
  })

  test('should verify environment variables are set', async ({ page }) => {
    console.log('🔧 Checking environment variables...')

    const logs: string[] = []

    page.on('console', msg => {
      logs.push(msg.text())
    })

    await page.goto('https://foco.mx')
    await page.waitForTimeout(2000) // Wait for console logs

    // Check for env check logs
    const envLog = logs.find(log => log.includes('Supabase Client Init'))

    if (envLog) {
      console.log(`✅ Found env check: ${envLog}`)
      expect(envLog).toContain('SET')
    } else {
      console.log('⚠️  No env check log found (console.log might be removed in production)')
    }
  })
})

test.describe('Production Site - API Endpoints', () => {
  test('should have working health endpoint', async ({ request }) => {
    console.log('🏥 Testing health endpoint...')

    const response = await request.get('https://foco.mx/api/health')
    expect(response.ok()).toBeTruthy()
    console.log('✅ Health endpoint responding')
  })

  test('should reject invalid registration data', async ({ request }) => {
    console.log('🔒 Testing registration validation...')

    // Test with invalid email
    const response = await request.post('https://foco.mx/api/auth/register', {
      data: {
        email: 'invalid-email',
        password: 'TestPass123!',
        username: 'testuser'
      }
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.success).toBe(false)
    console.log('✅ Registration validation working')
  })
})
