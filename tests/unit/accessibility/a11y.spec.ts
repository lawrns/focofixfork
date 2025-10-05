/**
 * Accessibility Tests with axe-core
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('should pass accessibility audit on homepage', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    // Log violations for debugging
    if (accessibilityScanResults.violations.length > 0) {
      console.log('Accessibility Violations:')
      accessibilityScanResults.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.id}: ${violation.description}`)
        console.log(`   Impact: ${violation.impact}`)
        console.log(`   Nodes: ${violation.nodes.length}`)
        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`   ${nodeIndex + 1}. ${node.target.join(', ')}`)
        })
        console.log('')
      })
    }

    // Assert no critical accessibility violations
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical'
    )
    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious'
    )

    expect(criticalViolations).toHaveLength(0)
    expect(seriousViolations).toHaveLength(0)
    expect(accessibilityScanResults.violations).toHaveLength(0)
  })

  test('should pass accessibility audit on login page', async ({ page }) => {
    await page.goto('/login')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    // Assert critical accessibility issues are fixed
    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )

    expect(criticalViolations).toHaveLength(0)
  })

  test('should pass accessibility audit on dashboard', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await page.waitForURL('/dashboard')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const criticalViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    )

    expect(criticalViolations).toHaveLength(0)
  })

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/')

    // Check heading hierarchy
    const h1Elements = await page.$$('h1')
    const h2Elements = await page.$$('h2')
    const h3Elements = await page.$$('h3')

    expect(h1Elements.length).toBeGreaterThanOrEqual(1) // Should have at least one h1
    expect(h1Elements.length).toBeLessThanOrEqual(1) // Should not have multiple h1s

    // Check for proper heading order (no skipping levels)
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) => {
      return elements.map(el => parseInt(el.tagName.charAt(1)))
    })

    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i] - headings[i - 1]
      expect(diff).toBeLessThanOrEqual(1) // Should not skip heading levels
    }
  })

  test('should have proper form labels and accessibility', async ({ page }) => {
    await page.goto('/login')

    // Check all form inputs have labels
    const inputs = await page.$$('input[type="text"], input[type="email"], input[type="password"]')
    const textareas = await page.$$('textarea')
    const selects = await page.$$('select')

    const formControls = [...inputs, ...textareas, ...selects]

    for (const control of formControls) {
      const id = await control.getAttribute('id')
      const ariaLabel = await control.getAttribute('aria-label')
      const ariaLabelledBy = await control.getAttribute('aria-labelledby')

      const hasLabel = await page.$(`label[for="${id}"]`).then(Boolean)

      const hasAccessibility = Boolean(
        id && hasLabel ||
        ariaLabel ||
        ariaLabelledBy ||
        await control.getAttribute('placeholder')
      )

      expect(hasAccessibility).toBe(true)
    }
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze()

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    )

    expect(contrastViolations).toHaveLength(0)
  })

  test('should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for proper ARIA roles
    const buttons = await page.$$('button')
    const links = await page.$$('a[href]')

    // Buttons should either have text content or aria-label
    for (const button of buttons) {
      const text = await button.textContent()
      const ariaLabel = await button.getAttribute('aria-label')

      expect(Boolean(text || ariaLabel)).toBe(true)
    }

    // Links should have descriptive text
    for (const link of links) {
      const text = await link.textContent()
      const ariaLabel = await link.getAttribute('aria-label')
      const title = await link.getAttribute('title')

      expect(Boolean(text || ariaLabel || title)).toBe(true)
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login')

    // Test tab navigation
    await page.keyboard.press('Tab')
    const firstFocusable = await page.evaluate(() => document.activeElement?.tagName)
    expect(['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA'].includes(firstFocusable || '')).toBe(true)

    // Navigate through all focusable elements
    const focusableElements = await page.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    let currentIndex = 0

    while (currentIndex < focusableElements.length) {
      const isVisible = await focusableElements[currentIndex].isVisible()
      const isEnabled = await focusableElements[currentIndex].isEnabled()

      if (isVisible && isEnabled) {
        break // Found first visible, enabled element
      }
      currentIndex++
    }

    expect(currentIndex).toBeLessThan(focusableElements.length)
  })

  test('should have proper image alt texts', async ({ page }) => {
    await page.goto('/')

    const images = await page.$$('img')
    const svgs = await page.$$('svg')

    // Images should have alt text (unless decorative)
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')

      // Either has alt text or is marked as decorative
      const hasAlt = Boolean(alt || role === 'presentation' || role === 'none')
      expect(hasAlt).toBe(true)
    }

    // SVGs should have aria-label or title for screen readers
    for (const svg of svgs) {
      const ariaLabel = await svg.getAttribute('aria-label')
      const ariaLabelledBy = await svg.getAttribute('aria-labelledby')
      const title = await svg.$$eval('title', titles => titles.length > 0)

      const hasAccessibility = Boolean(ariaLabel || ariaLabelledBy || title)
      expect(hasAccessibility).toBe(true)
    }
  })

  test('should handle focus management properly', async ({ page }) => {
    await page.goto('/login')

    // Focus should move to error message when validation fails
    await page.click('[data-testid="login-button"]')

    const activeElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(activeElement).toBe('INPUT') // Should focus first invalid field
  })

  test('should have proper language attributes', async ({ page }) => {
    await page.goto('/')

    // Root element should have lang attribute
    const htmlLang = await page.getAttribute('html', 'lang')
    expect(htmlLang).toBe('en') // Default to English

    // Check for proper language switching if multi-language
    const langElements = await page.$$('[lang]')
    for (const element of langElements) {
      const lang = await element.getAttribute('lang')
      expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/) // ISO language code format
    }
  })

  test('should work with screen readers', async ({ page }) => {
    await page.goto('/dashboard')

    // Check for skip links
    const skipLinks = await page.$$('a[href^="#"]:not([href="#"])')
    expect(skipLinks.length).toBeGreaterThanOrEqual(1)

    // Check for proper landmark roles
    const main = await page.$('[role="main"], main')
    const nav = await page.$('[role="navigation"], nav')

    expect(main).toBeTruthy()
    expect(nav).toBeTruthy()

    // Check for status messages
    const statusMessages = await page.$$('[role="status"], [aria-live]')
    // Should have at least loading states and notifications
    expect(statusMessages.length).toBeGreaterThanOrEqual(1)
  })

  test('should be usable at different zoom levels', async ({ page }) => {
    await page.goto('/')

    // Test at 200% zoom
    await page.evaluate(() => {
      document.body.style.zoom = '2'
    })

    // Content should still be accessible
    const mainContent = await page.$('main, [role="main"]')
    expect(mainContent).toBeTruthy()

    // Check for horizontal scroll (should not exist at high zoom)
    const scrollWidth = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })

    expect(scrollWidth).toBe(false)
  })
})


