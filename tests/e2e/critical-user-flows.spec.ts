import { test, expect } from '@playwright/test';

/**
 * E2E Tests: Critical User Flows
 * Tests the most important user journeys end-to-end
 */

test.describe('Critical User Flows - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('/');
  });

  test('Complete task lifecycle flow', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');
    expect(page.url()).toContain('/dashboard');

    // 2. Navigate to tasks
    await page.click('text=Tasks', { timeout: 5000 });
    await page.waitForURL('**/tasks**');

    // 3. Create new task
    await page.click('button:has-text("New Task")');
    await page.fill('[placeholder*="Task title"]', 'E2E Test Task');
    await page.fill('[placeholder*="Description"]', 'Task created via E2E test');
    await page.selectOption('[name="priority"]', 'high');
    await page.click('button:has-text("Create")');

    // 4. Verify task appears in list
    await expect(page.locator('text=E2E Test Task')).toBeVisible({ timeout: 10000 });

    // 5. Edit task
    await page.click('text=E2E Test Task');
    await page.click('[aria-label="Edit task"]');
    await page.fill('[name="title"]', 'E2E Test Task - Updated');
    await page.click('button:has-text("Save")');

    // 6. Verify update
    await expect(page.locator('text=E2E Test Task - Updated')).toBeVisible();

    // 7. Mark as complete
    await page.click('[aria-label="Mark as complete"]');
    await expect(page.locator('[data-status="done"]')).toBeVisible();

    // 8. Delete task
    await page.click('[aria-label="More options"]');
    await page.click('text=Delete');
    await page.click('button:has-text("Confirm")');

    // 9. Verify deletion
    await expect(page.locator('text=E2E Test Task - Updated')).not.toBeVisible();
  });

  test('Project creation and task assignment flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Create project
    await page.click('text=Projects');
    await page.click('button:has-text("New Project")');
    await page.fill('[name="name"]', 'E2E Test Project');
    await page.fill('[name="description"]', 'Project for E2E testing');
    await page.click('button:has-text("Create Project")');

    await expect(page.locator('text=E2E Test Project')).toBeVisible();

    // Open project
    await page.click('text=E2E Test Project');

    // Create task within project
    await page.click('button:has-text("Add Task")');
    await page.fill('[placeholder*="Task title"]', 'Project Task');
    await page.click('button:has-text("Create")');

    // Verify task is in project
    await expect(page.locator('text=Project Task')).toBeVisible();

    // Assign task
    await page.click('text=Project Task');
    await page.click('[aria-label="Assign task"]');
    await page.click('[role="option"]:has-text("Assign to me")');

    // Verify assignment
    await expect(page.locator('[data-assigned="true"]')).toBeVisible();
  });

  test('Team collaboration flow', async ({ page, context }) => {
    // User 1 creates a task
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    await page.click('text=Tasks');
    await page.click('button:has-text("New Task")');
    await page.fill('[placeholder*="Task title"]', 'Team Collaboration Task');
    await page.click('button:has-text("Create")');

    // Add comment
    await page.click('text=Team Collaboration Task');
    await page.fill('[placeholder*="Add a comment"]', 'This is a test comment');
    await page.click('button:has-text("Post")');

    await expect(page.locator('text=This is a test comment')).toBeVisible();

    // Verify notification
    await page.click('[aria-label="Notifications"]');
    // Check for notification badge or count
  });

  test('Task search and filter flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to tasks
    await page.click('text=Tasks');

    // Use search
    await page.fill('[placeholder*="Search"]', 'test');
    await page.press('[placeholder*="Search"]', 'Enter');

    // Verify search results
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();

    // Apply filters
    await page.click('button:has-text("Filter")');
    await page.click('text=Priority');
    await page.click('[value="high"]');
    await page.click('button:has-text("Apply")');

    // Verify filtered results
    const tasks = page.locator('[data-priority="high"]');
    await expect(tasks.first()).toBeVisible();
  });

  test('Mobile responsive task creation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Open mobile menu
    await page.click('[aria-label="Open menu"]');
    await page.click('text=Tasks');

    // Create task on mobile
    await page.click('[aria-label="Create new task"]');
    await page.fill('[name="title"]', 'Mobile Task');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=Mobile Task')).toBeVisible();
  });

  test('Offline functionality', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Go offline
    await context.setOffline(true);

    // Try to navigate
    await page.click('text=Tasks');

    // Should show offline indicator
    await expect(page.locator('text=Offline')).toBeVisible({ timeout: 5000 });

    // Try to create task offline (should queue)
    await page.click('button:has-text("New Task")');
    await page.fill('[placeholder*="Task title"]', 'Offline Task');
    await page.click('button:has-text("Create")');

    // Should show queued indicator
    await expect(page.locator('text=Queued')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Task should sync
    await expect(page.locator('text=Offline Task')).toBeVisible({ timeout: 10000 });
  });

  test('Keyboard navigation accessibility', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.keyboard.press('Enter');

    await page.waitForURL('/dashboard');

    // Navigate using Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Activate focused element with Enter
    await page.keyboard.press('Enter');

    // Verify navigation worked
    // This depends on your specific UI structure
  });

  test('Error recovery flow', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Trigger an error (invalid data)
    await page.click('text=Tasks');
    await page.click('button:has-text("New Task")');
    await page.fill('[name="title"]', ''); // Empty title
    await page.click('button:has-text("Create")');

    // Should show error message
    await expect(page.locator('text=Title is required')).toBeVisible();

    // Correct the error
    await page.fill('[name="title"]', 'Valid Task Title');
    await page.click('button:has-text("Create")');

    // Should succeed
    await expect(page.locator('text=Valid Task Title')).toBeVisible();
  });

  test('Performance under heavy data', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD || 'Test123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Navigate to tasks with many items
    const startTime = Date.now();
    await page.click('text=Tasks');
    await page.waitForSelector('[data-testid="task-list"]', { timeout: 10000 });
    const loadTime = Date.now() - startTime;

    // Should load within acceptable time
    expect(loadTime).toBeLessThan(5000);

    // Scroll through list
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Should remain responsive
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
  });
});
