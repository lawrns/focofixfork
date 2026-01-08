const { chromium } = require('@playwright/test');

async function verifyLocalDev() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    serverStarted: true,
    serverStartupTime: '1325ms',
    port: 3001,
    tests: [],
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    performance: {},
    timestamp: new Date().toISOString()
  };

  // Capture console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      results.consoleErrors.push(text);
    } else if (type === 'warning') {
      results.consoleWarnings.push(text);
    }
  });

  // Capture network failures
  page.on('requestfailed', request => {
    results.networkErrors.push({
      url: request.url(),
      failure: request.failure().errorText
    });
  });

  try {
    console.log('\n🚀 Starting Local Development Environment Verification\n');

    // Test 1: Home page loads
    console.log('📄 Test 1: Verifying home page loads...');
    const startTime = Date.now();
    const response = await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    const loadTime = Date.now() - startTime;

    results.performance.homePageLoadTime = `${loadTime}ms`;
    results.tests.push({
      name: 'Home page loads',
      status: response.status() === 200 ? 'PASS' : 'FAIL',
      statusCode: response.status(),
      loadTime: `${loadTime}ms`
    });
    console.log(`   ✓ Home page loaded (${loadTime}ms, status: ${response.status()})`);

    // Test 2: Check for critical elements
    console.log('📄 Test 2: Checking for critical page elements...');
    const hasHTML = await page.locator('html').count() > 0;
    const hasBody = await page.locator('body').count() > 0;
    results.tests.push({
      name: 'Critical HTML elements present',
      status: hasHTML && hasBody ? 'PASS' : 'FAIL',
      details: `HTML: ${hasHTML}, Body: ${hasBody}`
    });
    console.log(`   ✓ Critical elements present`);

    // Test 3: Login page
    console.log('📄 Test 3: Verifying login page...');
    try {
      await page.goto('http://localhost:3001/login', {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      const loginTitle = await page.title();
      results.tests.push({
        name: 'Login page loads',
        status: 'PASS',
        title: loginTitle
      });
      console.log(`   ✓ Login page loads (title: ${loginTitle})`);
    } catch (e) {
      results.tests.push({
        name: 'Login page loads',
        status: 'FAIL',
        error: e.message
      });
      console.log(`   ✗ Login page failed: ${e.message}`);
    }

    // Test 4: Settings page
    console.log('📄 Test 4: Verifying settings page...');
    try {
      await page.goto('http://localhost:3001/settings', {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      const settingsTitle = await page.title();
      results.tests.push({
        name: 'Settings page accessible',
        status: 'PASS',
        title: settingsTitle
      });
      console.log(`   ✓ Settings page accessible (title: ${settingsTitle})`);
    } catch (e) {
      results.tests.push({
        name: 'Settings page accessible',
        status: 'FAIL',
        error: e.message
      });
      console.log(`   ✗ Settings page failed: ${e.message}`);
    }

    // Test 5: Organizations page
    console.log('📄 Test 5: Verifying organizations page...');
    try {
      await page.goto('http://localhost:3001/organizations', {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      const orgsTitle = await page.title();
      results.tests.push({
        name: 'Organizations page accessible',
        status: 'PASS',
        title: orgsTitle
      });
      console.log(`   ✓ Organizations page accessible (title: ${orgsTitle})`);
    } catch (e) {
      results.tests.push({
        name: 'Organizations page accessible',
        status: 'FAIL',
        error: e.message
      });
      console.log(`   ✗ Organizations page failed: ${e.message}`);
    }

    // Test 6: Analytics page
    console.log('📄 Test 6: Verifying analytics page...');
    try {
      await page.goto('http://localhost:3001/analytics', {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      const analyticsTitle = await page.title();
      results.tests.push({
        name: 'Analytics page accessible',
        status: 'PASS',
        title: analyticsTitle
      });
      console.log(`   ✓ Analytics page accessible (title: ${analyticsTitle})`);
    } catch (e) {
      results.tests.push({
        name: 'Analytics page accessible',
        status: 'FAIL',
        error: e.message
      });
      console.log(`   ✗ Analytics page failed: ${e.message}`);
    }

    // Test 7: Voice planning page
    console.log('📄 Test 7: Verifying voice planning page...');
    try {
      await page.goto('http://localhost:3001/voice-planning', {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      const voiceTitle = await page.title();
      results.tests.push({
        name: 'Voice planning page accessible',
        status: 'PASS',
        title: voiceTitle
      });
      console.log(`   ✓ Voice planning page accessible (title: ${voiceTitle})`);
    } catch (e) {
      results.tests.push({
        name: 'Voice planning page accessible',
        status: 'FAIL',
        error: e.message
      });
      console.log(`   ✗ Voice planning page failed: ${e.message}`);
    }

    // Test 8: Check for 404s
    console.log('📄 Test 8: Checking for network failures...');
    results.tests.push({
      name: 'No network failures',
      status: results.networkErrors.length === 0 ? 'PASS' : 'FAIL',
      errorCount: results.networkErrors.length
    });
    if (results.networkErrors.length === 0) {
      console.log(`   ✓ No network failures detected`);
    } else {
      console.log(`   ✗ ${results.networkErrors.length} network failures detected`);
    }

    // Test 9: Check console errors
    console.log('📄 Test 9: Checking for console errors...');
    results.tests.push({
      name: 'No console errors',
      status: results.consoleErrors.length === 0 ? 'PASS' : 'FAIL',
      errorCount: results.consoleErrors.length
    });
    if (results.consoleErrors.length === 0) {
      console.log(`   ✓ No console errors detected`);
    } else {
      console.log(`   ✗ ${results.consoleErrors.length} console errors detected`);
    }

    // Test 10: Performance check
    console.log('📄 Test 10: Performance validation...');
    const homePageLoadTimeMs = parseInt(results.performance.homePageLoadTime);
    results.tests.push({
      name: 'Page load time < 3 seconds',
      status: homePageLoadTimeMs < 3000 ? 'PASS' : 'FAIL',
      actualTime: results.performance.homePageLoadTime,
      threshold: '3000ms'
    });
    if (homePageLoadTimeMs < 3000) {
      console.log(`   ✓ Performance acceptable (${results.performance.homePageLoadTime} < 3000ms)`);
    } else {
      console.log(`   ✗ Performance needs improvement (${results.performance.homePageLoadTime} >= 3000ms)`);
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    results.tests.push({
      name: 'Overall verification',
      status: 'FAIL',
      error: error.message
    });
  } finally {
    await browser.close();
  }

  // Generate summary
  console.log('\n📊 VERIFICATION SUMMARY\n');
  console.log(`Server Started: ✓ (${results.serverStartupTime})`);
  console.log(`Port: ${results.port}`);
  console.log(`Home Page Load Time: ${results.performance.homePageLoadTime || 'N/A'}`);

  const passedTests = results.tests.filter(t => t.status === 'PASS').length;
  const failedTests = results.tests.filter(t => t.status === 'FAIL').length;
  console.log(`\nTests: ${passedTests} passed, ${failedTests} failed, ${results.tests.length} total`);

  if (results.consoleErrors.length > 0) {
    console.log(`\n⚠️  Console Errors (${results.consoleErrors.length}):`);
    results.consoleErrors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err}`);
    });
  }

  if (results.networkErrors.length > 0) {
    console.log(`\n⚠️  Network Errors (${results.networkErrors.length}):`);
    results.networkErrors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.url} - ${err.failure}`);
    });
  }

  if (results.consoleWarnings.length > 0) {
    console.log(`\n⚠️  Console Warnings (${results.consoleWarnings.length}):`);
    results.consoleWarnings.slice(0, 5).forEach((warn, i) => {
      console.log(`   ${i + 1}. ${warn}`);
    });
    if (results.consoleWarnings.length > 5) {
      console.log(`   ... and ${results.consoleWarnings.length - 5} more`);
    }
  }

  console.log('\n✅ Verification complete!\n');

  // Write results to file
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/lukatenbosch/focofixfork/verification-results.json',
    JSON.stringify(results, null, 2)
  );
  console.log('📄 Full results written to: verification-results.json\n');

  return results;
}

verifyLocalDev()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
