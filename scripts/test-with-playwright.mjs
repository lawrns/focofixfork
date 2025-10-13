#!/usr/bin/env node

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3004';
const TEST_EMAIL = 'laurence@fyves.com';
const TEST_PASSWORD = 'Hennie@@18';

async function testUserFlow() {
  console.log('🚀 Starting User Flow Test with Playwright\n');

  const browser = await chromium.launch({
    headless: false,
    timeout: 30000
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`${msg.text()}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  try {
    // Step 1: Login
    console.log('📝 Step 1: Testing Login');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    console.log('   ✅ Login successful - redirected to dashboard\n');

    // Step 2: Navigate to Tasks
    console.log('📋 Step 2: Testing Tasks Page');
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('   ✅ Tasks page loaded\n');

    // Step 3: Test Modal Opening
    console.log('🎯 Step 3: Testing Task Modal');
    const newTaskButton = page.locator('button').filter({ hasText: 'New Task' }).first();
    await newTaskButton.click();

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('   ✅ Modal opened\n');

    // Step 4: Check Modal Scrollability
    console.log('📜 Step 4: Testing Modal Scroll');
    const dialog = page.locator('[role="dialog"]').first();
    const scrollInfo = await dialog.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        overflowY: styles.overflowY,
        maxHeight: styles.maxHeight,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        canScroll: el.scrollHeight > el.clientHeight
      };
    });

    console.log(`   Modal overflow-y: ${scrollInfo.overflowY}`);
    console.log(`   Modal max-height: ${scrollInfo.maxHeight}`);
    console.log(`   Scroll height: ${scrollInfo.scrollHeight}px`);
    console.log(`   Client height: ${scrollInfo.clientHeight}px`);
    console.log(`   Can scroll: ${scrollInfo.canScroll ? '✅ YES' : '❌ NO'}\n`);

    // Step 5: Test Form Interaction
    console.log('✍️  Step 5: Testing Form Fields');
    await page.fill('input[placeholder*="task title"]', 'Test Task from Automated Script');
    console.log('   ✅ Filled task title');

    await page.waitForTimeout(500);

    // Test project dropdown
    console.log('\n🔽 Step 6: Testing Project Dropdown');
    const projectButton = page.locator('button').filter({ hasText: 'Select project' }).first();
    await projectButton.click();
    await page.waitForTimeout(1000);

    const dropdownVisible = await page.locator('[role="listbox"]').count() > 0;
    if (dropdownVisible) {
      console.log('   ✅ Dropdown opened');

      const options = await page.locator('[role="option"]').count();
      console.log(`   Found ${options} project options`);

      if (options > 0) {
        await page.locator('[role="option"]').first().click();
        console.log('   ✅ Selected first project\n');
      }
    } else {
      console.log('   ⚠️  Dropdown did not open\n');
    }

    // Step 7: Test Submit Button Visibility
    console.log('🔘 Step 7: Testing Submit Button');
    await dialog.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(500);

    const createButton = page.locator('button').filter({ hasText: 'Create Task' }).first();
    const isVisible = await createButton.isVisible();
    const isEnabled = await createButton.isEnabled();
    console.log(`   Button visible: ${isVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`   Button enabled: ${isEnabled ? '✅ YES' : '❌ NO'}\n`);

    // Close modal
    const cancelButton = page.locator('button').filter({ hasText: 'Cancel' }).first();
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Modal closed\n');
    }

    // Step 8: Test Bulk Selection
    console.log('☑️  Step 8: Testing Bulk Selection UI');
    const selectAllCheckbox = page.locator('#select-all');
    const hasSelectAll = await selectAllCheckbox.count() > 0;

    if (hasSelectAll) {
      console.log('   ✅ Select All checkbox found');

      const taskCheckboxes = await page.locator('input[type="checkbox"]').count();
      console.log(`   Found ${taskCheckboxes} total checkboxes`);

      if (taskCheckboxes > 1) {
        await selectAllCheckbox.check();
        await page.waitForTimeout(500);

        const deleteButton = page.locator('button').filter({ hasText: 'Delete' }).filter({ hasText: '(' });
        const hasDeleteButton = await deleteButton.count() > 0;

        if (hasDeleteButton) {
          console.log('   ✅ Bulk delete button appeared\n');
        } else {
          console.log('   ⚠️  Bulk delete button not found\n');
        }
      }
    } else {
      console.log('   ❌ Select All checkbox not found\n');
    }

    // Step 9: Test Other Pages
    console.log('🗺️  Step 9: Testing Other Pages');

    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Projects page loaded');

    await page.goto(`${BASE_URL}/dashboard/goals`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Goals page loaded');

    await page.goto(`${BASE_URL}/dashboard/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Analytics page loaded');

    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Reports page loaded\n');

    // Report Results
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST RESULTS');
    console.log('═══════════════════════════════════════\n');

    if (consoleErrors.length > 0) {
      console.log('❌ CONSOLE ERRORS FOUND:');
      consoleErrors.slice(0, 10).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 100)}`);
      });
      if (consoleErrors.length > 10) {
        console.log(`   ... and ${consoleErrors.length - 10} more errors`);
      }
      console.log('');
    } else {
      console.log('✅ NO CONSOLE ERRORS!\n');
    }

    if (pageErrors.length > 0) {
      console.log('❌ PAGE ERRORS FOUND:');
      pageErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 100)}`);
      });
      console.log('');
    } else {
      console.log('✅ NO PAGE ERRORS!\n');
    }

    console.log('═══════════════════════════════════════\n');

    await page.screenshot({ path: '/tmp/test-result.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/test-result.png');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: '/tmp/test-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/test-error.png');
    throw error;
  } finally {
    await browser.close();
  }
}

testUserFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
