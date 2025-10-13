#!/usr/bin/env node

const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3004';
const TEST_EMAIL = 'laurence@fyves.com';
const TEST_PASSWORD = 'Hennie@@18';

async function testUserFlow() {
  console.log('🚀 Starting User Flow Test\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 720 }
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[${msg.location().url}] ${msg.text()}`);
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  try {
    // Step 1: Login
    console.log('📝 Step 1: Testing Login');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0', timeout: 30000 });

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });

    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard')) {
      console.log('   ✅ Login successful - redirected to dashboard\n');
    } else {
      console.log(`   ⚠️  Unexpected URL after login: ${currentUrl}\n`);
    }

    // Step 2: Navigate to Tasks
    console.log('📋 Step 2: Testing Tasks Page');
    await page.goto(`${BASE_URL}/tasks`, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('   ✅ Tasks page loaded\n');

    // Step 3: Test Modal Opening
    console.log('🎯 Step 3: Testing Task Modal');
    const newTaskButton = await page.waitForSelector('button:has-text("New Task")', { timeout: 5000 });
    await newTaskButton.click();

    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    console.log('   ✅ Modal opened\n');

    // Step 4: Check Modal Scrollability
    console.log('📜 Step 4: Testing Modal Scroll');
    const scrollInfo = await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return { error: 'Dialog not found' };

      const styles = window.getComputedStyle(dialog);
      return {
        overflowY: styles.overflowY,
        maxHeight: styles.maxHeight,
        scrollHeight: dialog.scrollHeight,
        clientHeight: dialog.clientHeight,
        canScroll: dialog.scrollHeight > dialog.clientHeight
      };
    });

    console.log(`   Modal overflow-y: ${scrollInfo.overflowY}`);
    console.log(`   Modal max-height: ${scrollInfo.maxHeight}`);
    console.log(`   Scroll height: ${scrollInfo.scrollHeight}px`);
    console.log(`   Client height: ${scrollInfo.clientHeight}px`);
    console.log(`   Can scroll: ${scrollInfo.canScroll ? '✅ YES' : '❌ NO'}\n`);

    // Step 5: Test Form Interaction
    console.log('✍️  Step 5: Testing Form Fields');
    await page.type('input[placeholder*="task title"]', 'Test Task from Automated Script');
    console.log('   ✅ Filled task title');

    await page.waitForTimeout(500);

    // Test project dropdown
    console.log('\n🔽 Step 6: Testing Project Dropdown');
    const projectButton = await page.$('button:has-text("Select project")');
    if (projectButton) {
      await projectButton.click();
      await page.waitForTimeout(1000);

      const dropdown = await page.$('[role="listbox"]');
      if (dropdown) {
        console.log('   ✅ Dropdown opened');

        const options = await page.$$('[role="option"]');
        console.log(`   Found ${options.length} project options`);

        if (options.length > 0) {
          await options[0].click();
          console.log('   ✅ Selected first project\n');
        }
      } else {
        console.log('   ⚠️  Dropdown did not open\n');
      }
    }

    // Step 7: Test Submit Button Visibility
    console.log('🔘 Step 7: Testing Submit Button');
    await page.evaluate(() => {
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog) {
        dialog.scrollTop = dialog.scrollHeight;
      }
    });
    await page.waitForTimeout(500);

    const createButton = await page.$('button:has-text("Create Task")');
    if (createButton) {
      const isVisible = await createButton.isVisible();
      const isEnabled = await page.evaluate(btn => !btn.disabled, createButton);
      console.log(`   Button visible: ${isVisible ? '✅ YES' : '❌ NO'}`);
      console.log(`   Button enabled: ${isEnabled ? '✅ YES' : '❌ NO'}\n`);
    } else {
      console.log('   ❌ Create button not found\n');
    }

    // Close modal
    const cancelButton = await page.$('button:has-text("Cancel")');
    if (cancelButton) {
      await cancelButton.click();
      await page.waitForTimeout(1000);
      console.log('   ✅ Modal closed\n');
    }

    // Step 8: Test Bulk Selection
    console.log('☑️  Step 8: Testing Bulk Selection UI');
    const selectAllCheckbox = await page.$('#select-all');
    if (selectAllCheckbox) {
      console.log('   ✅ Select All checkbox found');

      const taskCheckboxes = await page.$$('input[type="checkbox"][aria-label*="Select"]');
      console.log(`   Found ${taskCheckboxes.length} task checkboxes`);

      if (taskCheckboxes.length > 0) {
        await selectAllCheckbox.click();
        await page.waitForTimeout(500);

        const deleteButton = await page.$('button:has-text("Delete")');
        if (deleteButton) {
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
    console.log('   ✅ Projects page loaded');

    await page.goto(`${BASE_URL}/dashboard/goals`, { waitUntil: 'domcontentloaded' });
    console.log('   ✅ Goals page loaded');

    await page.goto(`${BASE_URL}/analytics`, { waitUntil: 'domcontentloaded' });
    console.log('   ✅ Analytics page loaded');

    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'domcontentloaded' });
    console.log('   ✅ Reports page loaded\n');

    // Report Results
    console.log('═══════════════════════════════════════');
    console.log('📊 TEST RESULTS');
    console.log('═══════════════════════════════════════\n');

    if (consoleErrors.length > 0) {
      console.log('❌ CONSOLE ERRORS FOUND:');
      consoleErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
      console.log('');
    } else {
      console.log('✅ NO CONSOLE ERRORS!\n');
    }

    if (pageErrors.length > 0) {
      console.log('❌ PAGE ERRORS FOUND:');
      pageErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
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
  } finally {
    await browser.close();
  }
}

testUserFlow().catch(console.error);
