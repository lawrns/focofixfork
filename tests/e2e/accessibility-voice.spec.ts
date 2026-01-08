import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Voice Page Accessibility', () => {
  test('landmarks and headings', async ({ page }) => {
    await page.goto('http://localhost:3001/voice')
    await expect(page.locator('[role="main"], main')).toBeVisible()
    const h1Count = await page.locator('h1').count()
    expect(h1Count).toBeGreaterThanOrEqual(1)
  })

  test('axe checks', async ({ page }) => {
    await page.goto('http://localhost:3001/voice')
    await injectAxe(page)
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      skipFailures: true,
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa']
        }
      }
    })
  })
})
