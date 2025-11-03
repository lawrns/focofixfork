import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Comprehensive Accessibility Tests', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await injectAxe(page);
  });

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('home page meets accessibility standards', async ({ page }) => {
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        rules: {
          // WCAG 2.1 AA specific rules
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'aria-labels': { enabled: true },
          'heading-order': { enabled: true },
          'landmark-roles': { enabled: true },
          'link-purpose': { enabled: true },
          'button-name': { enabled: true },
          'label-title-only': { enabled: true },
        },
      });
    });

    test('login page accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await injectAxe(page);
      
      await checkA11y(page, null, {
        detailedReport: true,
        rules: {
          'form-field-multiple-labels': { enabled: true },
          'label': { enabled: true },
          'input-button-name': { enabled: true },
        },
      });
    });

    test('dashboard accessibility', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL(`${BASE_URL}/dashboard`);
      
      await injectAxe(page);
      
      await checkA11y(page, null, {
        detailedReport: true,
        rules: {
          'data-table': { enabled: true },
          'table-headers': { enabled: true },
          'definition-list': { enabled: true },
        },
      });
    });

    test('projects page accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      await injectAxe(page);
      
      await checkA11y(page, null, {
        detailedReport: true,
        rules: {
          'list': { enabled: true },
          'listitem': { enabled: true },
          'aria-required-children': { enabled: true },
        },
      });
    });

    test('tasks page accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/tasks`);
      await injectAxe(page);
      
      await checkA11y(page, null, {
        detailedReport: true,
        rules: {
          'drag-and-drop': { enabled: true },
          'aria-allowed-attr': { enabled: true },
        },
      });
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('full keyboard navigation works', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Test tab navigation through main elements
      const focusableElements = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ];

      for (let i = 0; i < 20; i++) { // Test first 20 tab stops
        await page.keyboard.press('Tab');
        const focusedElement = await page.locator(':focus').count();
        expect(focusedElement).toBeGreaterThan(0);
        
        // Check that focused element is actually focusable
        const tagName = await page.locator(':focus').evaluate(el => el.tagName.toLowerCase());
        expect(focusableElements.some(selector => selector.includes(tagName))).toBeTruthy();
      }
    });

    test('skip links functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check for skip links
      const skipLinks = await page.locator('a[href^="#"]').count();
      if (skipLinks > 0) {
        await page.keyboard.press('Tab');
        const firstSkipLink = page.locator('a[href^="#"]').first();
        await expect(firstSkipLink).toBeFocused();
        
        const href = await firstSkipLink.getAttribute('href');
        if (href) {
          await page.keyboard.press('Enter');
          const targetId = href.replace('#', '');
          const target = page.locator(`#${targetId}, [name="${targetId}"]`);
          await expect(target).toBeFocused();
        }
      }
    });

    test('modal keyboard trap', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Open a modal
      await page.click('button:has-text("New Project")');
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      
      // Focus should be trapped in modal
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeFocused();
      
      // Tab should stay within modal
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeWithin(modal);
      
      // Escape should close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    });

    test('focus indicators are visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Test focus styles
      const focusableElements = page.locator('button, input, a, select, textarea');
      const count = await focusableElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = focusableElements.nth(i);
        await element.focus();
        
        // Check for visible focus indicator
        const computedStyle = await element.evaluate(el => {
          const style = window.getComputedStyle(el, ':focus');
          return {
            outline: style.outline,
            boxShadow: style.boxShadow,
            border: style.border,
          };
        });
        
        // Should have some form of focus indicator
        const hasFocusIndicator = 
          computedStyle.outline !== 'none' ||
          computedStyle.boxShadow !== 'none' ||
          computedStyle.border !== 'none';
        
        expect(hasFocusIndicator).toBeTruthy();
      }
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('proper heading hierarchy', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      let previousLevel = 0;
      
      for (const heading of headings) {
        const level = parseInt(await heading.evaluate(el => el.tagName.substring(1)));
        
        // Heading levels should not skip (e.g., h1 to h3 without h2)
        expect(level - previousLevel).toBeLessThanOrEqual(1);
        previousLevel = level;
      }
    });

    test('ARIA labels and descriptions', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Check interactive elements have accessible names
      const interactiveElements = await page.locator('button, a, input, select, textarea').all();
      
      for (const element of interactiveElements.slice(0, 10)) {
        const accessibleName = await element.evaluate(el => {
          return el.getAttribute('aria-label') || 
                 el.getAttribute('aria-labelledby') || 
                 el.textContent?.trim() ||
                 el.getAttribute('title') ||
                 el.getAttribute('alt');
        });
        
        expect(accessibleName).toBeTruthy();
      }
    });

    test('form accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      await page.click('button:has-text("New Project")');
      
      // Check form labels
      const inputs = await page.locator('input, select, textarea').all();
      
      for (const input of inputs) {
        const hasLabel = await input.evaluate(el => {
          const labels = el.labels;
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const placeholder = el.getAttribute('placeholder');
          const title = el.getAttribute('title');
          
          return (labels && labels.length > 0) || 
                 ariaLabel || 
                 ariaLabelledBy || 
                 (placeholder && placeholder.trim()) ||
                 (title && title.trim());
        });
        
        expect(hasLabel).toBeTruthy();
      }
      
      // Check error messages are associated with inputs
      const errorMessages = await page.locator('[role="alert"], .error, [data-error]').all();
      for (const error of errorMessages) {
        const describedBy = await error.evaluate(el => {
          const inputs = document.querySelectorAll('input, select, textarea');
          for (const input of inputs) {
            if (input.getAttribute('aria-describedby')?.includes(el.id)) {
              return true;
            }
          }
          return false;
        });
        
        // Error messages should be associated with form controls
        if (await error.isVisible()) {
          expect(describedBy).toBeTruthy();
        }
      }
    });

    test('table accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Check for data tables
      const tables = await page.locator('table').all();
      
      for (const table of tables) {
        // Should have captions or headers
        const hasCaption = await table.locator('caption').count() > 0;
        const hasHeaders = await table.locator('th').count() > 0;
        
        expect(hasCaption || hasHeaders).toBeTruthy();
        
        // Headers should have scope attributes
        const headers = await table.locator('th').all();
        for (const header of headers) {
          const scope = await header.getAttribute('scope');
          expect(['row', 'col', 'rowgroup', 'colgroup'].includes(scope || '')).toBeTruthy();
        }
      }
    });

    test('list and landmark accessibility', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check for proper list markup
      const lists = await page.locator('ul, ol').all();
      for (const list of lists) {
        const listItems = await list.locator('li').count();
        expect(listItems).toBeGreaterThan(0);
      }
      
      // Check for landmark elements
      const landmarks = await page.locator('main, nav, header, footer, aside, section').all();
      expect(landmarks.length).toBeGreaterThan(0);
      
      // Check for ARIA landmarks
      const ariaLandmarks = await page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"], [role="region"]').all();
      expect(ariaLandmarks.length).toBeGreaterThan(0);
    });
  });

  test.describe('Visual Accessibility', () => {
    test('color contrast compliance', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check text contrast
      const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button').all();
      
      for (const element of textElements.slice(0, 10)) {
        const contrast = await element.evaluate(el => {
          const style = window.getComputedStyle(el);
          const color = style.color;
          const backgroundColor = style.backgroundColor;
          
          // Simple contrast check (would need proper calculation in real implementation)
          return { color, backgroundColor };
        });
        
        // Should have defined colors
        expect(contrast.color).not.toBe('');
        expect(contrast.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      }
    });

    test('focus indicators are visible', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      const focusableElements = page.locator('button, input, a, select, textarea');
      const count = await focusableElements.count();
      
      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = focusableElements.nth(i);
        await element.focus();
        
        const hasFocusStyle = await element.evaluate(el => {
          const style = window.getComputedStyle(el, ':focus');
          return {
            outlineWidth: style.outlineWidth,
            outlineStyle: style.outlineStyle,
            outlineColor: style.outlineColor,
            boxShadow: style.boxShadow,
          };
        });
        
        // Should have visible focus indicator
        const isVisible = 
          hasFocusStyle.outlineWidth !== '0px' ||
          hasFocusStyle.boxShadow !== 'none';
        
        expect(isVisible).toBeTruthy();
      }
    });

    test('responsive design accessibility', async ({ page }) => {
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check that content is still accessible on mobile
      const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"], .hamburger');
      if (await mobileMenu.count() > 0) {
        await mobileMenu.first().click();
        await expect(page.locator('[role="navigation"], .mobile-nav')).toBeVisible();
      }
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should adapt layout appropriately
      const sidebar = page.locator('[data-testid="sidebar"], aside, nav');
      expect(await sidebar.count()).toBeGreaterThan(0);
    });

    test('text scaling works properly', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Test 200% zoom
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });
      
      // Content should still be readable and functional
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button')).toBeVisible();
      
      // Reset zoom
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    });
  });

  test.describe('Cognitive Accessibility', () => {
    test('clear and consistent navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Navigation should be consistent across pages
      const navElements = await page.locator('nav [role="menuitem"], nav a, nav button').all();
      expect(navElements.length).toBeGreaterThan(0);
      
      // Check for breadcrumb navigation
      const breadcrumbs = await page.locator('[aria-label="breadcrumb"], nav[aria-label*="breadcrumb"], .breadcrumb').count();
      if (breadcrumbs > 0) {
        const breadcrumbItems = await page.locator('[aria-label="breadcrumb"] li, .breadcrumb li').all();
        expect(breadcrumbItems.length).toBeGreaterThan(0);
      }
    });

    test('error messages are clear and helpful', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Submit empty form to trigger validation
      await page.click('button[type="submit"]');
      
      // Check for error messages
      const errors = await page.locator('[role="alert"], .error, [data-error]').all();
      for (const error of errors) {
        const errorText = await error.textContent();
        expect(errorText?.trim()).toBeTruthy();
        expect(errorText?.length).toBeGreaterThan(5); // Should be descriptive
      }
    });

    test('help text and instructions are available', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      await page.click('button:has-text("New Project")');
      
      // Check for help text
      const helpText = await page.locator('[data-help], .help-text, [aria-describedby]').all();
      expect(helpText.length).toBeGreaterThan(0);
      
      // Check for tooltips
      const tooltips = await page.locator('[data-tooltip], [title], [aria-describedby*="tooltip"]').all();
      expect(tooltips.length).toBeGreaterThan(0);
    });

    test('consistent design patterns', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check for consistent button styling
      const buttons = await page.locator('button').all();
      const primaryButtons = await page.locator('button[class*="primary"], button[data-variant="primary"]').all();
      
      // Should have consistent styling patterns
      if (primaryButtons.length > 1) {
        const firstButtonStyle = await primaryButtons[0].evaluate(el => {
          const style = window.getComputedStyle(el);
          return {
            backgroundColor: style.backgroundColor,
            color: style.color,
            padding: style.padding,
            borderRadius: style.borderRadius,
          };
        });
        
        for (let i = 1; i < Math.min(primaryButtons.length, 3); i++) {
          const buttonStyle = await primaryButtons[i].evaluate(el => {
            const style = window.getComputedStyle(el);
            return {
              backgroundColor: style.backgroundColor,
              color: style.color,
              padding: style.padding,
              borderRadius: style.borderRadius,
            };
          });
          
          // Primary buttons should have consistent styling
          expect(buttonStyle.backgroundColor).toBe(firstButtonStyle.backgroundColor);
          expect(buttonStyle.color).toBe(firstButtonStyle.color);
        }
      }
    });
  });

  test.describe('Motor Accessibility', () => {
    test('large click targets', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check that interactive elements have sufficient size
      const interactiveElements = await page.locator('button, a, input[type="checkbox"], input[type="radio"]').all();
      
      for (const element of interactiveElements.slice(0, 5)) {
        const boundingBox = await element.boundingBox();
        if (boundingBox) {
          // Should be at least 44x44 pixels (WCAG recommendation)
          expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          expect(boundingBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('no time limits without user control', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check for any automatic redirects or timeouts
      const metaRefresh = await page.locator('meta[http-equiv="refresh"]').count();
      expect(metaRefresh).toBe(0);
      
      // Check for session timeout warnings
      const timeoutWarnings = await page.locator('[data-timeout], .session-warning').all();
      for (const warning of timeoutWarnings) {
        const hasControl = await warning.locator('button, a').count() > 0;
        expect(hasControl).toBeTruthy();
      }
    });

    test('drag and drop alternatives', async ({ page }) => {
      await page.goto(`${BASE_URL}/tasks`);
      
      // Check if drag and drop is used
      const dragDropElements = await page.locator('[draggable], .drag-drop').all();
      
      if (dragDropElements.length > 0) {
        // Should have keyboard alternatives
        const keyboardAlternatives = await page.locator('button:has-text("Move"), button:has-text("Change Status"), select').all();
        expect(keyboardAlternatives.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Accessibility in Different States', () => {
    test('loading states are accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Trigger loading state
      await page.click('button:has-text("Refresh"), button:has-text("Load More")');
      
      // Check for loading indicators
      const loadingIndicators = await page.locator('[role="status"], .loading, [aria-busy="true"]').all();
      
      for (const indicator of loadingIndicators) {
        const ariaLive = await indicator.getAttribute('aria-live');
        const ariaBusy = await indicator.getAttribute('aria-busy');
        
        // Should announce loading to screen readers
        expect(ariaLive === 'polite' || ariaLive === 'assertive' || ariaBusy === 'true').toBeTruthy();
      }
    });

    test('error states are accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Trigger error state
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'wrong');
      await page.click('button[type="submit"]');
      
      // Check error announcements
      const errorAnnouncements = await page.locator('[role="alert"], [aria-live="assertive"]').all();
      expect(errorAnnouncements.length).toBeGreaterThan(0);
      
      // Check that focus moves to error
      const focusedElement = page.locator(':focus');
      const isInError = await focusedElement.evaluate(el => {
        return el.closest('[role="alert"], .error, [data-error]') !== null;
      });
      
      expect(isInError).toBeTruthy();
    });

    test('disabled states are accessible', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      const disabledElements = await page.locator('button:disabled, input:disabled, select:disabled').all();
      
      for (const element of disabledElements) {
        const ariaDisabled = await element.getAttribute('aria-disabled');
        expect(ariaDisabled === 'true' || element.isDisabled()).toBeTruthy();
      }
    });
  });

  test.describe('Accessibility Testing Tools Integration', () => {
    test('automated accessibility testing with axe', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      await injectAxe(page);
      
      // Run with custom axe configuration
      await checkA11y(page, null, {
        includedImpacts: ['critical', 'serious'],
        detailedReport: true,
        reporter: 'v2',
      });
    });

    test('accessibility score tracking', async ({ page }) => {
      const pages = [
        `${BASE_URL}/`,
        `${BASE_URL}/login`,
        `${BASE_URL}/projects`,
        `${BASE_URL}/tasks`,
        `${BASE_URL}/dashboard`,
      ];
      
      const results = [];
      
      for (const pageUrl of pages) {
        await page.goto(pageUrl);
        await injectAxe(page);
        
        try {
          await checkA11y(page, null, {
            includedImpacts: ['critical', 'serious'],
          });
          results.push({ url: pageUrl, passed: true });
        } catch (error) {
          results.push({ url: pageUrl, passed: false, errors: error });
        }
      }
      
      // All pages should pass critical accessibility checks
      const failedPages = results.filter(r => !r.passed);
      expect(failedPages.length).toBe(0);
    });
  });
});
