import { test, expect } from '@playwright/test';

test.describe('Full User Journey Test', () => {
  const BASE_URL = 'http://localhost:3004';
  const TEST_EMAIL = 'laurence@fyves.com';
  const TEST_PASSWORD = 'Hennie@@18';

  test('Complete user journey: login, create task, bulk operations', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    console.log('✓ Navigated to login page');

    // Fill in login credentials
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    console.log('✓ Filled in credentials');

    // Click login button
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
    console.log('✓ Logged in successfully');

    // Navigate to tasks page
    await page.goto(`${BASE_URL}/tasks`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Navigated to tasks page');

    // Check for console errors
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(`Console Error: ${msg.text()}`);
      }
    });

    // Open create task modal
    const newTaskButton = page.locator('button:has-text("New Task")').first();
    await newTaskButton.click();
    console.log('✓ Opened create task modal');

    // Wait for modal to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('✓ Modal appeared');

    // Check if modal is scrollable
    const dialogContent = page.locator('[role="dialog"]');
    const isScrollable = await dialogContent.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });
    console.log(`✓ Modal scrollable: ${isScrollable}`);

    // Fill in task form
    await page.fill('input[placeholder="Enter task title"]', 'Test Task from Playwright');
    console.log('✓ Filled task title');

    // Try to open project dropdown
    const projectSelect = page.locator('button:has-text("Select project")').first();
    await projectSelect.click();
    await page.waitForTimeout(1000);

    // Check if dropdown opened
    const dropdownVisible = await page.locator('[role="listbox"]').isVisible();
    console.log(`✓ Project dropdown visible: ${dropdownVisible}`);

    if (dropdownVisible) {
      // Select first project
      const firstProject = page.locator('[role="option"]').first();
      await firstProject.click();
      console.log('✓ Selected project');
    }

    // Scroll to bottom of modal to reach submit button
    await dialogContent.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    console.log('✓ Scrolled modal to bottom');

    await page.waitForTimeout(500);

    // Look for Create Task button
    const createButton = page.locator('button:has-text("Create Task")').first();
    const isCreateButtonVisible = await createButton.isVisible();
    console.log(`✓ Create button visible: ${isCreateButtonVisible}`);

    if (isCreateButtonVisible && dropdownVisible) {
      await createButton.click();
      console.log('✓ Clicked create button');

      // Wait for modal to close
      await page.waitForTimeout(2000);
    }

    // Close modal if still open
    const closeButton = page.locator('[role="dialog"] button[aria-label="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
      console.log('✓ Closed modal manually');
    }

    await page.waitForTimeout(1000);

    // Check for bulk selection UI
    const selectAllCheckbox = page.locator('input[type="checkbox"]#select-all');
    const hasSelectAll = await selectAllCheckbox.count() > 0;
    console.log(`✓ Bulk selection UI present: ${hasSelectAll}`);

    if (hasSelectAll) {
      // Try to select all tasks
      await selectAllCheckbox.check();
      await page.waitForTimeout(500);

      // Check if delete button appears
      const bulkDeleteButton = page.locator('button:has-text("Delete")').filter({ hasText: '(' });
      const hasBulkDelete = await bulkDeleteButton.count() > 0;
      console.log(`✓ Bulk delete button visible: ${hasBulkDelete}`);
    }

    // Navigate to other pages to test
    await page.goto(`${BASE_URL}/projects`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Projects page loaded');

    await page.goto(`${BASE_URL}/dashboard/goals`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Goals page loaded');

    await page.goto(`${BASE_URL}/reports`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Reports page loaded');

    await page.goto(`${BASE_URL}/favorites`);
    await page.waitForLoadState('networkidle');
    console.log('✓ Favorites page loaded');

    // Log any console errors found
    if (consoleMessages.length > 0) {
      console.log('\n⚠️  Console Errors Found:');
      consoleMessages.forEach(msg => console.log(msg));
    } else {
      console.log('\n✅ No console errors detected');
    }

    // Take screenshot of final state
    await page.screenshot({ path: '/tmp/final-state.png', fullPage: true });
    console.log('✓ Screenshot saved to /tmp/final-state.png');
  });
});
