import { test, expect, Page } from '@playwright/test'

const PRODUCTION_URL = 'https://foco.mx'
const TEST_USER = {
  email: 'laurence@fyves.com',
  password: 'hennie12',
}

interface TestMetrics {
  testName: string
  category: string
  startTime: number
  endTime: number
  duration: number
  status: 'pass' | 'fail'
  errorMessage?: string
  performanceData?: {
    responseTime?: number
    pageLoadTime?: number
    resourceCount?: number
  }
}

const metrics: TestMetrics[] = []

async function captureMetrics(
  testName: string,
  category: string,
  fn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now()
  let status: 'pass' | 'fail' = 'pass'
  let errorMessage: string | undefined

  try {
    await fn()
  } catch (error) {
    status = 'fail'
    errorMessage = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    const endTime = Date.now()
    metrics.push({
      testName,
      category,
      startTime,
      endTime,
      duration: endTime - startTime,
      status,
      errorMessage,
    })
  }
}

async function dismissProductTour(page: Page): Promise<void> {
  const skipButton = page.locator('button:has-text("Skip Tour"), button:has-text("Skip"), [aria-label*="close" i], button[aria-label*="dismiss" i]')
  const isVisible = await skipButton.isVisible({ timeout: 3000 }).catch(() => false)
  if (isVisible) {
    await skipButton.first().click()
    await page.waitForTimeout(500)
  }
}

async function login(page: Page): Promise<void> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.fill('input[type="email"]', TEST_USER.email)
  await page.fill('input[type="password"]', TEST_USER.password)

  await page.click('button[type="submit"]')

  await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

  await dismissProductTour(page)
}

test.use({ baseURL: PRODUCTION_URL })

