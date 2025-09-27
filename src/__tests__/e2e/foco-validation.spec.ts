/**
 * Foco Application Comprehensive Validation Suite
 *
 * This Playwright test suite validates all claims about the Foco application
 * and identifies shortcomings that need to be fixed.
 */

import { test, expect, Page } from '@playwright/test'

test.describe('Foco Application - Complete Validation', () => {
  test.setTimeout(120000) // 2 minutes timeout

  // Test data
  const testCredentials = {
    email: 'laurence@fyves.com',
    password: 'Hennie@@12'
  }

  test.beforeEach(async ({ page }) => {
    // Set longer timeout for navigation
    page.setDefaultTimeout(30000)
  })

  test('1. Landing Page - Should display Foco branding and navigation', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check for Foco branding
    const hasFocoBranding = await page.locator('text=/foco|Foco/i').count() > 0
    console.log('✅ Foco branding found:', hasFocoBranding)

    // Check for navigation elements
    const hasLoginButton = await page.locator('text=/sign in|login/i').count() > 0
    const hasRegisterButton = await page.locator('text=/sign up|register/i').count() > 0

    console.log('✅ Login button found:', hasLoginButton)
    console.log('✅ Register button found:', hasRegisterButton)

    // Take screenshot for evidence
    await page.screenshot({ path: 'test-results/01-landing-page.png', fullPage: true })

    // Validate page title
    const title = await page.title()
    console.log('📄 Page title:', title)

    expect(title).toContain('Foco')
  })

  test('2. Authentication Flow - Login with provided credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check if we're already on login page or redirected
    const currentUrl = page.url()
    console.log('🔗 Current URL:', currentUrl)

    if (currentUrl.includes('/dashboard')) {
      console.log('ℹ️ Already logged in, proceeding to dashboard validation')
      return
    }

    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first()
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
    const loginButton = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first()

    // Check if elements exist
    const emailExists = await emailInput.count() > 0
    const passwordExists = await passwordInput.count() > 0
    const buttonExists = await loginButton.count() > 0

    console.log('📧 Email input found:', emailExists)
    console.log('🔒 Password input found:', passwordExists)
    console.log('🔘 Login button found:', buttonExists)

    if (emailExists && passwordExists && buttonExists) {
      await emailInput.fill(testCredentials.email)
      await passwordInput.fill(testCredentials.password)
      await loginButton.click()

      // Wait for navigation or error
      await page.waitForTimeout(3000)

      const newUrl = page.url()
      console.log('🔗 After login URL:', newUrl)

      // Take screenshot
      await page.screenshot({ path: 'test-results/02-login-attempt.png', fullPage: true })

      // Check if login was successful (dashboard redirect) or failed
      const isOnDashboard = newUrl.includes('/dashboard')
      const hasError = await page.locator('text=/invalid|error|failed/i').count() > 0

      console.log('✅ Login successful (dashboard):', isOnDashboard)
      console.log('❌ Login error:', hasError)
    } else {
      console.log('❌ Login form elements not found - taking screenshot for debugging')
      await page.screenshot({ path: 'test-results/02-login-form-missing.png', fullPage: true })
    }
  })

  test('3. Dashboard - Validate core functionality', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('http://localhost:3000/dashboard')

    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/03-dashboard-direct.png', fullPage: true })

    const currentUrl = page.url()
    console.log('🔗 Dashboard URL:', currentUrl)

    // Check if redirected to login (not authenticated)
    if (currentUrl.includes('/login')) {
      console.log('🔒 Dashboard requires authentication - redirected to login')
      return
    }

    // Validate dashboard elements
    const headerExists = await page.locator('header, nav').count() > 0
    const sidebarExists = await page.locator('aside, .sidebar').count() > 0

    console.log('📋 Header found:', headerExists)
    console.log('📊 Sidebar found:', sidebarExists)

    // Check for view buttons (Table, Kanban, Gantt only - no AI/Team/Auto)
    const tableView = await page.locator('button:has-text("Table"), [data-view="table"]').count() > 0
    const kanbanView = await page.locator('button:has-text("Kanban"), [data-view="kanban"]').count() > 0
    const ganttView = await page.locator('button:has-text("Gantt"), [data-view="gantt"]').count() > 0

    // Check for removed buttons (should not exist)
    const aiView = await page.locator('button:has-text("AI"), [data-view="ai"]').count() > 0
    const teamView = await page.locator('button:has-text("Team"), [data-view="team"]').count() > 0
    const autoView = await page.locator('button:has-text("Auto"), [data-view="auto"]').count() > 0

    console.log('📊 Table view button:', tableView)
    console.log('📋 Kanban view button:', kanbanView)
    console.log('📅 Gantt view button:', ganttView)
    console.log('🚫 AI view button (should be removed):', aiView)
    console.log('🚫 Team view button (should be removed):', teamView)
    console.log('🚫 Auto view button (should be removed):', autoView)

    // Check for main content
    const mainContent = await page.locator('main').count() > 0
    console.log('📄 Main content area:', mainContent)
  })

  test('4. Projects Page - Validate project management', async ({ page }) => {
    await page.goto('http://localhost:3000/projects')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/04-projects-page.png', fullPage: true })

    const currentUrl = page.url()
    console.log('🔗 Projects URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('🔒 Projects page requires authentication')
      return
    }

    // Check for project-related elements
    const createProjectButton = await page.locator('button:has-text("Create"), button:has-text("New"), [data-action="create-project"]').count() > 0
    const projectList = await page.locator('.project-card, .project-item, [data-type="project"]').count()
    const projectTable = await page.locator('table').count() > 0

    console.log('➕ Create project button:', createProjectButton)
    console.log('📋 Project items found:', projectList)
    console.log('📊 Project table:', projectTable)

    // If projects exist, try to click on one
    if (projectList > 0) {
      const firstProject = page.locator('.project-card, .project-item, [data-type="project"]').first()
      await firstProject.screenshot({ path: 'test-results/04-first-project.png' })
    }
  })

  test('5. Organizations Page - Validate organization management', async ({ page }) => {
    await page.goto('http://localhost:3000/organizations')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/05-organizations-page.png', fullPage: true })

    const currentUrl = page.url()
    console.log('🔗 Organizations URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('🔒 Organizations page requires authentication')
      return
    }

    // Check for organization elements
    const createOrgButton = await page.locator('button:has-text("Create Organization"), [data-action="create-org"]').count() > 0
    const orgList = await page.locator('.org-card, .organization-item, [data-type="organization"]').count()

    console.log('🏢 Create organization button:', createOrgButton)
    console.log('🏢 Organization items found:', orgList)
  })

  test('6. Milestones Page - Validate milestone management', async ({ page }) => {
    await page.goto('http://localhost:3000/milestones')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/06-milestones-page.png', fullPage: true })

    const currentUrl = page.url()
    console.log('🔗 Milestones URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('🔒 Milestones page requires authentication')
      return
    }

    // Check for milestone elements
    const milestoneList = await page.locator('.milestone-card, .milestone-item, [data-type="milestone"]').count()
    const statusBadges = await page.locator('[data-status], .status-badge').count()

    console.log('🎯 Milestone items found:', milestoneList)
    console.log('🏷️ Status badges found:', statusBadges)
  })

  test('7. Settings Page - Validate user settings', async ({ page }) => {
    await page.goto('http://localhost:3000/settings')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: 'test-results/07-settings-page.png', fullPage: true })

    const currentUrl = page.url()
    console.log('🔗 Settings URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('🔒 Settings page requires authentication')
      return
    }

    // Check for settings elements
    const profileTab = await page.locator('button:has-text("Profile"), [data-tab="profile"]').count() > 0
    const preferencesTab = await page.locator('button:has-text("Preferences"), [data-tab="preferences"]').count() > 0
    const themeToggle = await page.locator('button:has-text("Dark"), button:has-text("Light"), [data-theme-toggle]').count() > 0

    console.log('👤 Profile settings:', profileTab)
    console.log('⚙️ Preferences settings:', preferencesTab)
    console.log('🌙 Theme toggle:', themeToggle)
  })

  test('8. API Health Check - Validate backend connectivity', async ({ page }) => {
    const healthResponse = await page.request.get('http://localhost:3000/api/health')

    console.log('🏥 Health check status:', healthResponse.status())

    if (healthResponse.status() === 200) {
      const healthData = await healthResponse.json()
      console.log('🏥 Health check data:', JSON.stringify(healthData, null, 2))
    } else {
      console.log('❌ Health check failed')
    }
  })

  test('9. Performance Validation - Check load times and responsiveness', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    const loadTime = Date.now() - startTime
    console.log('⚡ Page load time:', loadTime, 'ms')

    // Check for performance issues
    const largeImages = await page.locator('img').evaluateAll(imgs =>
      imgs.filter(img => {
        const rect = img.getBoundingClientRect()
        return rect.width > 1000 || rect.height > 1000
      }).length
    )

    console.log('🖼️ Large images found:', largeImages)

    // Validate responsive design
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/09-mobile-view.png' })

    await page.setViewportSize({ width: 1920, height: 1080 }) // Desktop
    await page.waitForTimeout(1000)
    await page.screenshot({ path: 'test-results/09-desktop-view.png' })

    console.log('📱 Responsive design tested')
  })

  test('10. Accessibility Validation - Basic accessibility checks', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check for basic accessibility issues
    const imagesWithoutAlt = await page.locator('img:not([alt]), img[alt=""]').count()
    const buttonsWithoutAriaLabel = await page.locator('button:not([aria-label])').count()
    const buttonsWithText = await page.locator('button').filter({ hasText: /.+/ }).count()
    const buttonsWithoutText = buttonsWithoutAriaLabel - buttonsWithText

    const linksWithoutAriaLabel = await page.locator('a:not([aria-label])').count()
    const linksWithText = await page.locator('a').filter({ hasText: /.+/ }).count()
    const linksWithoutText = linksWithoutAriaLabel - linksWithText

    console.log('♿ Images without alt text:', imagesWithoutAlt)
    console.log('♿ Buttons without text/label:', buttonsWithoutText)
    console.log('♿ Links without text/label:', linksWithoutText)

    // Check for heading hierarchy
    const h1Count = await page.locator('h1').count()
    const h2Count = await page.locator('h2').count()

    console.log('📝 H1 headings:', h1Count)
    console.log('📝 H2 headings:', h2Count)

    // Take accessibility-focused screenshot
    await page.screenshot({ path: 'test-results/10-accessibility-check.png' })
  })

  test('11. Branding Validation - Confirm Foco identity', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Search for any Foco branding
    const focoReferences = await page.locator('text=/foco|Foco/i').allTextContents()
    const title = await page.title()
    const metaDescription = await page.locator('meta[name="description"]').getAttribute('content')

    console.log('🎨 Foco references found:', focoReferences.length)
    console.log('📄 Page title:', title)
    console.log('📝 Meta description:', metaDescription)

    // Check for other branding that might exist
    const otherBrandings = await page.locator('text=/bien|Bien|crico|Crico/i').allTextContents()
    console.log('🔍 Other brandings found:', otherBrandings)

    await page.screenshot({ path: 'test-results/11-branding-check.png', fullPage: true })
  })

  test('12. Feature Completeness - Check for claimed features', async ({ page }) => {
    // This test validates all the features claimed to exist
    // First login, then navigate to dashboard to check for features
    await page.goto('http://localhost:3000/login')

    // Fill login form
    await page.fill('input[data-testid="email-input"]', 'laurence@fyves.com')
    await page.fill('input[data-testid="password-input"]', 'Hennie@@12')
    await page.click('button[data-testid="login-button"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')

    const features = [
      { name: 'Dashboard with view buttons', selector: 'button:has-text("Table"), button:has-text("Kanban"), button:has-text("Gantt"), .view-tabs button' },
      { name: 'Search functionality', selector: 'input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]' },
      { name: 'User menu', selector: 'button:has-text("Profile"), button:has-text("Settings"), .user-dropdown' },
      { name: 'Navigation sidebar', selector: 'aside, .sidebar, nav.sidebar, .main-sidebar' },
      { name: 'Project creation', selector: 'button:has-text("New Project"), button:has-text("Create"), .create-project' },
      { name: 'AI Assistant', selector: '.lucide-bot, .ai-assistant, button[aria-label*="AI"], button[title*="AI"]' },
      { name: 'Time Tracking', selector: '.time-tracker, .timer, button:has-text("Start"), .time-tracking' },
      { name: 'File Upload', selector: 'input[type="file"], .file-upload, button:has-text("Upload"), .file-uploader' },
      { name: 'Import/Export', selector: 'button:has-text("Import"), button:has-text("Export")' },
      { name: 'Notifications', selector: '.lucide-bell, .notification, .bell, button:has-text("Notifications"), .notification-center' }
    ]

    console.log('🔍 Feature completeness check:')

    for (const feature of features) {
      const exists = await page.locator(feature.selector).count() > 0
      console.log(`  ${exists ? '✅' : '❌'} ${feature.name}: ${exists ? 'Found' : 'Missing'}`)
    }

    await page.screenshot({ path: 'test-results/12-feature-completeness.png', fullPage: true })
  })

  test('13. Data Connectivity - Verify database integration', async ({ page }) => {
    // Try to access authenticated routes and see if data loads
    await page.goto('http://localhost:3000/dashboard')

    if (page.url().includes('/login')) {
      console.log('🔒 Cannot test data connectivity - authentication required')
      return
    }

    await page.waitForTimeout(2000) // Wait for data to load

    // Check for data loading indicators
    const loadingIndicators = await page.locator('.loading, .spinner, [data-loading]').count()
    const errorMessages = await page.locator('text=/error|failed|unable/i').count()
    const dataElements = await page.locator('.project-card, .milestone-item, .org-item, [data-item]').count()

    console.log('⏳ Loading indicators:', loadingIndicators)
    console.log('❌ Error messages:', errorMessages)
    console.log('📊 Data elements found:', dataElements)

    await page.screenshot({ path: 'test-results/13-data-connectivity.png', fullPage: true })
  })

  test('14. Error Handling - Test error scenarios', async ({ page }) => {
    // Test 404 page
    await page.goto('http://localhost:3000/nonexistent-page')
    await page.screenshot({ path: 'test-results/14-404-page.png' })

    const has404Content = await page.locator('text=/404|not found|page not found/i').count() > 0
    console.log('📄 404 page content:', has404Content)

    // Test invalid API endpoint
    const invalidApiResponse = await page.request.get('http://localhost:3000/api/invalid-endpoint')
    console.log('🔗 Invalid API status:', invalidApiResponse.status())
  })
})
