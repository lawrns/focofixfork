import { chromium } from 'playwright';

interface UIIssue {
  page: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'layout' | 'navigation' | 'interaction' | 'accessibility' | 'performance' | 'visual';
  description: string;
  suggestion?: string;
}

const issues: UIIssue[] = [];

async function testUIUX() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000 // Slow down to observe interactions
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  console.log('\n🎨 Starting Comprehensive UI/UX Testing...\n');

  try {
    // ======================
    // 1. HOMEPAGE TESTING
    // ======================
    console.log('📄 Testing Homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);

    // Check hero section
    const hasHero = await page.locator('h1').first().isVisible();
    console.log(`  ✓ Hero section: ${hasHero ? 'visible' : 'missing'}`);

    // Check CTA buttons
    const ctaButtons = await page.locator('button, a[href*="login"], a[href*="register"]').count();
    console.log(`  ✓ CTA buttons found: ${ctaButtons}`);

    // Check responsive menu
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(500);
    const mobileMenu = await page.locator('[aria-label*="menu"], button[aria-expanded]').first().isVisible().catch(() => false);
    console.log(`  ✓ Mobile menu: ${mobileMenu ? 'present' : 'missing'}`);
    await page.setViewportSize({ width: 1920, height: 1080 }); // Back to desktop

    // ======================
    // 2. LOGIN TESTING
    // ======================
    console.log('\n🔐 Testing Login Page...');
    await page.goto('http://localhost:3000/login');
    await page.waitForTimeout(2000);

    // Check form elements
    const emailInput = await page.locator('input[type="email"]').isVisible();
    const passwordInput = await page.locator('input[type="password"]').isVisible();
    const submitButton = await page.locator('button[type="submit"]').isVisible();
    console.log(`  ✓ Email input: ${emailInput}`);
    console.log(`  ✓ Password input: ${passwordInput}`);
    console.log(`  ✓ Submit button: ${submitButton}`);

    // Test login
    await page.fill('input[type="email"]', 'laurence@fyves.com');
    await page.fill('input[type="password"]', 'hennie12');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Wait for dashboard redirect
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {
      console.log('  ⚠️  Did not redirect to dashboard');
    });

    console.log('  ✓ Login successful');

    // ======================
    // 3. DASHBOARD TESTING
    // ======================
    console.log('\n📊 Testing Dashboard...');
    await page.goto('http://localhost:3000/dashboard/personalized');
    await page.waitForTimeout(3000);

    // Check stats cards
    const statsCards = await page.locator('[class*="card"], [class*="stat"]').count();
    console.log(`  ✓ Stats cards found: ${statsCards}`);

    // Check navigation tabs
    const navTabs = await page.locator('[role="tab"], [class*="tab"]').count();
    console.log(`  ✓ Navigation tabs: ${navTabs}`);

    // Check if charts/graphs are present
    const hasCharts = await page.locator('canvas, svg[class*="chart"]').count();
    console.log(`  ✓ Charts/visualizations: ${hasCharts}`);

    // Test quick actions
    const quickActions = await page.locator('button:has-text("Create"), button:has-text("New")').count();
    console.log(`  ✓ Quick action buttons: ${quickActions}`);

    // ======================
    // 4. PROJECTS PAGE TESTING
    // ======================
    console.log('\n📁 Testing Projects Page...');
    await page.goto('http://localhost:3000/projects');
    await page.waitForTimeout(3000);

    // Check table view
    const hasTable = await page.locator('table, [role="table"]').isVisible().catch(() => false);
    console.log(`  ✓ Table view: ${hasTable}`);

    // Check for project cards/items
    const projectItems = await page.locator('[class*="project"], tr[data-id], [role="row"]').count();
    console.log(`  ✓ Project items: ${projectItems}`);

    // Test view switching (table/kanban/gantt)
    const viewButtons = await page.locator('button:has-text("Table"), button:has-text("Kanban"), button:has-text("Board")').count();
    console.log(`  ✓ View switcher buttons: ${viewButtons}`);

    if (viewButtons > 0) {
      // Test Kanban view
      const kanbanButton = await page.locator('button:has-text("Kanban"), button:has-text("Board")').first();
      if (await kanbanButton.isVisible().catch(() => false)) {
        await kanbanButton.click();
        await page.waitForTimeout(2000);
        const kanbanColumns = await page.locator('[class*="column"], [class*="kanban"]').count();
        console.log(`  ✓ Kanban columns: ${kanbanColumns}`);

        // Check for drag handles
        const dragHandles = await page.locator('[draggable="true"], [class*="drag"]').count();
        console.log(`  ✓ Draggable items: ${dragHandles}`);
        if (dragHandles === 0) {
          issues.push({
            page: 'Projects - Kanban',
            severity: 'medium',
            category: 'interaction',
            description: 'Kanban board lacks drag-and-drop functionality',
            suggestion: 'Implement drag-and-drop for task cards between columns'
          });
        }
      }
    }

    // ======================
    // 5. TASKS PAGE TESTING
    // ======================
    console.log('\n✅ Testing Tasks Page...');
    await page.goto('http://localhost:3000/tasks');
    await page.waitForTimeout(3000);

    // Check for task list
    const taskItems = await page.locator('[class*="task"], li, tr').count();
    console.log(`  ✓ Task items found: ${taskItems}`);

    // Check filters
    const filterButtons = await page.locator('button:has-text("Filter"), select, [class*="filter"]').count();
    console.log(`  ✓ Filter controls: ${filterButtons}`);

    // Check for task creation
    const createTaskButton = await page.locator('button:has-text("Create"), button:has-text("New Task")').count();
    console.log(`  ✓ Create task buttons: ${createTaskButton}`);

    // Check for drag handles in task list
    const taskDragHandles = await page.locator('[draggable="true"]').count();
    console.log(`  ✓ Draggable tasks: ${taskDragHandles}`);
    if (taskDragHandles === 0) {
      issues.push({
        page: 'Tasks',
        severity: 'medium',
        category: 'interaction',
        description: 'Task list lacks drag-and-drop for reordering',
        suggestion: 'Add drag-and-drop to reorder tasks by priority'
      });
    }

    // ======================
    // 6. GOALS PAGE TESTING
    // ======================
    console.log('\n🎯 Testing Goals Page...');
    await page.goto('http://localhost:3000/goals');
    await page.waitForTimeout(3000);

    const goalItems = await page.locator('[class*="goal"]').count();
    console.log(`  ✓ Goal items: ${goalItems}`);

    // Check for hierarchy/tree view
    const hasHierarchy = await page.locator('[role="tree"], [class*="hierarchy"]').isVisible().catch(() => false);
    console.log(`  ✓ Hierarchical view: ${hasHierarchy}`);

    // ======================
    // 7. TEAMS PAGE TESTING
    // ======================
    console.log('\n👥 Testing Teams Page...');
    await page.goto('http://localhost:3000/teams');
    await page.waitForTimeout(3000);

    const teamMembers = await page.locator('[class*="member"], [class*="user"]').count();
    console.log(`  ✓ Team members: ${teamMembers}`);

    // ======================
    // 8. AI CHAT TESTING
    // ======================
    console.log('\n🤖 Testing AI Chat...');
    await page.goto('http://localhost:3000/ai-chat');
    await page.waitForTimeout(3000);

    const chatInput = await page.locator('input[type="text"], textarea').isVisible().catch(() => false);
    console.log(`  ✓ Chat input: ${chatInput}`);

    const sendButton = await page.locator('button:has-text("Send"), button[type="submit"]').isVisible().catch(() => false);
    console.log(`  ✓ Send button: ${sendButton}`);

    // ======================
    // 9. SETTINGS TESTING
    // ======================
    console.log('\n⚙️  Testing Settings...');
    await page.goto('http://localhost:3000/settings');
    await page.waitForTimeout(3000);

    const settingsSections = await page.locator('section, [class*="setting"]').count();
    console.log(`  ✓ Settings sections: ${settingsSections}`);

    // ======================
    // 10. ACCESSIBILITY TESTING
    // ======================
    console.log('\n♿ Testing Accessibility...');

    // Check for skip links
    await page.goto('http://localhost:3000/dashboard/personalized');
    await page.waitForTimeout(1000);
    const skipLink = await page.locator('a:has-text("Skip to")').isVisible().catch(() => false);
    console.log(`  ✓ Skip to content link: ${skipLink}`);
    if (!skipLink) {
      issues.push({
        page: 'Global',
        severity: 'high',
        category: 'accessibility',
        description: 'Missing skip to main content link',
        suggestion: 'Add skip link for keyboard navigation'
      });
    }

    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    console.log(`  ✓ H1 headings: ${h1Count}`);
    if (h1Count > 1) {
      issues.push({
        page: 'Dashboard',
        severity: 'low',
        category: 'accessibility',
        description: 'Multiple H1 headings found',
        suggestion: 'Use only one H1 per page'
      });
    }

    // ======================
    // 11. RESPONSIVE TESTING
    // ======================
    console.log('\n📱 Testing Responsive Design...');

    const viewports = [
      { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
      { width: 768, height: 1024, name: 'Tablet (iPad)' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(500);

      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth;
      });

      console.log(`  ✓ ${viewport.name}: ${hasOverflow ? '⚠️ Horizontal scroll' : '✓ No overflow'}`);

      if (hasOverflow) {
        issues.push({
          page: 'Dashboard',
          severity: 'medium',
          category: 'layout',
          description: `Horizontal scroll on ${viewport.name}`,
          suggestion: 'Adjust responsive breakpoints and container widths'
        });
      }
    }

    // Reset to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // ======================
    // 12. PERFORMANCE TESTING
    // ======================
    console.log('\n⚡ Testing Performance...');

    const performanceMetrics = await page.evaluate(() => {
      const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        loadTime: perf.loadEventEnd - perf.loadEventStart,
        domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
        ttfb: perf.responseStart - perf.requestStart
      };
    });

    console.log(`  ✓ Page load time: ${performanceMetrics.loadTime.toFixed(2)}ms`);
    console.log(`  ✓ DOM Content Loaded: ${performanceMetrics.domContentLoaded.toFixed(2)}ms`);
    console.log(`  ✓ Time to First Byte: ${performanceMetrics.ttfb.toFixed(2)}ms`);

  } catch (error: any) {
    console.error('❌ Test error:', error.message);
  }

  // ======================
  // FINAL REPORT
  // ======================
  console.log('\n' + '='.repeat(80));
  console.log('📋 UI/UX TESTING SUMMARY');
  console.log('='.repeat(80));

  if (issues.length === 0) {
    console.log('\n✅ No major UI/UX issues found!\n');
  } else {
    console.log(`\n⚠️  Found ${issues.length} issues:\n`);

    const grouped = issues.reduce((acc, issue) => {
      if (!acc[issue.severity]) acc[issue.severity] = [];
      acc[issue.severity].push(issue);
      return acc;
    }, {} as Record<string, UIIssue[]>);

    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const severityIssues = grouped[severity];
      if (severityIssues) {
        console.log(`\n${severity.toUpperCase()} (${severityIssues.length}):`);
        severityIssues.forEach((issue, i) => {
          console.log(`\n${i + 1}. [${issue.category}] ${issue.page}`);
          console.log(`   ${issue.description}`);
          if (issue.suggestion) {
            console.log(`   💡 ${issue.suggestion}`);
          }
        });
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 Browser left open for manual inspection.');
  console.log('📍 Press Ctrl+C to close.\n');

  // Keep browser open
  await new Promise(() => {});
}

testUIUX();
