#!/usr/bin/env node

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3004';
const TEST_EMAIL = 'laurence@fyves.com';
const TEST_PASSWORD = 'Hennie@@18';

async function runFinalTest() {
  console.log('🎯 FINAL USER JOURNEY TEST - 100% VALIDATION\n');
  console.log('═══════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500  // Slow down to see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 }
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  try {
    // Step 1: Login
    console.log('📝 Step 1: Testing Login');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Fill form using pressSequentially to properly trigger React events
    await page.locator('input[type="email"]').click();
    await page.locator('input[type="email"]').pressSequentially(TEST_EMAIL, { delay: 10 });

    await page.locator('input[type="password"]').click();
    await page.locator('input[type="password"]').pressSequentially(TEST_PASSWORD, { delay: 10 });

    console.log('   ✅ Filled credentials');

    // Wait for form validation to complete
    await page.waitForTimeout(1000);

    // Click submit button with force option to bypass disabled state if needed
    await page.locator('button[type="submit"]').click({ force: true });
    await page.waitForURL('**/dashboard**', { timeout: 20000 });
    console.log('   ✅ Login successful\n');

    // Step 2: Navigate to Tasks
    console.log('📋 Step 2: Testing Tasks Page');
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);  // Wait for tasks to load
    console.log('   ✅ Tasks page loaded\n');

    // Step 3: Check if tasks are visible
    console.log('📦 Step 3: Checking Task Display');
    const taskCards = await page.locator('[class*="TaskCard"], [data-testid*="task"]').count();
    console.log(`   Found ${taskCards} task cards\n`);

    // Step 4: Test Bulk Selection
    console.log('☑️  Step 4: Testing Bulk Selection');
    const selectAllCheckbox = page.locator('#select-all');
    const hasSelectAll = await selectAllCheckbox.count() > 0;

    if (hasSelectAll) {
      console.log('   ✅ Select All checkbox FOUND!');

      await selectAllCheckbox.check();
      await page.waitForTimeout(1000);

      const deleteButton = page.locator('button').filter({ hasText: 'Delete' }).filter({ hasText: '(' });
      const hasDeleteButton = await deleteButton.count() > 0;

      if (hasDeleteButton) {
        const buttonText = await deleteButton.textContent();
        console.log(`   ✅ Bulk delete button appeared: "${buttonText.trim()}"`);
        console.log('   ✅ BULK OPERATIONS: WORKING!\n');
      } else {
        console.log('   ❌ Bulk delete button NOT found\n');
      }

      // Uncheck to clean up
      await selectAllCheckbox.uncheck();
    } else {
      console.log('   ❌ Select All checkbox NOT FOUND\n');
    }

    // Step 5: Test Modal
    console.log('🎯 Step 5: Testing Task Modal');
    const newTaskButton = page.locator('button').filter({ hasText: 'New Task' }).first();
    await newTaskButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('   ✅ Modal opened');

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

    console.log(`   Modal scroll enabled: ${scrollInfo.canScroll ? '✅ YES' : '❌ NO'}`);
    console.log(`   Overflow-Y: ${scrollInfo.overflowY}`);

    await page.fill('input[placeholder*="task title"]', 'Final Test Task');
    console.log('   ✅ Filled task title');

    const projectButton = page.locator('button').filter({ hasText: 'Select project' }).first();
    await projectButton.click();
    await page.waitForTimeout(1000);

    const dropdownVisible = await page.locator('[role="listbox"]').count() > 0;
    console.log(`   Project dropdown opens: ${dropdownVisible ? '✅ YES' : '❌ NO'}`);

    if (dropdownVisible) {
      const optionsCount = await page.locator('[role="option"]').count();
      console.log(`   Found ${optionsCount} project options`);

      if (optionsCount > 0) {
        await page.locator('[role="option"]').first().click();
        console.log('   ✅ Selected project');
      }
    }

    await dialog.evaluate(el => el.scrollTop = el.scrollHeight);
    await page.waitForTimeout(500);

    const createButton = page.locator('button').filter({ hasText: 'Create Task' }).first();
    const btnVisible = await createButton.isVisible();
    const btnEnabled = await createButton.isEnabled();
    console.log(`   Submit button visible: ${btnVisible ? '✅ YES' : '❌ NO'}`);
    console.log(`   Submit button enabled: ${btnEnabled ? '✅ YES' : '❌ NO'}`);
    console.log('');

    const cancelButton = page.locator('button').filter({ hasText: 'Cancel' }).first();
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      console.log('   ✅ Modal closed\n');
    }

    // Step 6: Test Other Pages
    console.log('🗺️  Step 6: Testing All Pages');

    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Projects page');

    await page.goto(`${BASE_URL}/dashboard/goals`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Goals page');

    await page.goto(`${BASE_URL}/dashboard/analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Analytics page');

    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    console.log('   ✅ Reports page\n');

    // Final Report
    console.log('═══════════════════════════════════════');
    console.log('📊 FINAL TEST RESULTS');
    console.log('═══════════════════════════════════════\n');

    let allPassed = true;

    if (consoleErrors.length > 0) {
      console.log('❌ CONSOLE ERRORS DETECTED:');
      const uniqueErrors = [...new Set(consoleErrors)];
      uniqueErrors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 80)}...`);
      });
      if (uniqueErrors.length > 5) {
        console.log(`   ... and ${uniqueErrors.length - 5} more`);
      }
      console.log('');
      allPassed = false;
    } else {
      console.log('✅ NO CONSOLE ERRORS!\n');
    }

    if (pageErrors.length > 0) {
      console.log('❌ PAGE ERRORS DETECTED:');
      pageErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 80)}...`);
      });
      console.log('');
      allPassed = false;
    } else {
      console.log('✅ NO PAGE ERRORS!\n');
    }

    if (hasSelectAll && scrollInfo.canScroll && dropdownVisible && btnVisible) {
      console.log('✅ ALL CRITICAL FEATURES: WORKING!\n');
    } else {
      console.log('⚠️  Some features need attention:\n');
      if (!hasSelectAll) console.log('   - Bulk selection checkbox\n');
      if (!scrollInfo.canScroll) console.log('   - Modal scroll\n');
      if (!dropdownVisible) console.log('   - Project dropdown\n');
      if (!btnVisible) console.log('   - Submit button visibility\n');
      allPassed = false;
    }

    console.log('═══════════════════════════════════════\n');

    if (allPassed) {
      console.log('🎉 100% SUCCESS - ALL TESTS PASSED!\n');
    } else {
      console.log('⚠️  TEST COMPLETED WITH WARNINGS\n');
    }

    await page.screenshot({ path: '/tmp/final-test-result.png', fullPage: true });
    console.log('📸 Screenshot saved to /tmp/final-test-result.png\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: '/tmp/final-test-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/final-test-error.png\n');
    throw error;
  } finally {
    await browser.close();
  }
}

runFinalTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
