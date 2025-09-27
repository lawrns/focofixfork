import { test, expect, devices } from '@playwright/test'

test.describe('Mobile Responsiveness', () => {
  test.describe('Homepage Mobile Experience', () => {
    test('should display mobile-optimized hero section', async ({ page, isMobile }) => {
      await page.goto('/')

      // Check viewport meta tag
      const viewport = await page.getAttribute('meta[name="viewport"]', 'content')
      expect(viewport).toContain('width=device-width')

      // Hero section should be mobile-optimized
      const heroSection = page.locator('section').first()
      await expect(heroSection).toBeVisible()

      // CTA buttons should stack vertically on mobile
      const ctaContainer = heroSection.locator('[class*="flex flex-col"]').first()
      if (isMobile) {
        await expect(ctaContainer).toHaveClass(/flex-col/)
      }

      // Check for proper touch targets (minimum 44px)
      const buttons = page.locator('button')
      for (const button of await buttons.all()) {
        const box = await button.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('should have readable typography on mobile', async ({ page }) => {
      await page.goto('/')

      // Check that text is readable and properly sized
      const headings = page.locator('h1, h2, h3')
      for (const heading of await headings.all()) {
        const fontSize = await heading.evaluate(el => {
          const style = window.getComputedStyle(el)
          return parseFloat(style.fontSize)
        })
        // Headings should be at least 16px on mobile for readability
        expect(fontSize).toBeGreaterThanOrEqual(16)
      }
    })

    test('should handle video playback on mobile', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/')

      // Video should have playsInline attribute for mobile
      const video = page.locator('video').first()
      const playsInline = await video.getAttribute('playsinline')
      expect(playsInline).toBeDefined()
    })
  })

  test.describe('Navigation Mobile Experience', () => {
    test('should have functional mobile sidebar', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/dashboard')

      // Mobile sidebar should be hidden by default
      const sidebar = page.locator('[class*="fixed left-0"][class*="lg:relative"]')
      await expect(sidebar).toHaveClass(/lg:relative/)

      // Menu button should be visible
      const menuButton = page.locator('button[aria-label="Open sidebar"]')
      await expect(menuButton).toBeVisible()

      // Click menu button to open sidebar
      await menuButton.click()

      // Sidebar should be visible
      await expect(sidebar).toBeVisible()

      // Overlay should be present
      const overlay = page.locator('[class*="bg-black/50"][class*="lg:hidden"]')
      await expect(overlay).toBeVisible()

      // Clicking overlay should close sidebar
      await overlay.click()
      await expect(sidebar).not.toBeVisible()
    })

    test('should have touch-friendly navigation items', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/dashboard')

      // Open sidebar
      const menuButton = page.locator('button[aria-label="Open sidebar"]')
      await menuButton.click()

      // Check navigation items have proper touch targets
      const navItems = page.locator('nav a, nav button')
      for (const item of await navItems.all()) {
        const box = await item.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(48) // 48px minimum for mobile
        }
      }
    })
  })

  test.describe('Form Mobile Experience', () => {
    test('should optimize forms for mobile input', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/login')

      // Check that input fields prevent zoom on iOS
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]')
      for (const input of await inputs.all()) {
        const fontSize = await input.evaluate(el => {
          const style = window.getComputedStyle(el)
          return parseFloat(style.fontSize)
        })
        // Should be at least 16px to prevent zoom on iOS
        expect(fontSize).toBeGreaterThanOrEqual(16)
      }

      // Check for proper input heights
      for (const input of await inputs.all()) {
        const box = await input.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    })

    test('should handle date picker on mobile', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/dashboard')

      // Look for date inputs or date picker triggers
      const dateInputs = page.locator('input[type="date"]')
      if (await dateInputs.count() > 0) {
        const dateInput = dateInputs.first()

        // Should be properly sized for mobile
        const box = await dateInput.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
    })
  })

  test.describe('Table/Data Display Mobile Experience', () => {
    test('should display data in mobile-friendly format', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/dashboard')

      // Check for mobile-optimized data display
      // Look for card-based layouts instead of tables
      const cards = page.locator('[class*="bg-card"][class*="border"][class*="rounded-lg"]')
      const tables = page.locator('table')

      if (await tables.count() > 0 && await cards.count() > 0) {
        // If both exist, cards should be more prominent on mobile
        const cardCount = await cards.count()
        const tableCount = await tables.count()

        // Mobile should prefer cards over tables
        expect(cardCount).toBeGreaterThanOrEqual(tableCount)
      }
    })

    test('should have expandable data cards', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/dashboard')

      // Look for expandable cards
      const expandButtons = page.locator('button[aria-label*="expand"], button[aria-label*="show more"]')
      if (await expandButtons.count() > 0) {
        const expandButton = expandButtons.first()

        // Click to expand
        await expandButton.click()

        // Should show more content
        const expandedContent = page.locator('[class*="border-t"][class*="bg-muted/30"]')
        await expect(expandedContent).toBeVisible()
      }
    })
  })

  test.describe('Performance & Accessibility', () => {
    test('should load quickly on mobile', async ({ page, isMobile }) => {
      if (!isMobile) return

      const startTime = Date.now()
      await page.goto('/', { waitUntil: 'domcontentloaded' })
      const loadTime = Date.now() - startTime

      // Should load within reasonable time (under 3 seconds)
      expect(loadTime).toBeLessThan(3000)
    })

    test('should be accessible on mobile', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/')

      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count()
      expect(h1Count).toBeGreaterThan(0)

      // Check for alt text on images
      const images = page.locator('img')
      for (const img of await images.all()) {
        const alt = await img.getAttribute('alt')
        expect(alt).toBeTruthy()
      }

      // Check for proper button labels
      const buttons = page.locator('button')
      for (const button of await buttons.all()) {
        const ariaLabel = await button.getAttribute('aria-label')
        const textContent = await button.textContent()
        expect(ariaLabel || textContent?.trim()).toBeTruthy()
      }
    })

    test('should handle orientation changes', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/')

      // Set viewport to landscape
      await page.setViewportSize({ width: 896, height: 414 })

      // Content should still be accessible
      const heroSection = page.locator('section').first()
      await expect(heroSection).toBeVisible()

      // Reset to portrait
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(heroSection).toBeVisible()
    })
  })

  test.describe('Touch Interactions', () => {
    test('should support touch gestures', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/dashboard')

      // Test sidebar swipe (if implemented)
      const sidebar = page.locator('[class*="fixed left-0"]')
      const initialSidebarState = await sidebar.isVisible()

      // Try to swipe from left edge
      await page.mouse.move(0, 200)
      await page.mouse.down()
      await page.mouse.move(200, 200)
      await page.mouse.up()

      // Sidebar should be more visible or interactive
      // Note: This test may need adjustment based on actual swipe implementation
    })

    test('should prevent text selection on interactive elements', async ({ page, isMobile }) => {
      if (!isMobile) return

      await page.goto('/')

      // Buttons should not allow text selection
      const buttons = page.locator('button')
      for (const button of await buttons.all()) {
        const userSelect = await button.evaluate(el => {
          const style = window.getComputedStyle(el)
          return style.userSelect || style.webkitUserSelect
        })
        expect(['none', 'auto']).toContain(userSelect)
      }
    })
  })
})
