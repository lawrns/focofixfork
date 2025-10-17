import { test, expect } from '@playwright/test';

const ISSUES: any[] = [];
let errorCount = 0;

test.describe('Comprehensive Foco.mx Audit', () => {
  test.beforeEach(({ page }) => {
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errorCount++;
        ISSUES.push({
          type: 'CONSOLE_ERROR',
          message: msg.text(),
          severity: 'HIGH',
          location: 'browser console'
        });
      }
    });

    // Capture page errors
    page.on('pageerror', (err) => {
      ISSUES.push({
        type: 'PAGE_ERROR',
        message: err.message,
        stack: err.stack?.split('\n')[0],
        severity: 'CRITICAL'
      });
    });
  });

  test('Login and navigate app', async ({ page }) => {
    console.log('🚀 Starting comprehensive audit...\n');

    // Step 1: Navigate to app
    console.log('1️⃣ Navigating to http://localhost:3000...');
    try {
      await page.goto('http://localhost:3000', { waitUntil: 'load', timeout: 30000 });
      console.log('✅ Navigation successful');
    } catch (e) {
      ISSUES.push({
        type: 'NAVIGATION_FAILED',
        error: String(e),
        severity: 'CRITICAL'
      });
      console.log('❌ Navigation failed:', e);
    }

    // Step 2: Check if login page is displayed
    console.log('\n2️⃣ Checking login page...');
    const emailInput = page.locator('input[type="email"]');
    const hasLogin = await emailInput.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasLogin) {
      ISSUES.push({
        type: 'LOGIN_PAGE_NOT_FOUND',
        message: 'Email input not found on login page',
        severity: 'CRITICAL'
      });
      console.log('❌ Login page not found');
    } else {
      console.log('✅ Login page visible');

      // Step 3: Attempt login
      console.log('\n3️⃣ Attempting login with laurence@fyves.com / hennie12...');
      try {
        await emailInput.fill('laurence@fyves.com');
        const passwordInput = page.locator('input[type="password"]');
        await passwordInput.fill('hennie12');

        const submitButton = page.locator('button[type="submit"]');
        await submitButton.click();

        // Wait for navigation
        await page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(1000);

        console.log('✅ Login attempted');
      } catch (e) {
        ISSUES.push({
          type: 'LOGIN_FAILED',
          error: String(e),
          severity: 'CRITICAL'
        });
        console.log('❌ Login failed:', e);
      }
    }

    await page.waitForTimeout(2000);
    console.log('\nCurrent URL:', page.url());

    // Step 4: Check for All Projects filter
    console.log('\n4️⃣ Testing project filtering feature...');
    const filterButton = page.locator('text=/All Projects|Filter|Projects/i').first();
    const filterButtonExists = await filterButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!filterButtonExists) {
      ISSUES.push({
        type: 'PROJECT_FILTER_NOT_FOUND',
        message: 'Project filter button/dropdown not found',
        severity: 'HIGH'
      });
      console.log('⚠️ Project filter button not found');
    } else {
      console.log('✅ Project filter found');
      try {
        await filterButton.click();
        await page.waitForTimeout(500);

        // Check if dropdown menu appears
        const menu = page.locator('[role="menu"], [role="listbox"], .dropdown').first();
        const menuVisible = await menu.isVisible({ timeout: 3000 }).catch(() => false);

        if (!menuVisible) {
          ISSUES.push({
            type: 'FILTER_DROPDOWN_NOT_WORKING',
            message: 'Filter dropdown menu does not appear when clicked',
            severity: 'HIGH'
          });
          console.log('⚠️ Filter dropdown not appearing');
        } else {
          const menuText = await menu.textContent();
          console.log('✅ Filter menu appears with options:', menuText?.substring(0, 50));
        }
      } catch (e) {
        ISSUES.push({
          type: 'FILTER_INTERACTION_ERROR',
          error: String(e),
          severity: 'MEDIUM'
        });
        console.log('⚠️ Error interacting with filter');
      }
    }

    // Step 5: Check task creation
    console.log('\n5️⃣ Testing task creation...');
    const taskButtons = page.locator('button:has-text(/New Task|Add Task|Create Task|\\+/)');
    const taskButtonCount = await taskButtons.count();

    if (taskButtonCount === 0) {
      ISSUES.push({
        type: 'NO_TASK_CREATION_BUTTON',
        message: 'No task creation button found',
        severity: 'HIGH'
      });
      console.log('⚠️ No task creation button found');
    } else {
      console.log(`✅ Found ${taskButtonCount} task creation button(s)`);

      try {
        // Try clicking first task button
        await taskButtons.first().click();
        await page.waitForTimeout(500);

        // Check if form appears
        const formFields = page.locator('input[type="text"], textarea, select');
        const formCount = await formFields.count();

        if (formCount === 0) {
          ISSUES.push({
            type: 'TASK_FORM_NOT_APPEARING',
            message: 'Task form does not appear when create button clicked',
            severity: 'HIGH'
          });
          console.log('⚠️ Task form not appearing');
        } else {
          console.log(`✅ Task form appears with ${formCount} form fields`);

          // Check for project selector
          const projectSelector = page.locator('select[name*="project"], input[name*="project"], [data-testid*="project"]');
          const hasProjectSelector = await projectSelector.isVisible({ timeout: 3000 }).catch(() => false);

          if (!hasProjectSelector) {
            ISSUES.push({
              type: 'NO_PROJECT_SELECTOR_IN_TASK_FORM',
              message: 'Task form does not have project selector field',
              severity: 'HIGH',
              impact: 'Users cannot assign projects to new tasks'
            });
            console.log('❌ Project selector missing in task form');
          } else {
            console.log('✅ Project selector found in task form');
          }
        }
      } catch (e) {
        ISSUES.push({
          type: 'TASK_CREATION_ERROR',
          error: String(e),
          severity: 'MEDIUM'
        });
        console.log('⚠️ Error testing task creation');
      }
    }

    // Step 6: Test AI creation feature
    console.log('\n6️⃣ Testing "Create with AI" feature...');
    const aiButtons = page.locator('button:has-text(/AI|Create with AI|Generate|Magic/)');
    const aiButtonCount = await aiButtons.count();

    if (aiButtonCount === 0) {
      ISSUES.push({
        type: 'NO_AI_CREATION_BUTTON',
        message: '"Create with AI" button not found',
        severity: 'MEDIUM'
      });
      console.log('⚠️ No AI button found');
    } else {
      console.log(`✅ Found ${aiButtonCount} AI button(s)`);

      try {
        await aiButtons.first().click();
        await page.waitForTimeout(2000);

        // Check for errors
        const errorElements = page.locator('[role="alert"], .error, .alert-error, .toast-error');
        const errorCount = await errorElements.count();

        if (errorCount > 0) {
          const errorText = await errorElements.first().textContent();
          ISSUES.push({
            type: 'AI_CREATION_ERROR',
            message: errorText || 'AI creation produced an error',
            severity: 'CRITICAL',
            errorElement: true
          });
          console.log('❌ AI creation error:', errorText);
        } else {
          console.log('✅ AI creation button works (no immediate error)');
        }
      } catch (e) {
        ISSUES.push({
          type: 'AI_BUTTON_INTERACTION_ERROR',
          error: String(e),
          severity: 'MEDIUM'
        });
        console.log('⚠️ Error clicking AI button');
      }
    }

    // Step 7: Test scrolling behavior
    console.log('\n7️⃣ Testing scroll behavior and layout...');
    try {
      const viewport = page.viewportSize();
      console.log(`📱 Viewport: ${viewport?.width}x${viewport?.height}`);

      // Get initial scroll position
      const initialScroll = await page.evaluate(() => window.scrollY);

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(300);

      const afterScroll = await page.evaluate(() => window.scrollY);
      console.log(`Scrolled from ${initialScroll}px to ${afterScroll}px`);

      // Check for elements that fall off screen
      const hiddenContent = await page.evaluate(() => {
        const elements = [];
        document.querySelectorAll('*').forEach((el: any) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);

          // Check if visible but off-screen or hidden
          if (el.textContent && el.textContent.length > 10) {
            if (rect.bottom < 0 || rect.top > window.innerHeight) {
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                elements.push({
                  tag: el.tagName,
                  class: el.className.substring(0, 30),
                  content: el.textContent.substring(0, 30),
                  rect: { top: rect.top, bottom: rect.bottom }
                });
              }
            }
          }
        });
        return elements;
      });

      if (hiddenContent.length > 5) {
        ISSUES.push({
          type: 'CONTENT_FALLS_OFF_SCREEN',
          message: `${hiddenContent.length} content blocks fall out of view when scrolling`,
          examples: hiddenContent.slice(0, 3),
          severity: 'MEDIUM'
        });
        console.log(`⚠️ Content falls off screen (${hiddenContent.length} items)`);
      } else {
        console.log('✅ Scroll behavior appears normal');
      }
    } catch (e) {
      ISSUES.push({
        type: 'SCROLL_TEST_ERROR',
        error: String(e),
        severity: 'LOW'
      });
    }

    // Step 8: Check for layout/overflow issues
    console.log('\n8️⃣ Checking for layout overflow issues...');
    const overflowIssues = await page.evaluate(() => {
      const issues = [];
      document.querySelectorAll('*').forEach((el: any) => {
        const style = window.getComputedStyle(el);
        const hasOverflow = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;

        if (hasOverflow && (el.className.includes('table') || el.tagName === 'TABLE')) {
          issues.push({
            type: 'TABLE_OVERFLOW',
            element: el.className.substring(0, 40),
            overflowX: el.scrollWidth - el.clientWidth,
            overflowY: el.scrollHeight - el.clientHeight
          });
        }
      });
      return issues;
    });

    if (overflowIssues.length > 0) {
      ISSUES.push({
        type: 'UI_OVERFLOW_DETECTED',
        message: `${overflowIssues.length} elements have overflow issues`,
        issues: overflowIssues.slice(0, 3),
        severity: 'MEDIUM'
      });
      console.log(`⚠️ Layout overflow detected on ${overflowIssues.length} elements`);
    } else {
      console.log('✅ No major layout overflow issues detected');
    }

    // Step 9: Check for missing elements/features
    console.log('\n9️⃣ Checking for key UI elements...');
    const keyElements = {
      'header': page.locator('header'),
      'sidebar': page.locator('aside, nav, [role="navigation"]').first(),
      'main-content': page.locator('main, [role="main"]').first(),
      'floating-chat': page.locator('[data-testid*="chat"], .chat, .ai-chat').first(),
      'projects-section': page.locator('text=/Projects|Tasks/i').first()
    };

    for (const [name, locator] of Object.entries(keyElements)) {
      const exists = await locator.isVisible({ timeout: 2000 }).catch(() => false);
      if (!exists) {
        ISSUES.push({
          type: 'MISSING_UI_ELEMENT',
          element: name,
          severity: 'MEDIUM'
        });
        console.log(`⚠️ ${name} not found`);
      } else {
        console.log(`✅ ${name} found`);
      }
    }

    // Step 10: Check database/API errors
    console.log('\n🔟 Checking for API/database errors...');
    const apiErrors = await page.evaluate(() => {
      const errors = [];

      // Check for failed network requests in performance timing
      if (window.performance && window.performance.getEntriesByType) {
        const resources = window.performance.getEntriesByType('resource');
        resources.forEach((entry: any) => {
          if (entry.name.includes('/api/') && entry.duration > 5000) {
            errors.push({
              type: 'SLOW_API_RESPONSE',
              url: entry.name.substring(entry.name.indexOf('/api')),
              duration: Math.round(entry.duration)
            });
          }
        });
      }

      return errors;
    });

    if (apiErrors.length > 0) {
      ISSUES.push({
        type: 'API_PERFORMANCE_ISSUES',
        issues: apiErrors.slice(0, 5),
        severity: 'MEDIUM'
      });
      console.log(`⚠️ ${apiErrors.length} slow API responses detected`);
    } else {
      console.log('✅ No major API performance issues');
    }

    // Final summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE AUDIT COMPLETE');
    console.log('='.repeat(80));
    console.log(`\nTotal Issues Found: ${ISSUES.length}`);
    console.log(`Console Errors: ${errorCount}`);

    const bySeverity = {
      CRITICAL: ISSUES.filter(i => i.severity === 'CRITICAL').length,
      HIGH: ISSUES.filter(i => i.severity === 'HIGH').length,
      MEDIUM: ISSUES.filter(i => i.severity === 'MEDIUM').length,
      LOW: ISSUES.filter(i => i.severity === 'LOW').length
    };

    console.log('\nBy Severity:');
    console.log(`  🔴 CRITICAL: ${bySeverity.CRITICAL}`);
    console.log(`  🟠 HIGH: ${bySeverity.HIGH}`);
    console.log(`  🟡 MEDIUM: ${bySeverity.MEDIUM}`);
    console.log(`  🟢 LOW: ${bySeverity.LOW}`);

    console.log('\n\nFull Issues Report:');
    console.log(JSON.stringify(ISSUES, null, 2));

    // Write to file
    const fs = require('fs');
    fs.writeFileSync('/tmp/audit-report.json', JSON.stringify(ISSUES, null, 2));
    console.log('\n✅ Report saved to /tmp/audit-report.json');
  });
});
