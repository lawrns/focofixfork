import { chromium } from 'playwright';

interface TestResult {
  feature: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  timestamp: string;
}

const results: TestResult[] = [];

function logResult(feature: string, status: 'pass' | 'fail' | 'warning', message: string) {
  const result = {
    feature,
    status,
    message,
    timestamp: new Date().toISOString()
  };
  results.push(result);

  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${feature}: ${message}`);
}

async function testProduction() {
  console.log('\n🌐 Testing Production Site: https://foco.mx\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  // Track console errors
  const consoleErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // ======================
    // 1. HOMEPAGE TEST
    // ======================
    console.log('\n📄 Testing Homepage...');
    await page.goto('https://foco.mx');
    await page.waitForTimeout(3000);

    const title = await page.title();
    if (title.includes('Foco')) {
      logResult('Homepage', 'pass', 'Page title correct');
    } else {
      logResult('Homepage', 'fail', `Unexpected title: ${title}`);
    }

    const heroVisible = await page.locator('h1').first().isVisible();
    logResult('Homepage Hero', heroVisible ? 'pass' : 'fail',
      heroVisible ? 'Hero section visible' : 'Hero section missing');

    // ======================
    // 2. LOGIN TEST
    // ======================
    console.log('\n🔐 Testing Login...');
    await page.goto('https://foco.mx/login');
    await page.waitForTimeout(2000);

    const emailInput = await page.locator('input[type="email"]').isVisible();
    const passwordInput = await page.locator('input[type="password"]').isVisible();

    logResult('Login Form', emailInput && passwordInput ? 'pass' : 'fail',
      'Login form elements present');

    // Perform login
    await page.fill('input[type="email"]', 'laurence@fyves.com');
    await page.fill('input[type="password"]', 'hennie12');

    // Wait for button to be enabled
    await page.waitForTimeout(1000);

    const submitButton = page.locator('button[type="submit"]');
    const isEnabled = await submitButton.isEnabled();

    if (isEnabled) {
      await submitButton.click();
      await page.waitForTimeout(5000);

      const currentUrl = page.url();
      if (currentUrl.includes('dashboard')) {
        logResult('Login Flow', 'pass', 'Successfully logged in and redirected');
      } else {
        logResult('Login Flow', 'fail', `Unexpected URL after login: ${currentUrl}`);
      }
    } else {
      logResult('Login Flow', 'warning', 'Login button remained disabled');
    }

    // ======================
    // 3. DASHBOARD TEST
    // ======================
    console.log('\n📊 Testing Dashboard...');
    await page.goto('https://foco.mx/dashboard/personalized');
    await page.waitForTimeout(4000);

    const dashboardLoaded = await page.locator('h2, h1').first().isVisible().catch(() => false);
    logResult('Dashboard', dashboardLoaded ? 'pass' : 'fail',
      dashboardLoaded ? 'Dashboard loaded successfully' : 'Dashboard failed to load');

    // Check for stats cards
    const statsCards = await page.locator('[class*="stat"], [class*="card"]').count();
    logResult('Dashboard Stats', statsCards > 0 ? 'pass' : 'warning',
      `Found ${statsCards} stat cards`);

    // ======================
    // 4. TASKS PAGE TEST
    // ======================
    console.log('\n✅ Testing Tasks Page...');
    await page.goto('https://foco.mx/tasks');
    await page.waitForTimeout(4000);

    const tasksHeader = await page.locator('h1, h2').filter({ hasText: /task/i }).isVisible().catch(() => false);
    logResult('Tasks Page', tasksHeader ? 'pass' : 'fail',
      tasksHeader ? 'Tasks page loaded' : 'Tasks page failed to load');

    // Check for drag handles (DnD feature)
    const dragHandles = await page.locator('[class*="grip"], svg[class*="grip"]').count();
    logResult('Tasks DnD', dragHandles > 0 ? 'pass' : 'warning',
      `Found ${dragHandles} drag handles`);

    // Check for Kanban columns
    const columns = await page.locator('[role="group"], [class*="column"]').count();
    logResult('Tasks Kanban Layout', columns >= 4 ? 'pass' : 'warning',
      `Found ${columns} columns (expected 4)`);

    // ======================
    // 5. PROJECTS PAGE TEST
    // ======================
    console.log('\n📁 Testing Projects Page...');
    await page.goto('https://foco.mx/projects');
    await page.waitForTimeout(4000);

    const projectsLoaded = await page.locator('h1, h2').filter({ hasText: /project/i }).isVisible().catch(() => false);
    logResult('Projects Page', projectsLoaded ? 'pass' : 'fail',
      projectsLoaded ? 'Projects page loaded' : 'Projects page failed to load');

    // Check for view switcher (Table/Kanban/Gantt)
    const viewSwitcher = await page.locator('button:has-text("Table"), button:has-text("Kanban"), button:has-text("Board")').count();
    logResult('Projects View Switcher', viewSwitcher > 0 ? 'pass' : 'warning',
      `Found ${viewSwitcher} view toggle buttons`);

    // Test Kanban view if available
    const kanbanBtn = page.locator('button:has-text("Kanban"), button:has-text("Board")').first();
    const kanbanVisible = await kanbanBtn.isVisible().catch(() => false);

    if (kanbanVisible) {
      await kanbanBtn.click();
      await page.waitForTimeout(2000);

      const kanbanColumns = await page.locator('[class*="column"], [draggable]').count();
      logResult('Kanban DnD', kanbanColumns > 0 ? 'pass' : 'warning',
        `Kanban board with ${kanbanColumns} draggable items`);
    }

    // ======================
    // 6. GOALS PAGE TEST
    // ======================
    console.log('\n🎯 Testing Goals Page...');
    await page.goto('https://foco.mx/goals');
    await page.waitForTimeout(3000);

    const goalsLoaded = await page.locator('h1, h2').filter({ hasText: /goal/i }).isVisible().catch(() => false);
    logResult('Goals Page', goalsLoaded ? 'pass' : 'fail',
      goalsLoaded ? 'Goals page loaded' : 'Goals page failed to load');

    // ======================
    // 7. TEAMS PAGE TEST
    // ======================
    console.log('\n👥 Testing Teams Page...');
    await page.goto('https://foco.mx/teams');
    await page.waitForTimeout(3000);

    const teamsLoaded = await page.locator('h1, h2').filter({ hasText: /team/i }).isVisible().catch(() => false);
    logResult('Teams Page', teamsLoaded ? 'pass' : 'fail',
      teamsLoaded ? 'Teams page loaded' : 'Teams page failed to load');

    // ======================
    // 8. AI CHAT TEST
    // ======================
    console.log('\n🤖 Testing AI Chat...');
    await page.goto('https://foco.mx/ai-chat');
    await page.waitForTimeout(3000);

    const chatInput = await page.locator('input[type="text"], textarea').isVisible().catch(() => false);
    logResult('AI Chat', chatInput ? 'pass' : 'fail',
      chatInput ? 'AI chat interface loaded' : 'AI chat interface missing');

    // ======================
    // 9. SETTINGS TEST
    // ======================
    console.log('\n⚙️  Testing Settings...');
    await page.goto('https://foco.mx/settings');
    await page.waitForTimeout(3000);

    const settingsLoaded = await page.locator('h1, h2').filter({ hasText: /setting/i }).isVisible().catch(() => false);
    logResult('Settings Page', settingsLoaded ? 'pass' : 'fail',
      settingsLoaded ? 'Settings page loaded' : 'Settings page failed to load');

    // ======================
    // 10. CONSOLE ERRORS CHECK
    // ======================
    console.log('\n🐛 Checking Console Errors...');
    if (consoleErrors.length === 0) {
      logResult('Console Errors', 'pass', 'No console errors detected');
    } else {
      logResult('Console Errors', 'warning', `${consoleErrors.length} console errors found`);
      consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.substring(0, 100)}`);
      });
    }

    // ======================
    // 11. RESPONSIVE TEST
    // ======================
    console.log('\n📱 Testing Responsive Design...');

    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://foco.mx/dashboard/personalized');
    await page.waitForTimeout(2000);

    const mobileOverflow = await page.evaluate(() =>
      document.body.scrollWidth > window.innerWidth
    );

    logResult('Mobile Responsive', !mobileOverflow ? 'pass' : 'warning',
      mobileOverflow ? 'Horizontal scroll detected' : 'No horizontal scroll');

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);

    const tabletOverflow = await page.evaluate(() =>
      document.body.scrollWidth > window.innerWidth
    );

    logResult('Tablet Responsive', !tabletOverflow ? 'pass' : 'warning',
      tabletOverflow ? 'Horizontal scroll detected' : 'No horizontal scroll');

    // Back to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

  } catch (error: any) {
    logResult('Test Suite', 'fail', `Error: ${error.message}`);
    console.error('Test error:', error);
  }

  // ======================
  // FINAL SUMMARY
  // ======================
  console.log('\n' + '='.repeat(80));
  console.log('📊 PRODUCTION TEST SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`\nTotal Tests: ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - ${r.feature}: ${r.message}`);
    });
  }

  if (warnings > 0) {
    console.log('\n⚠️  WARNINGS:');
    results.filter(r => r.status === 'warning').forEach(r => {
      console.log(`   - ${r.feature}: ${r.message}`);
    });
  }

  const successRate = ((passed / results.length) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 Browser left open for manual inspection.');
  console.log('📍 Press Ctrl+C to close.\n');

  // Keep browser open
  await new Promise(() => {});
}

testProduction();
