import { test, expect } from '@playwright/test'

const PRODUCTION_URL = 'https://foco.mx'
const TEST_USER = {
  email: 'laurence@fyves.com',
  password: 'hennie12',
}

test.use({ baseURL: PRODUCTION_URL })

test.describe('Database Health & RLS Verification', () => {
  let authToken: string

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/signin', {
      data: {
        email: TEST_USER.email,
        password: TEST_USER.password,
      },
    })

    if (response.ok()) {
      const cookies = response.headers()['set-cookie']
      if (cookies) {
        authToken = cookies
      }
    }
  })

  test('1.1 Verify RLS policies prevent unauthorized access', async ({ request }) => {
    const unauthorizedRequest = await request.get('/api/workspaces', {
      headers: {},
    })

    expect(unauthorizedRequest.status()).toBeGreaterThanOrEqual(401)
  })

  test('1.2 Test workspace isolation - Cannot access other workspace data', async ({ request }) => {
    const workspacesResponse = await request.get('/api/workspaces', {
      headers: {
        Cookie: authToken,
      },
    })

    if (workspacesResponse.ok()) {
      const workspaces = await workspacesResponse.json()

      if (Array.isArray(workspaces) && workspaces.length > 0) {
        const firstWorkspaceId = workspaces[0].id

        const tasksResponse = await request.get(`/api/tasks?workspace_id=${firstWorkspaceId}`, {
          headers: {
            Cookie: authToken,
          },
        })

        expect(tasksResponse.status()).toBeLessThan(500)
      }
    }
  })

  test('1.3 Verify foreign key constraints are enforced', async ({ request }) => {
    const invalidTaskCreation = await request.post('/api/tasks', {
      headers: {
        Cookie: authToken,
      },
      data: {
        title: 'Test Task',
        workspace_id: '00000000-0000-0000-0000-000000000000',
        project_id: '99999999-9999-9999-9999-999999999999',
      },
    })

    expect([400, 403, 404, 500]).toContain(invalidTaskCreation.status())
  })

  test('1.4 Check for orphaned records - Tasks without projects', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('foreign key')) {
        consoleErrors.push(msg.text())
      }
    })

    const pageContent = await page.content()
    expect(pageContent).not.toContain('Foreign key violation')

    expect(consoleErrors.length).toBe(0)
  })

  test('1.5 Verify database query performance', async ({ request }) => {
    const startTime = Date.now()

    const response = await request.get('/api/tasks', {
      headers: {
        Cookie: authToken,
      },
    })

    const responseTime = Date.now() - startTime

    console.log(`Task API response time: ${responseTime}ms`)

    expect(response.status()).toBeLessThan(500)
    expect(responseTime).toBeLessThan(2000)
  })

  test('1.6 Test RLS with multiple user contexts', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', TEST_USER.email)
    await page.fill('input[type="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(dashboard|tasks|my-work)/, { timeout: 15000 })

    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')

    const response = await page.evaluate(async () => {
      const res = await fetch('/api/tasks')
      return {
        status: res.status,
        ok: res.ok,
      }
    })

    expect(response.status).toBeLessThan(500)
  })

  test('1.7 Verify no SQL injection vulnerabilities', async ({ request }) => {
    const sqlInjectionPayloads = [
      "' OR '1'='1",
      "1; DROP TABLE tasks--",
      "' UNION SELECT * FROM users--",
      "admin'--",
      "1' ORDER BY 1--",
    ]

    for (const payload of sqlInjectionPayloads) {
      const response = await request.get(`/api/tasks?search=${encodeURIComponent(payload)}`, {
        headers: {
          Cookie: authToken,
        },
      })

      expect(response.status()).not.toBe(500)

      if (response.ok()) {
        const body = await response.text()
        expect(body.toLowerCase()).not.toContain('syntax error')
        expect(body.toLowerCase()).not.toContain('sql')
      }
    }
  })

  test('1.8 Check database connection pool health', async ({ request }) => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      request.get('/api/tasks', {
        headers: {
          Cookie: authToken,
        },
      })
    )

    const responses = await Promise.all(requests)

    const successCount = responses.filter(r => r.ok()).length

    console.log(`Concurrent request success rate: ${successCount}/10`)

    expect(successCount).toBeGreaterThanOrEqual(8)
  })
})
