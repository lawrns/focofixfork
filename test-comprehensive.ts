import { chromium } from 'playwright';

interface ConsoleMessage {
  type: string;
  text: string;
  location: string;
  timestamp: string;
}

const errors: ConsoleMessage[] = [];
const warnings: ConsoleMessage[] = [];

async function testSite() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down to see what's happening
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    const timestamp = new Date().toISOString();
    const location = page.url();

    if (msg.type() === 'error') {
      errors.push({
        type: 'error',
        text: msg.text(),
        location,
        timestamp
      });
      console.log(`❌ ERROR at ${location}:`, msg.text());
    } else if (msg.type() === 'warning') {
      warnings.push({
        type: 'warning',
        text: msg.text(),
        location,
        timestamp
      });
      console.log(`⚠️  WARNING at ${location}:`, msg.text());
    }
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push({
      type: 'pageerror',
      text: error.message,
      location: page.url(),
      timestamp: new Date().toISOString()
    });
    console.log(`💥 PAGE ERROR at ${page.url()}:`, error.message);
  });

  // Capture network errors
  page.on('requestfailed', request => {
    const failure = request.failure();
    console.log(`🌐 REQUEST FAILED: ${request.url()} - ${failure?.errorText}`);
  });

  try {
    console.log('\n🚀 Starting comprehensive site test...\n');

    // Step 1: Load homepage
    console.log('1️⃣  Loading homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Step 2: Login
    console.log('2️⃣  Logging in with laurence@fyves.com...');

    // Check if already logged in
    const isLoggedIn = await page.locator('text=Dashboard').isVisible().catch(() => false);

    if (!isLoggedIn) {
      // Click login/signin link
      await page.click('text=/sign.*in/i').catch(() => {});
      await page.waitForTimeout(1000);

      // Fill in credentials
      await page.fill('input[type="email"]', 'laurence@fyves.com');
      await page.fill('input[type="password"]', 'hennie12');
      await page.click('button[type="submit"]');

      // Wait for redirect
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
    }

    await page.waitForTimeout(2000);
    console.log('✅ Logged in successfully');

    // Step 3: Navigate to Dashboard
    console.log('3️⃣  Testing Dashboard...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForTimeout(3000);
    console.log('✅ Dashboard loaded');

    // Step 4: Navigate to Projects
    console.log('4️⃣  Testing Projects page...');
    await page.goto('http://localhost:3000/projects');
    await page.waitForTimeout(3000);
    console.log('✅ Projects page loaded');

    // Step 5: Navigate to Tasks
    console.log('5️⃣  Testing Tasks page...');
    await page.goto('http://localhost:3000/tasks');
    await page.waitForTimeout(3000);
    console.log('✅ Tasks page loaded');

    // Step 6: Navigate to Goals
    console.log('6️⃣  Testing Goals page...');
    await page.goto('http://localhost:3000/goals');
    await page.waitForTimeout(3000);
    console.log('✅ Goals page loaded');

    // Step 7: Navigate to Teams
    console.log('7️⃣  Testing Teams page...');
    await page.goto('http://localhost:3000/teams');
    await page.waitForTimeout(3000);
    console.log('✅ Teams page loaded');

    // Step 8: Navigate to AI Chat
    console.log('8️⃣  Testing AI Chat page...');
    await page.goto('http://localhost:3000/ai-chat');
    await page.waitForTimeout(3000);
    console.log('✅ AI Chat page loaded');

    // Step 9: Navigate to Settings
    console.log('9️⃣  Testing Settings page...');
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(3000);
    console.log('✅ Settings page loaded');

    // Step 10: Test Analytics if available
    console.log('🔟 Testing Analytics page...');
    await page.goto('http://localhost:3000/analytics');
    await page.waitForTimeout(3000);
    console.log('✅ Analytics page loaded');

    // Wait a bit more to catch any delayed errors
    console.log('\n⏳ Waiting for any delayed errors...');
    await page.waitForTimeout(5000);

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    errors.push({
      type: 'test-error',
      text: error.message,
      location: page.url(),
      timestamp: new Date().toISOString()
    });
  } finally {
    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    if (errors.length === 0 && warnings.length === 0) {
      console.log('\n✅ NO ERRORS OR WARNINGS FOUND! Site is clean! 🎉\n');
    } else {
      if (errors.length > 0) {
        console.log(`\n❌ ERRORS FOUND: ${errors.length}`);
        errors.forEach((err, i) => {
          console.log(`\n${i + 1}. [${err.type}] at ${err.location}`);
          console.log(`   Time: ${err.timestamp}`);
          console.log(`   Message: ${err.text}`);
        });
      }

      if (warnings.length > 0) {
        console.log(`\n⚠️  WARNINGS FOUND: ${warnings.length}`);
        warnings.forEach((warn, i) => {
          console.log(`\n${i + 1}. at ${warn.location}`);
          console.log(`   Message: ${warn.text}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

    // Keep browser open for manual inspection
    console.log('🔍 Browser left open for manual inspection. Press Ctrl+C to close.');
    console.log('📍 Current URL:', page.url());

    // Wait indefinitely
    await new Promise(() => {});
  }
}

testSite();