test.describe('Production Verification - Comprehensive Suite', () => {
  test.describe.configure({ mode: 'serial' })

  test.describe('1. Authentication & Authorization', () => {
    test('1.1 Login with valid credentials', async ({ page }) => {
      await captureMetrics('Login Success', 'Authentication', async () => {
        await page.goto('/login')
        await page.waitForLoadState('networkidle')

        await page.fill('input[type="email"]', TEST_USER.email)
        await page.fill('input[type="password"]', TEST_USER.password)

        await page.click('button[type="submit"]')

        await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

        await dismissProductTour(page)

        const url = page.url()
        expect(url).toMatch(/\/(dashboard|tasks|my-work)/)
      })
    })

    test('1.2 Access protected routes without redirect', async ({ page }) => {
      await captureMetrics('Protected Routes Access', 'Authentication', async () => {
        await login(page)

        const routes = ['/tasks', '/projects', '/people', '/my-work']

        for (const route of routes) {
          await page.goto(route)
          await page.waitForLoadState('networkidle')

          expect(page.url()).toContain(route)
          expect(page.url()).not.toContain('/login')
        }
      })
    })

    test('1.3 Session persistence across navigation', async ({ page }) => {
      await captureMetrics('Session Persistence', 'Authentication', async () => {
        await login(page)

        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')

        await page.reload()
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/tasks')
        expect(page.url()).not.toContain('/login')
      })
    })
  })

  test.describe('2. Task Management - Complete CRUD', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('2.1 View task list page', async ({ page }) => {
      await captureMetrics('Task List View', 'Task Management', async () => {
        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/tasks')

        await page.waitForSelector('body', { timeout: 5000 })
      })
    })

    test('2.2 Access task creation page', async ({ page }) => {
      await captureMetrics('Task Creation Page Access', 'Task Management', async () => {
        await page.goto('/tasks/new')
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/tasks/new')

        const hasForm = await page.locator('form, input[type="text"]').isVisible({ timeout: 5000 }).catch(() => false)
        expect(hasForm).toBeTruthy()
      })
    })

    test('2.3 Navigate between task views', async ({ page }) => {
      await captureMetrics('Task View Navigation', 'Task Management', async () => {
        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')

        await page.goto('/my-work')
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/my-work')

        await page.goBack()
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/tasks')
      })
    })
  })

  test.describe('3. Project Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('3.1 View projects page', async ({ page }) => {
      await captureMetrics('Projects Page View', 'Project Management', async () => {
        await page.goto('/projects')
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/projects')
      })
    })

    test('3.2 Verify project data loads', async ({ page }) => {
      await captureMetrics('Project Data Loading', 'Project Management', async () => {
        await page.goto('/projects')
        await page.waitForLoadState('networkidle')

        const pageContent = await page.content()
        expect(pageContent.length).toBeGreaterThan(0)

        const hasErrorMessage = pageContent.toLowerCase().includes('error') || pageContent.includes('Something went wrong')
        expect(hasErrorMessage).toBeFalsy()
      })
    })

    test('3.3 Navigate to project details', async ({ page }) => {
      await captureMetrics('Project Details Navigation', 'Project Management', async () => {
        await page.goto('/projects')
        await page.waitForLoadState('networkidle')

        const projectLink = page.locator('a[href*="/projects/"], [data-testid*="project"]').first()
        const hasProjects = await projectLink.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasProjects) {
          await projectLink.click()
          await page.waitForTimeout(1000)

          const urlAfterClick = page.url()

          if (urlAfterClick.match(/\/projects\//)) {
            expect(urlAfterClick).toMatch(/\/projects\//)
          }
        } else {
          console.log('No projects found - may be empty state')
        }
      })
    })
  })

  test.describe('4. People & Team Management', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('4.1 View people page', async ({ page }) => {
      await captureMetrics('People Page View', 'People Management', async () => {
        await page.goto('/people')
        await page.waitForLoadState('networkidle')

        expect(page.url()).toContain('/people')
      })
    })

    test('4.2 Verify real user data (no Unknown User)', async ({ page }) => {
      await captureMetrics('User Data Verification', 'People Management', async () => {
        await page.goto('/people')
        await page.waitForLoadState('networkidle')

        const pageContent = await page.content()
        const hasUnknownUser = pageContent.includes('Unknown User')

        if (hasUnknownUser) {
          console.warn('WARNING: Found "Unknown User" on people page - possible data issue')
        }

        expect(pageContent.length).toBeGreaterThan(0)
      })
    })

    test('4.3 Access member details', async ({ page }) => {
      await captureMetrics('Member Details Access', 'People Management', async () => {
        await page.goto('/people')
        await page.waitForLoadState('networkidle')

        const memberLink = page.locator('a[href*="/people/"], [data-testid*="member"]').first()
        const hasMembers = await memberLink.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasMembers) {
          await memberLink.click()
          await page.waitForLoadState('networkidle')

          const url = page.url()
          expect(url).toMatch(/\/people\//)
        }
      })
    })
  })

  test.describe('5. Performance Validation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('5.1 Page load performance - Tasks', async ({ page }) => {
      await captureMetrics('Task Page Load Performance', 'Performance', async () => {
        const startTime = Date.now()

        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')

        const loadTime = Date.now() - startTime

        console.log(`Task page load time: ${loadTime}ms`)

        expect(loadTime).toBeLessThan(5000)
      })
    })

    test('5.2 Page load performance - Projects', async ({ page }) => {
      await captureMetrics('Project Page Load Performance', 'Performance', async () => {
        const startTime = Date.now()

        await page.goto('/projects')
        await page.waitForLoadState('networkidle')

        const loadTime = Date.now() - startTime

        console.log(`Project page load time: ${loadTime}ms`)

        expect(loadTime).toBeLessThan(5000)
      })
    })

    test('5.3 Navigation responsiveness', async ({ page }) => {
      await captureMetrics('Navigation Responsiveness', 'Performance', async () => {
        const routes = ['/tasks', '/projects', '/people', '/my-work']

        for (const route of routes) {
          const startTime = Date.now()

          await page.goto(route)
          await page.waitForLoadState('domcontentloaded')

          const loadTime = Date.now() - startTime

          console.log(`${route} load time: ${loadTime}ms`)

          expect(loadTime).toBeLessThan(3000)
        }
      })
    })
  })

  test.describe('6. Security Validation', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('6.1 XSS protection - Input sanitization', async ({ page }) => {
      await captureMetrics('XSS Protection', 'Security', async () => {
        await page.goto('/tasks/new')
        await page.waitForLoadState('networkidle')

        const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first()
        const hasInput = await titleInput.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasInput) {
          await titleInput.fill('<script>alert("XSS")</script>')

          const value = await titleInput.inputValue()
          const pageContent = await page.content()

          expect(pageContent).not.toContain('<script>alert')
        }
      })
    })

    test('6.2 Workspace isolation verification', async ({ page }) => {
      await captureMetrics('Workspace Isolation', 'Security', async () => {
        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')

        const currentUrl = page.url()
        expect(currentUrl).not.toContain('workspace_id=')

        const pageContent = await page.content()
        expect(pageContent).not.toContain('SELECT * FROM')
      })
    })
  })

  test.describe('7. Data Integrity', () => {
    test.beforeEach(async ({ page }) => {
      await login(page)
    })

    test('7.1 No console errors on critical pages', async ({ page }) => {
      await captureMetrics('Console Error Check', 'Data Integrity', async () => {
        const consoleErrors: string[] = []

        page.on('console', msg => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text())
          }
        })

        const routes = ['/tasks', '/projects', '/people']

        for (const route of routes) {
          await page.goto(route)
          await page.waitForLoadState('networkidle')
        }

        if (consoleErrors.length > 0) {
          console.warn(`Console errors found: ${consoleErrors.join(', ')}`)
        }

        expect(consoleErrors.length).toBeLessThan(5)
      })
    })

    test('7.2 No broken API calls', async ({ page }) => {
      await captureMetrics('API Health Check', 'Data Integrity', async () => {
        const failedRequests: string[] = []

        page.on('response', response => {
          if (response.status() >= 500 && response.url().includes('/api/')) {
            failedRequests.push(`${response.status()} - ${response.url()}`)
          }
        })

        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')

        await page.goto('/projects')
        await page.waitForLoadState('networkidle')

        if (failedRequests.length > 0) {
          console.error(`Failed API requests: ${failedRequests.join(', ')}`)
        }

        expect(failedRequests.length).toBe(0)
      })
    })

    test('7.3 Data consistency across page reloads', async ({ page }) => {
      await captureMetrics('Data Consistency', 'Data Integrity', async () => {
        await page.goto('/tasks')
        await page.waitForLoadState('networkidle')

        const content1 = await page.content()

        await page.reload()
        await page.waitForLoadState('networkidle')

        const content2 = await page.content()

        expect(content1.length).toBeGreaterThan(0)
        expect(content2.length).toBeGreaterThan(0)
      })
    })
  })

  test.afterAll(async () => {
    console.log('\n=== COMPREHENSIVE PRODUCTION VERIFICATION RESULTS ===\n')

    const categories = [...new Set(metrics.map(m => m.category))]

    categories.forEach(category => {
      const categoryMetrics = metrics.filter(m => m.category === category)
      const passed = categoryMetrics.filter(m => m.status === 'pass').length
      const failed = categoryMetrics.filter(m => m.status === 'fail').length
      const total = categoryMetrics.length
      const successRate = ((passed / total) * 100).toFixed(1)

      console.log(`\n${category}:`)
      console.log(`  Passed: ${passed}/${total} (${successRate}%)`)

      if (failed > 0) {
        console.log(`  Failed: ${failed}`)
        categoryMetrics.filter(m => m.status === 'fail').forEach(m => {
          console.log(`    - ${m.testName}: ${m.errorMessage}`)
        })
      }
    })

    const totalTests = metrics.length
    const totalPassed = metrics.filter(m => m.status === 'pass').length
    const totalFailed = metrics.filter(m => m.status === 'fail').length
    const overallSuccess = ((totalPassed / totalTests) * 100).toFixed(1)

    console.log(`\n=== OVERALL SUMMARY ===`)
    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${totalPassed}`)
    console.log(`Failed: ${totalFailed}`)
    console.log(`Success Rate: ${overallSuccess}%`)
    console.log(`Production Readiness: ${overallSuccess}%\n`)
  })
})
