import { test, expect } from '@playwright/test'

test.describe('Complete User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/')
  })

  test('should complete full project creation workflow', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    
    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/)
    
    // Navigate to projects
    await page.click('a[href="/projects"]')
    await expect(page).toHaveURL(/\/projects/)
    
    // Create new project
    await page.click('button:has-text("Create project")')
    await page.fill('input[name="name"]', 'Test Project')
    await page.fill('textarea[name="description"]', 'Test Description')
    await page.click('button[type="submit"]')
    
    // Verify project created
    await expect(page.locator('text=Test Project')).toBeVisible()
  })

  test('should navigate through all main pages', async ({ page }) => {
    // Assuming user is logged in
    await page.goto('/dashboard')
    
    const routes = [
      { path: '/inbox', title: 'Inbox' },
      { path: '/my-work', title: 'My Work' },
      { path: '/projects', title: 'Projects' },
      { path: '/timeline', title: 'Timeline' },
      { path: '/people', title: 'People' },
      { path: '/reports', title: 'Reports' },
      { path: '/settings', title: 'Settings' },
    ]
    
    for (const route of routes) {
      await page.click(`a[href="${route.path}"]`)
      await expect(page).toHaveURL(new RegExp(route.path))
      await expect(page.locator(`h1:has-text("${route.title}")`)).toBeVisible()
    }
  })

  test('should use keyboard shortcuts', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test Cmd+K for search
    await page.keyboard.press('Meta+k')
    await expect(page.locator('input[placeholder*="search"]')).toBeVisible()
    
    // Close search
    await page.keyboard.press('Escape')
  })

  test('should handle empty states correctly', async ({ page }) => {
    await page.goto('/projects')
    
    // If no projects, should show empty state
    const projectCount = await page.locator('[data-testid="project-card"]').count()
    
    if (projectCount === 0) {
      await expect(page.locator('text=No projects')).toBeVisible()
      await expect(page.locator('button:has-text("Create")')).toBeVisible()
    }
  })

  test('should be accessible', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check for skip to main content link
    const skipLink = page.locator('a:has-text("Skip to main content")')
    await expect(skipLink).toBeInTheDocument()
    
    // Check for proper heading hierarchy
    const h1 = await page.locator('h1').count()
    expect(h1).toBeGreaterThan(0)
  })
})

test.describe('API Integration Tests', () => {
  test('should fetch projects from API', async ({ page }) => {
    await page.goto('/projects')
    
    // Wait for API call
    const response = await page.waitForResponse(
      response => response.url().includes('/api/projects') && response.status() === 200
    )
    
    expect(response.ok()).toBeTruthy()
    const data = await response.json()
    expect(data).toHaveProperty('success')
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/projects', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ success: false, error: 'Server error' }),
      })
    })
    
    await page.goto('/projects')
    
    // Should show error toast or message
    await expect(page.locator('text=Failed to load')).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Performance Tests', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('should have good LCP', async ({ page }) => {
    await page.goto('/dashboard')
    
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          resolve(lastEntry.renderTime || lastEntry.loadTime)
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        setTimeout(() => resolve(0), 5000)
      })
    })
    
    // LCP should be under 2.5s
    expect(lcp).toBeLessThan(2500)
  })
})
