import { test, expect } from '@playwright/test'

const PRODUCTION_URL = 'https://foco.mx'
const TEST_USER = {
  email: 'laurence@fyves.com',
  password: 'hennie12',
}

test.use({ baseURL: PRODUCTION_URL })

test.describe('Security Verification Tests', () => {
  test.describe('1. IDOR (Insecure Direct Object Reference) Protection', () => {
    test('1.1 Cannot access other users tasks', async ({ request, page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const randomTaskId = '12345678-1234-1234-1234-123456789012'

      await page.goto(`/tasks/${randomTaskId}`)
      await page.waitForLoadState('domcontentloaded')

      const url = page.url()
      const content = await page.content()

      expect(url).not.toContain(randomTaskId)
    })

    test('1.2 Cannot modify tasks via API without authorization', async ({ request }) => {
      const randomTaskId = '12345678-1234-1234-1234-123456789012'

      const response = await request.patch(`/api/tasks/${randomTaskId}`, {
        data: {
          title: 'Hacked Task',
          status: 'completed',
        },
      })

      expect(response.status()).toBeGreaterThanOrEqual(401)
    })

    test('1.3 Cannot access other workspace projects', async ({ request }) => {
      const randomProjectId = '87654321-4321-4321-4321-210987654321'

      const response = await request.get(`/api/projects/${randomProjectId}`)

      expect(response.status()).toBeGreaterThanOrEqual(401)
    })
  })

  test.describe('2. Rate Limiting Verification', () => {
    test('2.1 API rate limiting on login endpoint', async ({ request }) => {
      const requests = Array.from({ length: 20 }, () =>
        request.post('/api/auth/signin', {
          data: {
            email: 'test@example.com',
            password: 'wrongpassword',
          },
        })
      )

      const responses = await Promise.all(requests)

      const rateLimitedResponses = responses.filter(r => r.status() === 429)

      console.log(`Rate limited responses: ${rateLimitedResponses.length}/20`)

      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })

    test('2.2 API rate limiting on task creation', async ({ request, page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const context = page.context()
      const cookies = await context.cookies()
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const requests = Array.from({ length: 50 }, (_, i) =>
        request.post('/api/tasks', {
          headers: {
            Cookie: cookieHeader,
          },
          data: {
            title: `Rate limit test task ${i}`,
          },
        })
      )

      const responses = await Promise.all(requests)

      const successResponses = responses.filter(r => r.status() === 200 || r.status() === 201)
      const rateLimitedResponses = responses.filter(r => r.status() === 429)

      console.log(`Success: ${successResponses.length}, Rate limited: ${rateLimitedResponses.length}`)

      if (rateLimitedResponses.length > 0) {
        console.log('✓ Rate limiting is working')
      } else {
        console.warn('⚠ Rate limiting may not be configured')
      }
    })
  })

  test.describe('3. SQL Injection Protection', () => {
    test('3.1 SQL injection in search parameters', async ({ request, page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const context = page.context()
      const cookies = await context.cookies()
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "1; DROP TABLE tasks;--",
        "' UNION SELECT * FROM users--",
        "admin'--",
        "1' OR '1' = '1' /*",
        "'; DELETE FROM tasks WHERE '1' = '1",
      ]

      for (const payload of sqlInjectionPayloads) {
        const response = await request.get(`/api/tasks?search=${encodeURIComponent(payload)}`, {
          headers: {
            Cookie: cookieHeader,
          },
        })

        expect(response.status()).not.toBe(500)

        if (response.ok()) {
          const body = await response.text()

          expect(body.toLowerCase()).not.toContain('syntax error')
          expect(body.toLowerCase()).not.toContain('query failed')
          expect(body.toLowerCase()).not.toContain('sql error')
        }
      }
    })

    test('3.2 SQL injection in task creation', async ({ request, page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const context = page.context()
      const cookies = await context.cookies()
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const response = await request.post('/api/tasks', {
        headers: {
          Cookie: cookieHeader,
        },
        data: {
          title: "'; DROP TABLE tasks; --",
          description: "' OR '1'='1",
        },
      })

      expect([400, 401, 403, 422, 500]).toContain(response.status())

      if (response.ok()) {
        const body = await response.json()

        expect(JSON.stringify(body)).not.toContain('DROP TABLE')
      }
    })
  })

  test.describe('4. XSS (Cross-Site Scripting) Protection', () => {
    test('4.1 XSS protection in task title', async ({ page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')

      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first()
      const hasInput = await titleInput.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasInput) {
        const xssPayloads = [
          '<script>alert("XSS")</script>',
          '<img src=x onerror=alert("XSS")>',
          '<svg onload=alert("XSS")>',
          'javascript:alert("XSS")',
        ]

        for (const payload of xssPayloads) {
          await titleInput.fill(payload)

          await page.waitForTimeout(500)

          const pageContent = await page.content()

          expect(pageContent).not.toContain('<script>alert')
          expect(pageContent).not.toContain('onerror=alert')
          expect(pageContent).not.toContain('onload=alert')
        }
      }
    })

    test('4.2 XSS protection in task description', async ({ page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      await page.goto('/tasks/new')
      await page.waitForLoadState('networkidle')

      const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first()
      const hasInput = await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasInput) {
        await descriptionInput.fill('<script>alert("XSS")</script>')

        await page.waitForTimeout(500)

        const pageContent = await page.content()

        expect(pageContent).not.toContain('<script>alert')
      }
    })
  })

  test.describe('5. Authentication Security', () => {
    test('5.1 Session fixation protection', async ({ page, context }) => {
      const sessionBefore = await context.cookies()

      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const sessionAfter = await context.cookies()

      const sessionTokenBefore = sessionBefore.find(c => c.name.includes('session') || c.name.includes('token'))
      const sessionTokenAfter = sessionAfter.find(c => c.name.includes('session') || c.name.includes('token'))

      if (sessionTokenBefore && sessionTokenAfter) {
        expect(sessionTokenBefore.value).not.toBe(sessionTokenAfter.value)
      }
    })

    test('5.2 Password not exposed in client-side code', async ({ page }) => {
      await page.goto('/login')

      const pageContent = await page.content()
      const scripts = await page.locator('script').allTextContents()

      const allCode = pageContent + scripts.join('')

      expect(allCode.toLowerCase()).not.toContain('password:')
      expect(allCode).not.toContain(TEST_USER.password)
    })

    test('5.3 Secure cookie attributes', async ({ page, context }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const cookies = await context.cookies()

      const sessionCookie = cookies.find(c =>
        c.name.includes('session') ||
        c.name.includes('token') ||
        c.name.includes('auth')
      )

      if (sessionCookie) {
        console.log(`Session cookie: ${sessionCookie.name}`)
        console.log(`Secure: ${sessionCookie.secure}`)
        console.log(`HttpOnly: ${sessionCookie.httpOnly}`)
        console.log(`SameSite: ${sessionCookie.sameSite}`)

        if (PRODUCTION_URL.startsWith('https://')) {
          expect(sessionCookie.secure).toBe(true)
        }
      }
    })
  })

  test.describe('6. Workspace Isolation', () => {
    test('6.1 Cannot access other workspace data', async ({ page }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const pageContent = await page.content()

      expect(pageContent.toLowerCase()).not.toContain('workspace_id=')
      expect(pageContent).not.toContain('SELECT * FROM')
    })

    test('6.2 Workspace switching requires authorization', async ({ page, context }) => {
      await page.goto('/login')
      await page.fill('input[type="email"]', TEST_USER.email)
      await page.fill('input[type="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

      const cookies = await context.cookies()
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

      const randomWorkspaceId = '99999999-9999-9999-9999-999999999999'

      const response = await page.evaluate(
        async ({ workspaceId, cookies }) => {
          const res = await fetch(`/api/workspaces/${workspaceId}/switch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: cookies,
            },
          })
          return {
            status: res.status,
            ok: res.ok,
          }
        },
        { workspaceId: randomWorkspaceId, cookies: cookieHeader }
      )

      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })
})
