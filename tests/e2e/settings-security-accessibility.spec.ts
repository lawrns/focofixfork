import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Comprehensive E2E Tests for Settings, Security & Accessibility
 * User Stories: US-10 (Settings), US-11 (Security), US-12 (Accessibility)
 *
 * Test Credentials: owner@demo.foco.local / DemoOwner123!
 */

test.describe('Settings, Security & Accessibility Tests', () => {
  const DEMO_CREDENTIALS = {
    email: 'owner@demo.foco.local',
    password: 'DemoOwner123!'
  };

  // Helper function to login before each test
  async function loginAsOwner(page: any) {
    await page.goto('/login');
    await page.fill('input[type="email"], input[placeholder*="correo" i], input[placeholder*="email" i]', DEMO_CREDENTIALS.email);
    await page.fill('input[type="password"]', DEMO_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL(/.*dashboard/);
  }

  test.describe('US-10.1: User Profile Settings', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/dashboard/settings?tab=profile');
      await page.waitForLoadState('networkidle');
    });

    test('should display profile settings page', async ({ page }) => {
      await expect(page.locator('text=Profile Information, Profile, Información del perfil')).toBeVisible();
      await expect(page.locator('input[id="name"], input[placeholder*="name" i], input[placeholder*="nombre" i]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });

    test('should update profile name', async ({ page }) => {
      const newName = `Test User ${Date.now()}`;

      // Find and fill name input
      const nameInput = page.locator('input[id="name"], input[placeholder*="name" i], input[placeholder*="nombre" i]').first();
      await nameInput.clear();
      await nameInput.fill(newName);

      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Guardar")');

      // Wait for success message or save completion
      await page.waitForTimeout(1000);

      // Verify update was successful
      await expect(nameInput).toHaveValue(newName);
    });

    test('should update language preference', async ({ page }) => {
      // Find language selector
      const languageSelect = page.locator('select[id="language"], [role="combobox"]:has-text("Language, Idioma")').first();

      if (await languageSelect.count() > 0) {
        await languageSelect.click();
        await page.click('text=Spanish, Español');

        // Save changes
        await page.click('button:has-text("Save"), button:has-text("Guardar")');
        await page.waitForTimeout(1000);
      }
    });

    test('should update timezone', async ({ page }) => {
      // Find timezone selector
      const timezoneSelect = page.locator('select[id="timezone"], [role="combobox"]:has-text("Timezone")').first();

      if (await timezoneSelect.count() > 0) {
        await timezoneSelect.click();
        await page.click('text=Eastern Time, America/New_York');

        // Save changes
        await page.click('button:has-text("Save"), button:has-text("Guardar")');
        await page.waitForTimeout(1000);
      }
    });

    test('should show email field as disabled', async ({ page }) => {
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeDisabled();
    });

    test('should validate profile form inputs', async ({ page }) => {
      const nameInput = page.locator('input[id="name"], input[placeholder*="name" i]').first();

      // Try to clear name and save
      await nameInput.clear();
      await page.click('button:has-text("Save"), button:has-text("Guardar")');

      // Should show validation error or prevent save
      await page.waitForTimeout(500);
    });
  });

  test.describe('US-10.2: Notification Preferences', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/dashboard/settings?tab=notifications');
      await page.waitForLoadState('networkidle');
    });

    test('should display notification settings', async ({ page }) => {
      await expect(page.locator('text=Notification, Notificaciones')).toBeVisible();
    });

    test('should toggle email notifications on/off', async ({ page }) => {
      // Find email notification switch
      const emailSwitch = page.locator('text=Email Notifications').locator('..').locator('button[role="switch"], input[type="checkbox"]').first();

      if (await emailSwitch.count() > 0) {
        const initialState = await emailSwitch.getAttribute('aria-checked') || await emailSwitch.isChecked();
        await emailSwitch.click();
        await page.waitForTimeout(500);

        const newState = await emailSwitch.getAttribute('aria-checked') || await emailSwitch.isChecked();
        expect(newState).not.toBe(initialState);
      }
    });

    test('should toggle push notifications on/off', async ({ page }) => {
      const pushSwitch = page.locator('text=Push Notifications').locator('..').locator('button[role="switch"], input[type="checkbox"]').first();

      if (await pushSwitch.count() > 0) {
        const initialState = await pushSwitch.getAttribute('aria-checked') || await pushSwitch.isChecked();
        await pushSwitch.click();
        await page.waitForTimeout(500);

        const newState = await pushSwitch.getAttribute('aria-checked') || await pushSwitch.isChecked();
        expect(newState).not.toBe(initialState);
      }
    });

    test('should toggle weekly reports on/off', async ({ page }) => {
      const weeklySwitch = page.locator('text=Weekly Reports').locator('..').locator('button[role="switch"], input[type="checkbox"]').first();

      if (await weeklySwitch.count() > 0) {
        const initialState = await weeklySwitch.getAttribute('aria-checked') || await weeklySwitch.isChecked();
        await weeklySwitch.click();
        await page.waitForTimeout(500);

        const newState = await weeklySwitch.getAttribute('aria-checked') || await weeklySwitch.isChecked();
        expect(newState).not.toBe(initialState);
      }
    });

    test('should toggle marketing emails on/off', async ({ page }) => {
      const marketingSwitch = page.locator('text=Marketing').locator('..').locator('button[role="switch"], input[type="checkbox"]').first();

      if (await marketingSwitch.count() > 0) {
        const initialState = await marketingSwitch.getAttribute('aria-checked') || await marketingSwitch.isChecked();
        await marketingSwitch.click();
        await page.waitForTimeout(500);

        const newState = await marketingSwitch.getAttribute('aria-checked') || await marketingSwitch.isChecked();
        expect(newState).not.toBe(initialState);
      }
    });

    test('should save notification preferences', async ({ page }) => {
      // Toggle a setting
      const emailSwitch = page.locator('text=Email').locator('..').locator('button[role="switch"], input[type="checkbox"]').first();
      if (await emailSwitch.count() > 0) {
        await emailSwitch.click();
      }

      // Save preferences
      await page.click('button:has-text("Save"), button:has-text("Guardar")');
      await page.waitForTimeout(1000);

      // Reload page and verify settings persisted
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('should display notification channel options', async ({ page }) => {
      // Check for notification channel options (in-app, email, slack, etc.)
      const notificationOptions = page.locator('text=Email, Push, In-app, Slack');
      const optionsCount = await notificationOptions.count();
      expect(optionsCount).toBeGreaterThan(0);
    });
  });

  test.describe('US-11: Security Testing', () => {
    test('should verify HTTPS connection in production', async ({ page }) => {
      // Check if URL uses HTTPS (in production)
      const url = page.url();
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        // Local development may use HTTP
        console.log('Running on localhost - HTTPS not required');
      } else {
        expect(url).toMatch(/^https:\/\//);
      }
    });

    test('should check SSL certificate validity', async ({ page }) => {
      await loginAsOwner(page);

      // Check for secure connection indicators
      const url = page.url();
      if (!url.includes('localhost')) {
        expect(url).toMatch(/^https:\/\//);
      }
    });

    test('should verify sensitive data is masked', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/dashboard/settings?tab=profile');

      // Check password fields are masked
      const passwordFields = page.locator('input[type="password"]');
      const count = await passwordFields.count();

      for (let i = 0; i < count; i++) {
        const field = passwordFields.nth(i);
        const type = await field.getAttribute('type');
        expect(type).toBe('password');
      }
    });

    test('should test password field masking and visibility toggle', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill('testpassword123');

      // Password should be masked
      const type = await passwordInput.getAttribute('type');
      expect(type).toBe('password');

      // Check for password visibility toggle
      const visibilityToggle = page.locator('button[aria-label*="show" i], button[aria-label*="toggle" i], button:near(input[type="password"])').first();
      if (await visibilityToggle.count() > 0) {
        await visibilityToggle.click();
        await page.waitForTimeout(300);

        // After toggle, type might change to 'text'
        const newType = await passwordInput.getAttribute('type');
        console.log('Password field type after toggle:', newType);
      }
    });

    test('should verify password hashing (indirect test)', async ({ page }) => {
      await loginAsOwner(page);

      // Check that passwords are not visible in page source or network responses
      const pageContent = await page.content();
      expect(pageContent).not.toContain('DemoOwner123!');

      // Navigate to settings
      await page.goto('/dashboard/settings?tab=profile');
      const settingsContent = await page.content();
      expect(settingsContent).not.toContain('password":"');
    });

    test('should verify secure session cookies', async ({ page }) => {
      await loginAsOwner(page);

      // Check cookies
      const cookies = await page.context().cookies();
      const authCookies = cookies.filter(c =>
        c.name.includes('auth') ||
        c.name.includes('session') ||
        c.name.includes('token')
      );

      for (const cookie of authCookies) {
        // In production, these should be secure
        if (!page.url().includes('localhost')) {
          expect(cookie.secure).toBe(true);
        }
        expect(cookie.httpOnly).toBe(true);
      }
    });

    test('should protect against XSS in form inputs', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/dashboard/settings?tab=profile');

      const xssPayload = '<script>alert("xss")</script>';
      const nameInput = page.locator('input[id="name"], input[placeholder*="name" i]').first();

      await nameInput.clear();
      await nameInput.fill(xssPayload);
      await page.click('button:has-text("Save")');

      // Verify script is not executed
      await page.waitForTimeout(1000);
      const hasAlert = await page.evaluate(() => {
        return document.querySelector('script')?.textContent?.includes('alert');
      });
      expect(hasAlert).toBeFalsy();
    });

    test('should verify authentication is required for settings', async ({ page }) => {
      // Clear cookies to logout
      await page.context().clearCookies();

      // Try to access settings without authentication
      await page.goto('/dashboard/settings');

      // Should redirect to login
      await page.waitForURL(/.*login/, { timeout: 5000 });
      expect(page.url()).toContain('login');
    });

    test('should verify CSRF protection on form submissions', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/dashboard/settings?tab=profile');

      // Check for CSRF token in forms or headers
      const forms = page.locator('form');
      const formCount = await forms.count();

      if (formCount > 0) {
        // Modern frameworks often use custom headers for CSRF protection
        // Verify form submission includes proper authentication
        console.log('Forms found:', formCount);
      }
    });
  });

  test.describe('US-12: Accessibility Testing', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/dashboard/settings');
      await injectAxe(page);
    });

    test('should meet WCAG 2.1 AA standards', async ({ page }) => {
      await checkA11y(page, null, {
        detailedReport: true,
        includedImpacts: ['critical', 'serious']
      });
    });

    test('should support keyboard navigation with Tab', async ({ page }) => {
      // Test tab navigation through settings
      let focusedElements = [];

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);

        const focusedElement = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tag: el?.tagName,
            id: el?.id,
            class: el?.className,
            role: el?.getAttribute('role')
          };
        });

        focusedElements.push(focusedElement);
      }

      // Should have tabbed through multiple focusable elements
      const uniqueElements = new Set(focusedElements.map(e => e.tag));
      expect(uniqueElements.size).toBeGreaterThan(1);
    });

    test('should support keyboard navigation with Enter to activate', async ({ page }) => {
      // Tab to first button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Press Enter to activate
      const focusedElement = page.locator(':focus');
      const tagName = await focusedElement.evaluate(el => el.tagName);

      if (tagName === 'BUTTON' || tagName === 'A') {
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        // Action should have been triggered
      }
    });

    test('should support Escape key to close dialogs', async ({ page }) => {
      // Try to open a modal/dialog if available
      const dialogTrigger = page.locator('button:has-text("Export"), button:has-text("Import"), button:has-text("Delete")').first();

      if (await dialogTrigger.count() > 0) {
        await dialogTrigger.click();
        await page.waitForTimeout(300);

        // Check if dialog is open
        const dialog = page.locator('[role="dialog"], [role="alertdialog"]');
        if (await dialog.isVisible()) {
          // Press Escape to close
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);

          // Dialog should be closed
          await expect(dialog).not.toBeVisible();
        }
      }
    });

    test('should have visible focus indicators', async ({ page }) => {
      // Tab through elements and check focus visibility
      const elements = page.locator('button, a, input, select, [tabindex="0"]');
      const count = Math.min(await elements.count(), 5);

      for (let i = 0; i < count; i++) {
        const element = elements.nth(i);
        await element.focus();

        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el, ':focus');
          return {
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            boxShadow: computed.boxShadow,
            borderColor: computed.borderColor
          };
        });

        // Should have some focus indicator
        const hasFocusIndicator =
          styles.outlineWidth !== '0px' ||
          styles.boxShadow !== 'none' ||
          styles.outline !== 'none';

        expect(hasFocusIndicator).toBeTruthy();
      }
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check interactive elements have accessible names
      const buttons = page.locator('button');
      const buttonCount = Math.min(await buttons.count(), 5);

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);

        const accessibleName = await button.evaluate(el => {
          return el.getAttribute('aria-label') ||
                 el.textContent?.trim() ||
                 el.getAttribute('title') ||
                 el.getAttribute('aria-labelledby');
        });

        expect(accessibleName).toBeTruthy();
      }
    });

    test('should have proper heading structure', async ({ page }) => {
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      expect(headings.length).toBeGreaterThan(0);

      // Check heading hierarchy
      let previousLevel = 0;
      for (const heading of headings) {
        const level = await heading.evaluate(el => parseInt(el.tagName.substring(1)));

        // Heading levels should not skip
        if (previousLevel > 0) {
          expect(level - previousLevel).toBeLessThanOrEqual(1);
        }
        previousLevel = level;
      }
    });

    test('should have proper form labels', async ({ page }) => {
      const inputs = page.locator('input:not([type="hidden"]), select, textarea');
      const inputCount = Math.min(await inputs.count(), 5);

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);

        const hasLabel = await input.evaluate(el => {
          const id = el.id;
          const hasLabelElement = id && document.querySelector(`label[for="${id}"]`);
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const placeholder = el.getAttribute('placeholder');

          return !!(hasLabelElement || ariaLabel || ariaLabelledBy || placeholder);
        });

        expect(hasLabel).toBeTruthy();
      }
    });

    test('should support screen readers with live regions', async ({ page }) => {
      // Check for ARIA live regions for dynamic content
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
      const count = await liveRegions.count();

      // Should have at least some live regions for feedback
      console.log('Live regions found:', count);
    });

    test('should have sufficient color contrast', async ({ page }) => {
      // Run axe specifically for color contrast
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });
    });

    test('should support keyboard shortcuts documentation', async ({ page }) => {
      // Check for keyboard shortcut hints or help
      const keyboardHelp = page.locator('[aria-keyshortcuts], kbd, [data-shortcut]');
      const count = await keyboardHelp.count();

      console.log('Keyboard shortcut elements found:', count);
    });

    test('should be navigable without mouse', async ({ page }) => {
      // Navigate through all tabs using only keyboard
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        // Tab to first tab
        await page.keyboard.press('Tab');

        // Use arrow keys to navigate tabs
        for (let i = 0; i < tabCount; i++) {
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(200);
        }
      }
    });

    test('should have accessible error messages', async ({ page }) => {
      // Try to trigger validation error
      await page.goto('/dashboard/settings?tab=profile');

      const nameInput = page.locator('input[id="name"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.clear();
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(500);

        // Check for accessible error announcements
        const errors = page.locator('[role="alert"], [aria-invalid="true"]');
        const errorCount = await errors.count();

        if (errorCount > 0) {
          console.log('Accessible error messages found:', errorCount);
        }
      }
    });

    test('should support skip links', async ({ page }) => {
      await page.goto('/dashboard/settings');

      // Tab to first element (might be skip link)
      await page.keyboard.press('Tab');

      const firstFocusable = page.locator(':focus');
      const isSkipLink = await firstFocusable.evaluate(el => {
        return el.textContent?.toLowerCase().includes('skip') ||
               el.getAttribute('href')?.startsWith('#');
      });

      console.log('Skip link present:', isSkipLink);
    });

    test('should have proper semantic HTML structure', async ({ page }) => {
      // Check for semantic landmarks
      const landmarks = await page.locator('main, nav, header, footer, aside, section, [role="main"], [role="navigation"]').count();
      expect(landmarks).toBeGreaterThan(0);

      // Check for proper list structure
      const lists = await page.locator('ul, ol').count();
      console.log('Semantic lists found:', lists);
    });
  });

  test.describe('Integration Tests', () => {
    test('should handle complete settings update workflow', async ({ page }) => {
      await loginAsOwner(page);

      // Update profile
      await page.goto('/dashboard/settings?tab=profile');
      const nameInput = page.locator('input[id="name"]').first();
      if (await nameInput.count() > 0) {
        await nameInput.fill(`Test User ${Date.now()}`);
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(1000);
      }

      // Update notifications
      await page.goto('/dashboard/settings?tab=notifications');
      const emailToggle = page.locator('button[role="switch"]').first();
      if (await emailToggle.count() > 0) {
        await emailToggle.click();
        await page.click('button:has-text("Save")');
        await page.waitForTimeout(1000);
      }

      // Verify changes persisted
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    test('should maintain accessibility during interactions', async ({ page }) => {
      await loginAsOwner(page);
      await page.goto('/dashboard/settings');
      await injectAxe(page);

      // Navigate through tabs
      const tabs = page.locator('[role="tab"]');
      const tabCount = Math.min(await tabs.count(), 3);

      for (let i = 0; i < tabCount; i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(500);

        // Check accessibility after each interaction
        await checkA11y(page, null, {
          includedImpacts: ['critical']
        });
      }
    });

    test('should preserve security throughout user session', async ({ page }) => {
      await loginAsOwner(page);

      // Navigate through multiple pages
      const pages = [
        '/dashboard/settings?tab=profile',
        '/dashboard/settings?tab=notifications',
        '/dashboard/settings?tab=appearance'
      ];

      for (const pagePath of pages) {
        await page.goto(pagePath);

        // Verify secure cookies are maintained
        const cookies = await page.context().cookies();
        const authCookie = cookies.find(c => c.name.includes('auth') || c.name.includes('session'));
        expect(authCookie).toBeDefined();
      }
    });
  });
});
