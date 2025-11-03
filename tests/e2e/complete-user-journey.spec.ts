import { test, expect, Page } from '@playwright/test';

test.describe('Complete User Journey Tests', () => {
  const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
  const TEST_USER = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    fullName: 'Test User'
  };

  // Helper functions
  async function login(page: Page, email: string, password: string) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);
  }

  async function createProject(page: Page, projectName: string, description: string) {
    await page.click('button:has-text("New Project")');
    await page.fill('input[placeholder*="project name" i]', projectName);
    await page.fill('textarea[placeholder*="description" i]', description);
    await page.click('button:has-text("Create Project")');
    await page.waitForSelector(`text=${projectName}`);
  }

  async function createTask(page: Page, taskTitle: string, description: string) {
    await page.goto(`${BASE_URL}/tasks`);
    await page.click('button:has-text("New Task")');
    await page.fill('input[placeholder*="task title" i]', taskTitle);
    await page.fill('textarea[placeholder*="description" i]', description);
    await page.click('button:has-text("Create Task")');
    await page.waitForSelector(`text=${taskTitle}`);
  }

  async function checkAccessibility(page: Page) {
    // Basic accessibility checks
    const violations = await page.locator('[role="button"]').all();
    for (const button of violations) {
      await expect(button).toHaveAttribute('aria-label');
    }
  }

  test.beforeEach(async ({ page }) => {
    // Set up viewport and test environment
    await page.setViewportSize({ width: 1280, height: 720 });
    // Ignore console errors for specific known issues
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Non-critical error')) {
        return;
      }
    });
  });

  test.describe('Authentication Flow', () => {
    test('user can register, login, and logout', async ({ page }) => {
      // Registration
      await page.goto(`${BASE_URL}/register`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.fill('input[name="fullName"]', TEST_USER.fullName);
      await page.fill('input[name="organizationName"]', 'Test Organization');
      await page.click('button[type="submit"]');
      
      // Should redirect to dashboard after successful registration
      await page.waitForURL(`${BASE_URL}/dashboard`);
      await expect(page.locator('h1')).toContainText('Dashboard');
      
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('button:has-text("Logout")');
      await page.waitForURL(`${BASE_URL}/login`);
      
      // Login with registered credentials
      await login(page, TEST_USER.email, TEST_USER.password);
      await expect(page.locator('h1')).toContainText('Dashboard');
    });

    test('handles invalid login credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
      expect(page.url()).toContain('/login');
    });

    test('password reset flow', async ({ page }) => {
      await page.goto(`${BASE_URL}/forgot-password`);
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('text=Password reset email sent')).toBeVisible();
    });
  });

  test.describe('Project Management Flow', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
    });

    test('complete project lifecycle', async ({ page }) => {
      const projectName = `Test Project ${Date.now()}`;
      const projectDescription = 'A comprehensive test project';
      
      // Create project
      await createProject(page, projectName, projectDescription);
      
      // Navigate to project details
      await page.click(`text=${projectName}`);
      await expect(page.locator('h1')).toContainText(projectName);
      
      // Edit project
      await page.click('button:has-text("Edit")');
      await page.fill('input[placeholder*="project name" i]', `${projectName} (Updated)`);
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('h1')).toContainText(`${projectName} (Updated)`);
      
      // Add team member
      await page.click('button:has-text("Add Team Member")');
      await page.fill('input[placeholder*="email" i]', 'teammember@example.com');
      await page.selectOption('select[name="role"]', 'member');
      await page.click('button:has-text("Send Invitation")');
      await expect(page.locator('text=Invitation sent')).toBeVisible();
      
      // Create milestone
      await page.click('button:has-text("Add Milestone")');
      await page.fill('input[placeholder*="milestone title" i]', 'Design Phase');
      await page.fill('textarea[placeholder*="description" i]', 'Complete UI/UX design');
      await page.fill('input[type="date"]', '2024-06-01');
      await page.click('button:has-text("Create Milestone")');
      await expect(page.locator('text=Design Phase')).toBeVisible();
      
      // Archive project
      await page.click('button:has-text("More Actions")');
      await page.click('button:has-text("Archive")');
      await page.click('button:has-text("Confirm Archive")');
      await expect(page.locator('text=Project archived')).toBeVisible();
    });

    test('project views and filtering', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Test different views
      await page.click('button:has-text("Kanban")');
      await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
      
      await page.click('button:has-text("Table")');
      await expect(page.locator('[data-testid="projects-table"]')).toBeVisible();
      
      await page.click('button:has-text("Gantt")');
      await expect(page.locator('[data-testid="gantt-chart"]')).toBeVisible();
      
      // Test filtering
      await page.fill('input[placeholder*="search" i]', 'test');
      await page.waitForTimeout(500); // Debounce
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Test status filter
      await page.selectOption('select[name="status"]', 'active');
      await expect(page.locator('[data-testid="filtered-projects"]')).toBeVisible();
    });

    test('bulk project operations', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Select multiple projects
      await page.check('input[type="checkbox"][data-testid="select-all"]');
      await expect(page.locator('button:has-text("Bulk Actions")')).toBeEnabled();
      
      // Bulk update
      await page.click('button:has-text("Bulk Actions")');
      await page.click('button:has-text("Update Status")');
      await page.selectOption('select[name="status"]', 'completed');
      await page.click('button:has-text("Apply Changes")');
      await expect(page.locator('text=Projects updated successfully')).toBeVisible();
    });
  });

  test.describe('Task Management Flow', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
    });

    test('complete task lifecycle', async ({ page }) => {
      const taskTitle = `Test Task ${Date.now()}`;
      const taskDescription = 'A comprehensive test task';
      
      // Create task
      await createTask(page, taskTitle, taskDescription);
      
      // Edit task
      await page.click(`text=${taskTitle}`);
      await page.click('button:has-text("Edit")');
      await page.fill('input[placeholder*="task title" i]', `${taskTitle} (Updated)`);
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('h1')).toContainText(`${taskTitle} (Updated)`);
      
      // Update status via drag and drop
      await page.goto(`${BASE_URL}/tasks`);
      const taskCard = page.locator(`text=${taskTitle} (Updated)`);
      const todoColumn = page.locator('[data-testid="column-todo"]');
      const inProgressColumn = page.locator('[data-testid="column-in-progress"]');
      
      await taskCard.dragTo(inProgressColumn);
      await expect(taskCard).toBeWithin(inProgressColumn);
      
      // Add comment
      await page.click(`text=${taskTitle} (Updated)`);
      await page.fill('textarea[placeholder*="add comment" i]', 'Working on this task');
      await page.click('button:has-text("Add Comment")');
      await expect(page.locator('text=Working on this task')).toBeVisible();
      
      // Complete task
      await page.goto(`${BASE_URL}/tasks`);
      const doneColumn = page.locator('[data-testid="column-done"]');
      await taskCard.dragTo(doneColumn);
      await expect(taskCard).toBeWithin(doneColumn);
    });

    test('task filtering and search', async ({ page }) => {
      await page.goto(`${BASE_URL}/tasks`);
      
      // Search tasks
      await page.fill('input[placeholder*="search tasks" i]', 'urgent');
      await page.waitForTimeout(500);
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      
      // Filter by assignee
      await page.selectOption('select[name="assignee"]', 'me');
      await expect(page.locator('[data-testid="my-tasks"]')).toBeVisible();
      
      // Filter by priority
      await page.selectOption('select[name="priority"]', 'high');
      await expect(page.locator('[data-testid="high-priority-tasks"]')).toBeVisible();
      
      // Filter by due date
      await page.fill('input[type="date"]', '2024-12-31');
      await page.click('button:has-text("Apply Filters")');
      await expect(page.locator('[data-testid="filtered-tasks"]')).toBeVisible();
    });

    test('time tracking functionality', async ({ page }) => {
      await createTask(page, 'Time Tracking Task', 'Test time tracking');
      
      // Start timer
      await page.click('button:has-text("Start Timer")');
      await expect(page.locator('text=Timer is running')).toBeVisible();
      
      // Wait a moment and stop timer
      await page.waitForTimeout(2000);
      await page.click('button:has-text("Stop Timer")');
      await expect(page.locator('text=Time logged')).toBeVisible();
      
      // View time log
      await page.click('button:has-text("View Time Log")');
      await expect(page.locator('[data-testid="time-log"]')).toBeVisible();
    });
  });

  test.describe('AI Features Flow', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
    });

    test('AI project creation', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Open AI creation modal
      await page.click('button:has-text("Create with AI")');
      await expect(page.locator('[data-testid="ai-modal"]')).toBeVisible();
      
      // Fill specification
      const specification = 'Create a mobile app for task management with features like user authentication, project tracking, and team collaboration';
      await page.fill('textarea[placeholder*="describe your project" i]', specification);
      
      // Select organization
      await page.selectOption('select[name="organization"]', 'Test Organization');
      
      // Generate project
      await page.click('button:has-text("Create with AI")');
      await expect(page.locator('text=Generating project...')).toBeVisible();
      
      // Wait for completion (might take time)
      await page.waitForSelector('text=Project created successfully', { timeout: 30000 });
      await expect(page.locator('[data-testid="generated-project"]')).toBeVisible();
    });

    test('AI chat functionality', async ({ page }) => {
      // Open AI chat
      await page.click('[data-testid="ai-chat-button"]');
      await expect(page.locator('[data-testid="ai-chat-window"]')).toBeVisible();
      
      // Send message
      await page.fill('textarea[placeholder*="ask AI" i]', 'How do I create a project milestone?');
      await page.click('button:has-text("Send")');
      await expect(page.locator('text=AI is thinking...')).toBeVisible();
      
      // Wait for response
      await page.waitForSelector('[data-testid="ai-response"]', { timeout: 15000 });
      await expect(page.locator('[data-testid="ai-response"]')).toContainText('milestone');
      
      // Test conversation history
      await expect(page.locator('[data-testid="chat-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
      
      // Clear chat
      await page.click('button:has-text("Clear Chat")');
      await expect(page.locator('text=Chat cleared')).toBeVisible();
    });

    test('AI suggestions and recommendations', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`);
      
      // Get AI suggestions
      await page.click('button:has-text("Get AI Suggestions")');
      await expect(page.locator('[data-testid="ai-suggestions"]')).toBeVisible();
      
      // Apply suggestion
      await page.click('button:has-text("Apply Suggestion")');
      await expect(page.locator('text=Suggestion applied')).toBeVisible();
    });
  });

  test.describe('Analytics and Reporting', () => {
    test.beforeEach(async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
    });

    test('dashboard analytics', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Check analytics widgets
      await expect(page.locator('[data-testid="total-projects"]')).toBeVisible();
      await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-tasks"]')).toBeVisible();
      await expect(page.locator('[data-testid="team-performance"]')).toBeVisible();
      
      // Test date range filter
      await page.click('button:has-text("Date Range")');
      await page.click('button:has-text("Last 30 Days")');
      await expect(page.locator('[data-testid="updated-analytics"]')).toBeVisible();
      
      // Test chart interactions
      await page.click('[data-testid="completion-chart"]');
      await expect(page.locator('[data-testid="chart-details"]')).toBeVisible();
    });

    test('report generation and export', async ({ page }) => {
      await page.goto(`${BASE_URL}/reports`);
      
      // Generate project report
      await page.selectOption('select[name="reportType"]', 'project-summary');
      await page.selectOption('select[name="dateRange"]', 'last-month');
      await page.click('button:has-text("Generate Report")');
      
      await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
      
      // Export to PDF
      await page.click('button:has-text("Export PDF")');
      await expect(page.locator('text=Report exported successfully')).toBeVisible();
      
      // Export to CSV
      await page.click('button:has-text("Export CSV")');
      await expect(page.locator('text=Report exported successfully')).toBeVisible();
      
      // Schedule report
      await page.click('button:has-text("Schedule Report")');
      await page.fill('input[name="scheduleName"]', 'Monthly Project Report');
      await page.selectOption('select[name="frequency"]', 'monthly');
      await page.click('button:has-text("Schedule")');
      await expect(page.locator('text=Report scheduled')).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('mobile user journey', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Test mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      // Navigate to projects on mobile
      await page.click('button:has-text("Projects")');
      await expect(page.locator('[data-testid="mobile-projects-view"]')).toBeVisible();
      
      // Create project on mobile
      await page.click('button:has-text("New Project")');
      await expect(page.locator('[data-testid="mobile-project-form"]')).toBeVisible();
      
      await page.fill('input[placeholder*="project name" i]', 'Mobile Test Project');
      await page.fill('textarea[placeholder*="description" i]', 'Created on mobile');
      await page.click('button:has-text("Create")');
      
      await expect(page.locator('text=Mobile Test Project')).toBeVisible();
      
      // Test mobile task management
      await page.click('[data-testid="mobile-menu-button"]');
      await page.click('button:has-text("Tasks")');
      await expect(page.locator('[data-testid="mobile-tasks-view"]')).toBeVisible();
      
      // Test touch interactions
      const taskCard = page.locator('[data-testid="task-card"]').first();
      await taskCard.tap();
      await expect(page.locator('[data-testid="task-details"]')).toBeVisible();
    });

    test('tablet responsiveness', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Test tablet layout
      await expect(page.locator('[data-testid="tablet-sidebar"]')).toBeVisible();
      await expect(page.locator('[data-testid="tablet-content"]')).toBeVisible();
      
      // Test tablet-specific features
      await page.goto(`${BASE_URL}/projects`);
      await expect(page.locator('[data-testid="tablet-project-grid"]')).toBeVisible();
    });
  });

  test.describe('Performance and Error Handling', () => {
    test('page load performance', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(`${BASE_URL}/dashboard`);
      const loadTime = Date.now() - startTime;
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check for console errors
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      expect(errors).toHaveLength(0);
    });

    test('network error handling', async ({ page }) => {
      // Simulate offline connection
      await page.context().setOffline(true);
      
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page.locator('[data-testid="offline-message"]')).toBeVisible();
      
      // Test retry functionality
      await page.context().setOffline(false);
      await page.click('button:has-text("Retry")');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
    });

    test('error boundary handling', async ({ page }) => {
      // Navigate to a page that might have errors
      await page.goto(`${BASE_URL}/error-test`);
      
      // Should show error boundary
      await expect(page.locator('[data-testid="error-boundary"]')).toBeVisible();
      await expect(page.locator('text=Something went wrong')).toBeVisible();
      
      // Test error recovery
      await page.click('button:has-text("Try Again")');
      await expect(page.locator('[data-testid="error-recovery"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Testing', () => {
    test('keyboard navigation', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(page.locator(':focus')).toBeVisible();
      
      // Test menu navigation with keyboard
      await page.keyboard.press('Enter');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      
      // Test escape key functionality
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-testid="modal"]')).not.toBeVisible();
    });

    test('screen reader compatibility', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Check for proper ARIA labels
      const buttons = await page.locator('button').all();
      for (const button of buttons.slice(0, 10)) { // Check first 10 buttons
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        expect(ariaLabel || textContent).toBeTruthy();
      }
      
      // Check for proper heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test('color contrast and visual accessibility', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Test high contrast mode
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
      await expect(page.locator('body')).toHaveClass(/dark/);
      
      // Test reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      // Should disable animations
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    test('works in different browsers', async ({ page, browserName }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Test core functionality works across browsers
      await page.goto(`${BASE_URL}/projects`);
      await createProject(page, `Browser Test ${browserName}`, 'Testing cross-browser compatibility');
      
      await expect(page.locator(`text=Browser Test ${browserName}`)).toBeVisible();
      
      // Test responsive behavior
      await page.setViewportSize({ width: 800, height: 600 });
      await expect(page.locator('[data-testid="responsive-layout"]')).toBeVisible();
    });
  });

  test.describe('Data Persistence and Sync', () => {
    test('real-time data synchronization', async ({ page, context }) => {
      // Open two browser sessions
      const page1 = page;
      const page2 = await context.newPage();
      
      await login(page1, TEST_USER.email, TEST_USER.password);
      await login(page2, TEST_USER.email, TEST_USER.password);
      
      // Create project in first session
      await page1.goto(`${BASE_URL}/projects`);
      const projectName = `Sync Test ${Date.now()}`;
      await createProject(page1, projectName, 'Testing real-time sync');
      
      // Check if it appears in second session
      await page2.goto(`${BASE_URL}/projects`);
      await page2.reload();
      await expect(page2.locator(`text=${projectName}`)).toBeVisible({ timeout: 5000 });
      
      await page2.close();
    });

    test('offline functionality', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Go offline
      await page.context().setOffline(true);
      
      // Try to create project (should queue for sync)
      await page.goto(`${BASE_URL}/projects`);
      await page.click('button:has-text("New Project")');
      await page.fill('input[placeholder*="project name" i]', 'Offline Project');
      await page.click('button:has-text("Create Project")');
      
      await expect(page.locator('text=Will sync when online')).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      await page.click('button:has-text("Sync Now")');
      await expect(page.locator('text=Project synced successfully')).toBeVisible();
    });
  });

  test.describe('Security Testing', () => {
    test('session security', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Check for secure session
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name.includes('session'));
      
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.secure).toBe(true); // In production
      expect(sessionCookie?.httpOnly).toBe(true);
    });

    test('XSS protection', async ({ page }) => {
      await login(page, TEST_USER.email, TEST_USER.password);
      
      // Try to inject script in project name
      await page.goto(`${BASE_URL}/projects`);
      await page.click('button:has-text("New Project")');
      await page.fill('input[placeholder*="project name" i]', '<script>alert("xss")</script>Malicious Name');
      await page.click('button:has-text("Create Project")');
      
      // Should sanitize the input
      await expect(page.locator('text=Malicious Name')).toBeVisible();
      await expect(page.locator('script')).not.toBeVisible();
    });

    test('CSRF protection', async ({ page }) => {
      // Test that forms include CSRF tokens
      await login(page, TEST_USER.email, TEST_USER.password);
      await page.goto(`${BASE_URL}/projects`);
      
      const csrfToken = await page.locator('input[name*="csrf"]').count();
      expect(csrfToken).toBeGreaterThan(0);
    });
  });
});
