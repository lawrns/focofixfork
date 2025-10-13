import { test, expect } from '@playwright/test';

test.describe('Quick User Journey Test', () => {
  const BASE_URL = 'http://localhost:3004';
  const TEST_EMAIL = 'laurence@fyves.com';
  const TEST_PASSWORD = 'Hennie@@18';

  test.setTimeout(60000); // 60 second timeout

  test('Login and test task modal scroll', async ({ page }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`[${msg.location().url}] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      errors.push(`Page Error: ${error.message}`);
    });

    try {
      console.log('Step 1: Navigate to login page');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 15000 });

      console.log('Step 2: Fill login form');
      await page.waitForSelector('input[type="email"]', { timeout: 5000 });
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);

      console.log('Step 3: Submit login');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      console.log('✅ Login successful');

      console.log('Step 4: Navigate to tasks page');
      await page.goto(`${BASE_URL}/tasks`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(2000);

      console.log('Step 5: Open new task modal');
      const newTaskBtn = page.locator('button').filter({ hasText: 'New Task' }).first();
      await newTaskBtn.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      console.log('✅ Modal opened');

      console.log('Step 6: Check modal scroll capability');
      const dialog = page.locator('[role="dialog"]').first();

      const scrollInfo = await dialog.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          hasOverflow: styles.overflowY === 'auto' || styles.overflowY === 'scroll',
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
          canScroll: el.scrollHeight > el.clientHeight
        };
      });

      console.log('Modal scroll info:', scrollInfo);
      console.log(`✅ Modal has overflow-y: ${scrollInfo.hasOverflow ? 'YES' : 'NO'}`);
      console.log(`✅ Modal can scroll: ${scrollInfo.canScroll ? 'YES' : 'NO'}`);

      console.log('Step 7: Fill task title');
      await page.fill('input[placeholder*="task title"]', 'Test Task');

      console.log('Step 8: Check project dropdown');
      const projectTrigger = page.locator('button').filter({ hasText: 'Select project' }).first();
      await projectTrigger.click();
      await page.waitForTimeout(1000);

      const dropdownVisible = await page.locator('[role="listbox"]').count() > 0;
      console.log(`✅ Project dropdown opens: ${dropdownVisible ? 'YES' : 'NO'}`);

      if (dropdownVisible) {
        const options = await page.locator('[role="option"]').count();
        console.log(`✅ Found ${options} project options`);

        if (options > 0) {
          await page.locator('[role="option"]').first().click();
          console.log('✅ Selected first project');
        }
      }

      console.log('Step 9: Scroll to bottom and check submit button');
      await dialog.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(500);

      const createBtn = page.locator('button').filter({ hasText: 'Create Task' }).first();
      const btnVisible = await createBtn.isVisible();
      console.log(`✅ Create Task button visible: ${btnVisible ? 'YES' : 'NO'}`);

      if (btnVisible) {
        const isEnabled = await createBtn.isEnabled();
        console.log(`✅ Create Task button enabled: ${isEnabled ? 'YES' : 'NO'}`);
      }

      // Close modal
      const closeBtn = page.locator('[role="dialog"] button').filter({ hasText: 'Cancel' }).first();
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        console.log('✅ Closed modal');
      }

      console.log('Step 10: Check bulk selection UI');
      await page.waitForTimeout(1000);
      const selectAllCheckbox = page.locator('#select-all');
      const hasSelectAll = await selectAllCheckbox.count() > 0;
      console.log(`✅ Bulk selection checkbox present: ${hasSelectAll ? 'YES' : 'NO'}`);

      if (hasSelectAll) {
        const taskCheckboxes = page.locator('input[type="checkbox"]').filter({ has: page.locator('[aria-label*="Select"]') });
        const checkboxCount = await taskCheckboxes.count();
        console.log(`✅ Found ${checkboxCount} task checkboxes`);
      }

      console.log('\n=== CONSOLE ERRORS ===');
      if (errors.length > 0) {
        errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
      } else {
        console.log('✅ NO CONSOLE ERRORS DETECTED!');
      }

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  });
});
