#!/usr/bin/env node

import { chromium } from 'playwright';

const PROD_URL = 'https://foco.mx';
const TEST_EMAIL = 'laurence@fyves.com';
const TEST_PASSWORD = 'Hennie@@18';

async function testProduction() {
  console.log('\n🌐 TESTING LIVE PRODUCTION SITE: foco.mx');
  console.log('═══════════════════════════════════════\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down to see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  // Enable console logging to capture browser errors
  const consoleErrors = [];
  const page404s = [];
  const apiErrors = [];

  const page = await context.newPage();

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.log(`   ⚠️  Console Error: ${text}`);
    }
  });

  page.on('response', response => {
    if (response.status() === 404) {
      page404s.push(response.url());
      console.log(`   ⚠️  404 Error: ${response.url()}`);
    }
    if (response.status() >= 500) {
      apiErrors.push({ url: response.url(), status: response.status() });
      console.log(`   ❌ ${response.status()} Error: ${response.url()}`);
    }
  });

  try {
    // Test 1: Load homepage
    console.log('📝 Step 1: Loading homepage...');
    await page.goto(PROD_URL, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ Homepage loaded\n');

    // Test 2: Login
    console.log('📝 Step 2: Testing login...');
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });

    await page.locator('input[type="email"]').click();
    await page.locator('input[type="email"]').pressSequentially(TEST_EMAIL, { delay: 50 });

    await page.locator('input[type="password"]').click();
    await page.locator('input[type="password"]').pressSequentially(TEST_PASSWORD, { delay: 50 });

    await page.waitForTimeout(1000);
    await page.locator('button[type="submit"]').click({ force: true });

    try {
      await page.waitForURL('**/dashboard**', { timeout: 20000 });
      console.log('   ✅ Login successful\n');
    } catch (e) {
      console.log('   ❌ Login failed - did not redirect to dashboard');
      throw e;
    }

    // Test 3: Navigate to Tasks
    console.log('📝 Step 3: Testing tasks page...');
    await page.goto(`${PROD_URL}/tasks`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const taskCards = await page.locator('[data-testid="task-card"]').count();
    console.log(`   Found ${taskCards} task cards`);

    // Check for bulk selection checkbox
    const selectAllCheckbox = await page.locator('input[type="checkbox"][aria-label*="Select all"]').count();
    if (selectAllCheckbox > 0) {
      console.log('   ✅ Bulk selection checkbox found\n');
    } else {
      console.log('   ℹ️  No bulk selection (0 tasks in view)\n');
    }

    // Test 4: Open Task Modal
    console.log('📝 Step 4: Testing task creation modal...');
    await page.locator('button:has-text("New Task")').first().click();
    await page.waitForTimeout(1000);

    const modalVisible = await page.locator('[role="dialog"]').isVisible();
    if (modalVisible) {
      console.log('   ✅ Modal opened');

      // Check scroll properties
      const dialog = page.locator('[role="dialog"]').first();
      const overflowY = await dialog.evaluate(el => window.getComputedStyle(el).overflowY);
      const maxHeight = await dialog.evaluate(el => window.getComputedStyle(el).maxHeight);

      console.log(`   Overflow-Y: ${overflowY}`);
      console.log(`   Max-Height: ${maxHeight}`);

      // Close modal
      const cancelBtn = page.locator('button:has-text("Cancel")').first();
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();
        console.log('   ✅ Modal closed\n');
      }
    } else {
      console.log('   ❌ Modal did not open\n');
    }

    // Test 5: Navigate through pages
    console.log('📝 Step 5: Testing navigation...');

    await page.goto(`${PROD_URL}/projects`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ Projects page loaded');

    await page.goto(`${PROD_URL}/dashboard/goals`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ Goals page loaded');

    await page.goto(`${PROD_URL}/dashboard/analytics`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ Analytics page loaded');

    await page.goto(`${PROD_URL}/reports`, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('   ✅ Reports page loaded\n');

    // Test 6: Check dashboard
    console.log('📝 Step 6: Testing dashboard...');
    await page.goto(`${PROD_URL}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    console.log('   ✅ Dashboard loaded\n');

    // Final Report
    console.log('\n═══════════════════════════════════════');
    console.log('📊 PRODUCTION TEST RESULTS');
    console.log('═══════════════════════════════════════\n');

    if (consoleErrors.length === 0) {
      console.log('✅ NO CONSOLE ERRORS!');
    } else {
      console.log(`❌ ${consoleErrors.length} CONSOLE ERRORS DETECTED:`);
      consoleErrors.slice(0, 10).forEach((err, i) => {
        const preview = err.length > 100 ? err.substring(0, 100) + '...' : err;
        console.log(`   ${i + 1}. ${preview}`);
      });
      if (consoleErrors.length > 10) {
        console.log(`   ... and ${consoleErrors.length - 10} more`);
      }
    }

    if (page404s.length === 0) {
      console.log('✅ NO 404 ERRORS!');
    } else {
      console.log(`\n❌ ${page404s.length} 404 ERRORS:`);
      page404s.slice(0, 5).forEach((url, i) => {
        console.log(`   ${i + 1}. ${url}`);
      });
      if (page404s.length > 5) {
        console.log(`   ... and ${page404s.length - 5} more`);
      }
    }

    if (apiErrors.length === 0) {
      console.log('✅ NO API ERRORS!');
    } else {
      console.log(`\n❌ ${apiErrors.length} API ERRORS:`);
      apiErrors.forEach((err, i) => {
        console.log(`   ${i + 1}. [${err.status}] ${err.url}`);
      });
    }

    console.log('\n═══════════════════════════════════════\n');

    if (consoleErrors.length === 0 && page404s.length === 0 && apiErrors.length === 0) {
      console.log('✅ ✅ ✅  PRODUCTION TEST PASSED - 100% SUCCESS!  ✅ ✅ ✅\n');
      await page.screenshot({ path: '/tmp/production-success.png', fullPage: true });
      console.log('📸 Success screenshot saved to /tmp/production-success.png\n');
    } else {
      console.log('⚠️  PRODUCTION TEST COMPLETED WITH WARNINGS\n');
      await page.screenshot({ path: '/tmp/production-warnings.png', fullPage: true });
      console.log('📸 Screenshot saved to /tmp/production-warnings.png\n');
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await page.screenshot({ path: '/tmp/production-error.png', fullPage: true });
    console.log('📸 Error screenshot saved to /tmp/production-error.png\n');
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

testProduction().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
