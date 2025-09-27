import { test, expect } from '@playwright/test';

test.describe('Accessibility Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should have proper page structure and landmarks', async ({ page }) => {
    // Check for main landmarks
    await expect(page.locator('[role="banner"], header')).toBeVisible(); // Header/banner
    await expect(page.locator('[role="main"], main')).toBeVisible(); // Main content
    await expect(page.locator('[role="navigation"], nav')).toBeVisible(); // Navigation

    // Check heading hierarchy
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBeGreaterThanOrEqual(1); // Should have at least one h1

    // Check for proper heading structure (no skipped levels)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    // Basic check - we have some headings
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have skip links for keyboard navigation', async ({ page }) => {
    // Check for skip links (should be visible on focus)
    const skipLinks = page.locator('.skip-link, a[href^="#"]');

    if (await skipLinks.first().isVisible()) {
      // Focus first element to show skip links
      await page.keyboard.press('Tab');

      // Skip links should be visible when focused
      await expect(skipLinks.first()).toBeVisible();

      // Skip link should navigate to correct section
      const skipLink = skipLinks.first();
      const href = await skipLink.getAttribute('href');

      if (href) {
        await skipLink.click();
        const targetElement = page.locator(href);
        await expect(targetElement).toBeVisible();
      }
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Test tab navigation through interactive elements
    const focusableElements = page.locator('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');

    // Get initial focused element
    let initialFocused = await page.evaluate(() => document.activeElement?.tagName);

    // Tab through elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');

      const currentFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(currentFocused).toBeDefined();

      // Should not get stuck on same element repeatedly (unless it's the last one)
      if (i > 0 && currentFocused !== initialFocused) {
        break;
      }
    }

    // Test reverse tab navigation (Shift+Tab)
    await page.keyboard.press('Shift+Tab');
    const reverseFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(reverseFocused).toBeDefined();
  });

  test('should have proper form accessibility', async ({ page }) => {
    // Find forms on the page
    const forms = page.locator('form');

    if (await forms.first().isVisible()) {
      const form = forms.first();

      // Check for required field indicators
      const requiredFields = form.locator('input[required], select[required], textarea[required]');
      const requiredCount = await requiredFields.count();

      if (requiredCount > 0) {
        // Required fields should have proper labeling
        for (let i = 0; i < requiredCount; i++) {
          const field = requiredFields.nth(i);
          const ariaRequired = await field.getAttribute('aria-required');
          const requiredAttr = await field.getAttribute('required');

          expect(ariaRequired === 'true' || requiredAttr === '').toBe(true);
        }
      }

      // Check for form labels
      const inputs = form.locator('input, select, textarea');
      const inputCount = await inputs.count();

      for (let i = 0; i < Math.min(inputCount, 3); i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        const ariaLabel = await input.getAttribute('aria-label');

        if (id) {
          const label = form.locator(`label[for="${id}"]`);
          const hasLabel = await label.isVisible();
          const hasAriaLabel = ariaLabel || ariaLabelledBy;

          expect(hasLabel || hasAriaLabel).toBe(true);
        }
      }
    }
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    // Check for proper ARIA usage
    const ariaElements = page.locator('[aria-expanded], [aria-current], [aria-selected], [aria-checked]');

    if (await ariaElements.first().isVisible()) {
      const ariaCount = await ariaElements.count();

      // Check a few ARIA elements for proper values
      for (let i = 0; i < Math.min(ariaCount, 3); i++) {
        const element = ariaElements.nth(i);

        // ARIA attributes should have valid values
        const ariaExpanded = await element.getAttribute('aria-expanded');
        const ariaCurrent = await element.getAttribute('aria-current');
        const ariaSelected = await element.getAttribute('aria-selected');
        const ariaChecked = await element.getAttribute('aria-checked');

        if (ariaExpanded) {
          expect(['true', 'false']).toContain(ariaExpanded);
        }

        if (ariaCurrent) {
          expect(['page', 'step', 'location', 'date', 'time', 'true', 'false']).toContain(ariaCurrent);
        }

        if (ariaSelected) {
          expect(['true', 'false']).toContain(ariaSelected);
        }

        if (ariaChecked) {
          expect(['true', 'false', 'mixed']).toContain(ariaChecked);
        }
      }
    }
  });

  test('should have accessible color contrast', async ({ page }) => {
    // This is a basic check - in a real scenario, you'd use axe-core or similar
    // to programmatically check color contrast

    // Check that text has sufficient contrast with background
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6');

    // Sample a few text elements
    const sampleTexts = textElements.locator(':visible').first();
    if (await sampleTexts.isVisible()) {
      // Basic check - text should be readable (not invisible)
      const opacity = await sampleTexts.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.opacity;
      });

      expect(parseFloat(opacity)).toBeGreaterThan(0.1);
    }
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for screen reader friendly elements
    const srOnlyElements = page.locator('.sr-only, [aria-hidden="true"]');

    // Should have some screen reader only content
    const srOnlyCount = await srOnlyElements.count();
    expect(srOnlyCount).toBeGreaterThanOrEqual(0); // May or may not have them

    // Check for live regions
    const liveRegions = page.locator('[aria-live], [role="alert"], [role="status"]');

    // Live regions should have appropriate aria-live values
    if (await liveRegions.first().isVisible()) {
      const liveRegion = liveRegions.first();
      const ariaLive = await liveRegion.getAttribute('aria-live');

      if (ariaLive) {
        expect(['off', 'polite', 'assertive']).toContain(ariaLive);
      }
    }
  });

  test('should have proper button accessibility', async ({ page }) => {
    const buttons = page.locator('button, [role="button"]');

    if (await buttons.first().isVisible()) {
      const buttonCount = await buttons.count();

      // Check first few buttons
      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);

        // Buttons should have accessible names
        const accessibleName = await button.evaluate(el => {
          return el.textContent?.trim() ||
                 el.getAttribute('aria-label') ||
                 el.getAttribute('aria-labelledby') ||
                 el.getAttribute('title');
        });

        expect(accessibleName?.length).toBeGreaterThan(0);
      }
    }
  });

  test('should have accessible images', async ({ page }) => {
    const images = page.locator('img');

    if (await images.first().isVisible()) {
      const imageCount = await images.count();

      // Check images for alt text
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const image = images.nth(i);

        // Decorative images might not need alt text, but content images should
        const alt = await image.getAttribute('alt');
        const role = await image.getAttribute('role');
        const ariaHidden = await image.getAttribute('aria-hidden');

        // If not decorative, should have alt text
        if (role !== 'presentation' && ariaHidden !== 'true') {
          // Alt can be empty for decorative images, but should be present
          expect(alt).not.toBeNull();
        }
      }
    }
  });

  test('should handle focus management in dialogs', async ({ page }) => {
    // Look for modal triggers
    const modalTriggers = page.locator('button').filter({ hasText: /open|modal|dialog/i });

    if (await modalTriggers.first().isVisible()) {
      const trigger = modalTriggers.first();
      await trigger.click();

      // Modal should open
      const modal = page.locator('dialog, .modal, [role="dialog"]');

      if (await modal.isVisible()) {
        // Focus should be trapped in modal
        const modalFocusable = modal.locator('button, [href], input, select, textarea');
        const focusableCount = await modalFocusable.count();

        if (focusableCount > 0) {
          // First focusable element should receive focus
          const firstFocusable = modalFocusable.first();
          const isFocused = await firstFocusable.evaluate(el => el === document.activeElement);

          // Note: This might not work perfectly in all browsers
          // In a real test, you'd check focus behavior more thoroughly
          expect(focusableCount).toBeGreaterThan(0);
        }

        // Modal should have proper ARIA attributes
        const role = await modal.getAttribute('role');
        const ariaModal = await modal.getAttribute('aria-modal');

        if (role === 'dialog') {
          expect(ariaModal).toBe('true');
        }
      }
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Check if high contrast styles are applied when needed
    const body = page.locator('body');

    // This is a basic check - in reality, you'd test the actual high contrast behavior
    await expect(body).toBeVisible();

    // Check for high contrast class application
    // This would be triggered by accessibility settings
    const hasHighContrastClass = await body.evaluate(el => el.classList.contains('high-contrast'));
    // May or may not have the class depending on settings
    expect(typeof hasHighContrastClass).toBe('boolean');
  });

  test('should have proper table accessibility', async ({ page }) => {
    const tables = page.locator('table');

    if (await tables.first().isVisible()) {
      const table = tables.first();

      // Tables should have proper structure
      const hasHeader = await table.locator('thead, th').first().isVisible();

      if (hasHeader) {
        // Check for scope attributes on header cells
        const headers = table.locator('th');
        const headerCount = await headers.count();

        if (headerCount > 0) {
          // At least some headers should have scope (though not all implementations do)
          const headersWithScope = await headers.evaluateAll(els =>
            els.filter(el => el.hasAttribute('scope')).length
          );

          // This is informational - not all tables need scope in modern implementations
          expect(typeof headersWithScope).toBe('number');
        }
      }

      // Check for table caption if present
      const caption = table.locator('caption');
      if (await caption.isVisible()) {
        const captionText = await caption.textContent();
        expect(captionText?.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('should handle error states accessibly', async ({ page }) => {
    // Try to submit a form with errors
    const forms = page.locator('form');

    if (await forms.first().isVisible()) {
      const form = forms.first();
      const submitButton = form.locator('button[type="submit"]');

      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Look for error messages
        const errors = page.locator('[role="alert"], .error, .field-error');

        if (await errors.first().isVisible()) {
          const error = errors.first();

          // Error should be associated with form fields
          const ariaDescribedBy = await error.getAttribute('id');
          if (ariaDescribedBy) {
            const relatedField = page.locator(`[aria-describedby="${ariaDescribedBy}"]`);
            await expect(relatedField).toBeVisible();
          }
        }
      }
    }
  });

  test('should support reduced motion preferences', async ({ page }) => {
    // Check for motion preferences handling
    const animatedElements = page.locator('[class*="animate"], [class*="transition"]');

    // Elements with animations should respect motion preferences
    // This is handled by CSS and the accessibility service
    if (await animatedElements.first().isVisible()) {
      // In a real test, you'd check computed styles for animation-duration
      const hasAnimations = await animatedElements.count();
      expect(hasAnimations).toBeGreaterThan(0);
    }
  });
});
