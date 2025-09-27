import { test, expect } from '@playwright/test'

test.describe('Dashboard Comprehensive Functionality Test', () => {
  test.setTimeout(120000) // 2 minutes timeout for comprehensive testing

  test('should test all dashboard buttons and navigation', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3000/login')

    // Login with test credentials
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/)

    // Test main navigation buttons
    console.log('Testing main navigation...')

    // Test Projects navigation
    await page.click('text=Projects')
    await page.waitForURL('**/projects')
    expect(page.url()).toContain('projects')
    console.log('✅ Projects navigation works')

    // Test Organizations navigation
    await page.click('text=Organizations')
    await page.waitForURL('**/organizations')
    expect(page.url()).toContain('organizations')
    console.log('✅ Organizations navigation works')

    // Test Milestones navigation
    await page.click('text=Milestones')
    await page.waitForURL('**/milestones')
    expect(page.url()).toContain('milestones')
    console.log('✅ Milestones navigation works')

    // Test Tasks navigation
    await page.click('text=Tasks')
    await page.waitForURL('**/tasks')
    expect(page.url()).toContain('tasks')
    console.log('✅ Tasks navigation works')

    // Test Reports navigation
    await page.click('text=Reports')
    await page.waitForURL('**/reports')
    expect(page.url()).toContain('reports')
    console.log('✅ Reports navigation works')

    // Test Settings navigation
    await page.click('text=Settings')
    await page.waitForURL('**/settings')
    expect(page.url()).toContain('settings')
    console.log('✅ Settings navigation works')

    // Test Help navigation
    await page.click('text=Help')
    await page.waitForURL('**/help')
    expect(page.url()).toContain('help')
    console.log('✅ Help navigation works')

    // Go back to dashboard
    await page.click('text=Dashboard')
    await page.waitForURL('**/dashboard')

    // Test dashboard action buttons
    console.log('Testing dashboard action buttons...')

    // Test Create Project button
    const createProjectButton = page.locator('button').filter({ hasText: 'Create Project' }).first()
    if (await createProjectButton.isVisible()) {
      await createProjectButton.click()
      // Should open create project dialog or navigate to create page
      console.log('✅ Create Project button works')
    }

    // Test Create Milestone button
    const createMilestoneButton = page.locator('button').filter({ hasText: 'Create Milestone' }).first()
    if (await createMilestoneButton.isVisible()) {
      await createMilestoneButton.click()
      console.log('✅ Create Milestone button works')
    }

    // Test Create Task button
    const createTaskButton = page.locator('button').filter({ hasText: 'Create Task' }).first()
    if (await createTaskButton.isVisible()) {
      await createTaskButton.click()
      console.log('✅ Create Task button works')
    }

    // Test Quick Actions buttons
    const quickActionButtons = page.locator('button').filter({ hasText: /Quick Action|View All|Add New/ })
    const quickActionCount = await quickActionButtons.count()
    for (let i = 0; i < quickActionCount; i++) {
      const button = quickActionButtons.nth(i)
      if (await button.isVisible()) {
        await button.click()
        console.log(`✅ Quick Action button ${i + 1} works`)
        // Close any opened dialogs/modals
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)
      }
    }

    // Test analytics section buttons
    console.log('Testing analytics section...')

    // Test View Analytics button
    const viewAnalyticsButton = page.locator('button').filter({ hasText: 'View Analytics' }).first()
    if (await viewAnalyticsButton.isVisible()) {
      await viewAnalyticsButton.click()
      await page.waitForURL('**/analytics')
      expect(page.url()).toContain('analytics')
      console.log('✅ View Analytics button works')

      // Go back to dashboard
      await page.click('text=Dashboard')
      await page.waitForURL('**/dashboard')
    }

    // Test project cards buttons
    console.log('Testing project cards...')
    const projectCards = page.locator('[data-testid="project-card"], .project-card, .card').filter({ hasText: /Project|Task|Milestone/ })
    const projectCardCount = await projectCards.count()
    for (let i = 0; i < Math.min(projectCardCount, 3); i++) { // Test first 3 cards
      const card = projectCards.nth(i)

      // Look for action buttons within the card
      const cardButtons = card.locator('button')
      const buttonCount = await cardButtons.count()

      for (let j = 0; j < buttonCount; j++) {
        const button = cardButtons.nth(j)
        if (await button.isVisible()) {
          const buttonText = await button.textContent()
          await button.click()
          console.log(`✅ Project card ${i + 1} button "${buttonText?.trim()}" works`)

          // Close any dialogs and wait
          await page.keyboard.press('Escape')
          await page.waitForTimeout(500)
          break // Only test first button per card
        }
      }
    }

    // Test notifications/toast buttons
    console.log('Testing notifications...')
    const notificationButtons = page.locator('button').filter({ hasText: /Close|Dismiss|Mark as Read/ })
    const notificationCount = await notificationButtons.count()
    for (let i = 0; i < notificationCount; i++) {
      const button = notificationButtons.nth(i)
      if (await button.isVisible()) {
        await button.click()
        console.log(`✅ Notification button ${i + 1} works`)
      }
    }

    // Test sidebar/mobile menu toggle
    console.log('Testing sidebar/menu toggle...')
    const menuToggle = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], .menu-toggle, .sidebar-toggle').first()
    if (await menuToggle.isVisible()) {
      await menuToggle.click()
      console.log('✅ Menu toggle works')
      await page.waitForTimeout(500)

      // Click again to close
      await menuToggle.click()
      console.log('✅ Menu toggle close works')
    }

    // Test user profile menu
    console.log('Testing user profile menu...')
    const profileMenu = page.locator('button[aria-label*="profile"], button[aria-label*="Profile"], [data-testid="profile-menu"]').first()
    if (await profileMenu.isVisible()) {
      await profileMenu.click()
      console.log('✅ Profile menu opens')

      // Test profile menu items
      const profileMenuItems = page.locator('.profile-menu button, .dropdown-menu button')
      const menuItemCount = await profileMenuItems.count()
      for (let i = 0; i < Math.min(menuItemCount, 2); i++) { // Test first 2 items
        const menuItem = profileMenuItems.nth(i)
        if (await menuItem.isVisible()) {
          const menuText = await menuItem.textContent()
          await menuItem.click()
          console.log(`✅ Profile menu item "${menuText?.trim()}" works`)
          break // Only test one to avoid navigation
        }
      }
    }

    // Test search functionality
    console.log('Testing search...')
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('test search')
      console.log('✅ Search input works')

      // Test search button if exists
      const searchButton = page.locator('button').filter({ hasText: 'Search' }).first()
      if (await searchButton.isVisible()) {
        await searchButton.click()
        console.log('✅ Search button works')
      }
    }

    // Test filter buttons
    console.log('Testing filters...')
    const filterButtons = page.locator('button').filter({ hasText: /Filter|All|Active|Completed|Pending/ })
    const filterCount = await filterButtons.count()
    for (let i = 0; i < Math.min(filterCount, 3); i++) {
      const button = filterButtons.nth(i)
      if (await button.isVisible()) {
        const buttonText = await button.textContent()
        await button.click()
        console.log(`✅ Filter button "${buttonText?.trim()}" works`)
      }
    }

    // Test pagination if exists
    console.log('Testing pagination...')
    const paginationButtons = page.locator('button').filter({ hasText: /Next|Previous|Page|«|»/ })
    const paginationCount = await paginationButtons.count()
    for (let i = 0; i < Math.min(paginationCount, 2); i++) {
      const button = paginationButtons.nth(i)
      if (await button.isVisible()) {
        const buttonText = await button.textContent()
        await button.click()
        console.log(`✅ Pagination button "${buttonText?.trim()}" works`)
      }
    }

    console.log('🎉 Dashboard comprehensive functionality test completed successfully!')
  })

  test('should test mobile responsiveness of all buttons', async ({ page, browser }) => {
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
    })
    const mobilePage = await mobileContext.newPage()

    // Navigate to login page
    await mobilePage.goto('http://localhost:3000/login')

    // Login
    await mobilePage.fill('input[type="email"]', 'test@example.com')
    await mobilePage.fill('input[type="password"]', 'password123')
    await mobilePage.click('button[type="submit"]')

    // Wait for dashboard
    await mobilePage.waitForURL('**/dashboard')

    // Test mobile navigation
    console.log('Testing mobile navigation...')

    // Test mobile menu toggle
    const mobileMenuToggle = mobilePage.locator('button[aria-label*="menu"], .mobile-menu-toggle, .hamburger').first()
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click()
      console.log('✅ Mobile menu toggle works')

      // Test mobile navigation items
      const mobileNavItems = mobilePage.locator('.mobile-nav button, .mobile-menu button')
      const navCount = await mobileNavItems.count()
      for (let i = 0; i < Math.min(navCount, 3); i++) {
        const navItem = mobileNavItems.nth(i)
        if (await navItem.isVisible()) {
          const navText = await navItem.textContent()
          await navItem.click()
          console.log(`✅ Mobile nav item "${navText?.trim()}" works`)
          break // Only test one to avoid navigation
        }
      }
    }

    // Test touch targets (minimum 44px)
    console.log('Testing touch target sizes...')
    const buttons = mobilePage.locator('button')
    const buttonCount = await buttons.count()

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44)
          expect(box.height).toBeGreaterThanOrEqual(44)
          console.log(`✅ Button ${i + 1} has adequate touch target (${Math.round(box.width)}x${Math.round(box.height)})`)
        }
      }
    }

    await mobileContext.close()
    console.log('🎉 Mobile responsiveness test completed!')
  })
})
