import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Voice Planning Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/voice')
    await injectAxe(page)
  })

  test('should pass initial accessibility scan', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        // Enable all rules except those that don't apply to our app
        'bypass': { enabled: false }, // No skip navigation needed for single page app
        'landmark-unique': { enabled: false } // May have duplicate landmarks in React components
      }
    })
  })

  test('should have proper heading structure', async ({ page }) => {
    // Check for h1
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('Voice Planning Workbench')
    
    // Check for logical heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    expect(headings.length).toBeGreaterThan(0)
    
    // First heading should be h1
    const firstHeading = headings[0]
    await expect(firstHeading).toHaveTag('h1')
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    // Check tablist role
    const tablist = page.locator('[role="tablist"]')
    await expect(tablist).toBeVisible()
    
    // Check tabs have proper roles
    const tabs = page.locator('[role="tab"]')
    await expect(tabs).toHaveCount(3) // Voice Input, Review & Edit, Timeline
    
    // Check tabpanels have proper roles
    const tabpanels = page.locator('[role="tabpanel"]')
    await expect(tabpanels).toHaveCount(3)
    
    // Check for proper ARIA attributes
    const firstTab = tabs.first()
    await expect(firstTab).toHaveAttribute('aria-selected', 'true')
    await expect(firstTab).toHaveAttribute('aria-controls')
    
    const firstTabPanel = tabpanels.first()
    await expect(firstTabPanel).toHaveAttribute('aria-labelledby')
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab')
    await expect(page.getByRole('tab', { name: 'Voice Input' })).toBeFocused()
    
    // Test arrow key navigation in tabs
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('tab', { name: 'Review & Edit' })).toHaveAttribute('aria-selected', 'true')
    
    // Test navigation to form elements
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await expect(page.getByLabel('Transcript')).toBeFocused()
    
    // Test button navigation
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Generate Plan' })).toBeFocused()
  })

  test('should have proper form labels and descriptions', async ({ page }) => {
    // Check transcript textarea has proper label
    const transcript = page.getByLabel('Transcript')
    await expect(transcript).toBeVisible()
    await expect(transcript).toHaveAttribute('id')
    
    // Check if label is properly associated
    const label = page.locator(`label[for="${await transcript.getAttribute('id')}"]`)
    await expect(label).toBeVisible()
    await expect(label).toContainText('Transcript')
    
    // Check buttons have accessible names
    const generateButton = page.getByRole('button', { name: 'Generate Plan' })
    await expect(generateButton).toBeVisible()
    
    const recordButton = page.getByRole('button', { name: /Start Recording|Stop Recording/ })
    await expect(recordButton).toBeVisible()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    // This will be checked by axe, but let's verify key elements
    await checkA11y(page, '[role="tab"]', {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
    
    await checkA11y(page, 'button', {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
    
    await checkA11y(page, 'h1, h2, h3', {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })

  test('should announce important state changes to screen readers', async ({ page }) => {
    // Generate plan and check for announcements
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Check for loading announcement
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    
    // Wait for plan generation
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
    
    // Check for success announcement
    await expect(page.locator('text=Plan draft generated')).toBeVisible()
  })

  test('should have focus management', async ({ page }) => {
    // Test focus stays in appropriate areas
    await page.getByRole('tab', { name: 'Review & Edit' }).click()
    
    // Focus should move to the new tab panel
    const activeTabPanel = page.locator('[role="tabpanel"][aria-hidden="false"]')
    await expect(activeTabPanel).toBeVisible()
    
    // Test focus trapping in modals (if any)
    // This would be tested when error/success modals appear
  })

  test('should have proper alt text for images', async ({ page }) => {
    // Check for any images in the component
    const images = page.locator('img')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      for (let i = 0; i < imageCount; i++) {
        const image = images.nth(i)
        await expect(image).toHaveAttribute('alt')
      }
    }
  })

  test('should have proper link descriptions', async ({ page }) => {
    // Check for any links in the component
    const links = page.locator('a')
    const linkCount = await links.count()
    
    if (linkCount > 0) {
      for (let i = 0; i < linkCount; i++) {
        const link = links.nth(i)
        const hasText = (await link.textContent())?.trim().length > 0
        const hasAriaLabel = await link.getAttribute('aria-label')
        
        expect(hasText || hasAriaLabel).toBe(true)
      }
    }
  })

  test('should have proper table accessibility', async ({ page }) => {
    // Generate plan first
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await page.getByRole('tab', { name: 'Review & Edit' }).click()
    await expect(page.getByText('Create wireframes')).toBeVisible({ timeout: 10000 })
    
    // Check for proper table structure if present
    const tables = page.locator('table')
    const tableCount = await tables.count()
    
    if (tableCount > 0) {
      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i)
        
        // Check for table headers
        const headers = table.locator('th')
        const headerCount = await headers.count()
        
        if (headerCount > 0) {
          // Check scope attributes
          for (let j = 0; j < headerCount; j++) {
            const header = headers.nth(j)
            const scope = await header.getAttribute('scope')
            expect(['col', 'row'].includes(scope || '')).toBe(true)
          }
        }
        
        // Check for caption if complex table
        const hasCaption = await table.locator('caption').count() > 0
        const hasHeaders = headerCount > 0
        const isComplex = await table.locator('tr').count() > 5
        
        if (isComplex) {
          expect(hasCaption || hasHeaders).toBe(true)
        }
      }
    }
  })

  test('should have proper chart accessibility', async ({ page }) => {
    // Generate plan and go to timeline
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await page.getByRole('tab', { name: 'Timeline' }).click()
    await expect(page.getByText('Project Timeline')).toBeVisible({ timeout: 10000 })
    
    // Check for chart accessibility
    const charts = page.locator('[role="img"], [role="chart"], svg')
    const chartCount = await charts.count()
    
    if (chartCount > 0) {
      for (let i = 0; i < chartCount; i++) {
        const chart = charts.nth(i)
        
        // Check for accessible name
        const hasAriaLabel = await chart.getAttribute('aria-label')
        const hasTitle = await chart.getAttribute('title')
        const hasRoleImg = await chart.getAttribute('role') === 'img'
        
        expect(hasAriaLabel || hasTitle || hasRoleImg).toBe(true)
        
        // Check for description if complex chart
        const hasAriaDescribedBy = await chart.getAttribute('aria-describedby')
        if (hasAriaDescribedBy) {
          const description = page.locator(`#${hasAriaDescribedBy}`)
          await expect(description).toBeVisible()
        }
      }
    }
  })

  test('should have proper error handling accessibility', async ({ page }) => {
    // Clear transcript to trigger validation error
    const transcript = page.getByLabel('Transcript')
    await transcript.clear()
    
    // Try to generate plan
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Check for error message accessibility
    await expect(page.getByText('Please provide a transcript')).toBeVisible()
    
    // Check if error is properly associated with input
    const errorMessage = page.locator('text=Please provide a transcript')
    await expect(errorMessage).toBeVisible()
    
    // Check if input has aria-invalid or aria-describedby
    const hasAriaInvalid = await transcript.getAttribute('aria-invalid')
    const hasAriaDescribedBy = await transcript.getAttribute('aria-describedby')
    
    expect(hasAriaInvalid === 'true' || hasAriaDescribedBy).toBe(true)
  })

  test('should have proper loading state accessibility', async ({ page }) => {
    // Mock slower response for testing
    await page.route('**/api/voice/generate-plan', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Check for loading announcement
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()
    await expect(page.getByText('Generating plan...')).toBeVisible()
    
    // Check for loading indicators
    const loadingIndicators = page.locator('[aria-busy="true"], .loading, .spinner')
    const loadingCount = await loadingIndicators.count()
    
    if (loadingCount > 0) {
      for (let i = 0; i < loadingCount; i++) {
        const indicator = loadingIndicators.nth(i)
        await expect(indicator).toBeVisible()
      }
    }
  })

  test('should have proper progress indicator accessibility', async ({ page }) => {
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    
    // Check for progress indicators
    const progressElements = page.locator('[role="progressbar"], progress')
    const progressCount = await progressElements.count()
    
    if (progressCount > 0) {
      for (let i = 0; i < progressCount; i++) {
        const progress = progressElements.nth(i)
        
        // Check for accessible name
        const hasAriaLabel = await progress.getAttribute('aria-label')
        const hasAriaValuemin = await progress.getAttribute('aria-valuemin')
        const hasAriaValuemax = await progress.getAttribute('aria-valuemax')
        const hasAriaValuenow = await progress.getAttribute('aria-valuenow')
        
        expect(hasAriaLabel).toBeTruthy()
        expect(hasAriaValuemin && hasAriaValuemax && hasAriaValuenow).toBeTruthy()
      }
    }
  })

  test('should have proper mobile accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check touch target sizes (at least 44x44 pixels)
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) { // Check first 10 buttons
      const button = buttons.nth(i)
      const boundingBox = await button.boundingBox()
      
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(44)
        expect(boundingBox.height).toBeGreaterThanOrEqual(44)
      }
    }
    
    // Check for proper spacing between touch targets
    // This is more complex to test programmatically, but axe will catch many issues
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'target-size': { enabled: true },
        'spacing': { enabled: true }
      }
    })
  })

  test('should have proper reduced motion support', async ({ page }) => {
    // Set prefers-reduced-motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/voice')
    
    // Page should still be functional with reduced motion
    await expect(page.getByRole('heading', { name: 'Voice Planning Workbench' })).toBeVisible()
    await page.getByRole('button', { name: 'Generate Plan' }).click()
    await expect(page.getByText('Mobile Task Manager')).toBeVisible({ timeout: 10000 })
  })

  test('should have proper high contrast mode support', async ({ page }) => {
    // Set high contrast mode
    await page.emulateMedia({ forcedColors: 'active' })
    await page.goto('/voice')
    
    // Page should still be functional in high contrast mode
    await expect(page.getByRole('heading', { name: 'Voice Planning Workbench' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Voice Input' })).toBeVisible()
    
    // Check for proper contrast in high contrast mode
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })
})
