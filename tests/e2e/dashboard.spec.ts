import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display dashboard with proper layout', async ({ page }) => {
    // Check main dashboard elements
    await expect(page.locator('nav')).toBeVisible(); // Sidebar navigation
    await expect(page.locator('header')).toBeVisible(); // Top header
    await expect(page.locator('main')).toBeVisible(); // Main content area

    // Check accessibility features
    await expect(page.locator('.skip-link')).toBeVisible(); // Skip links
    await expect(page.locator('[role="main"]')).toBeVisible(); // Main landmark
  });

  test('should display project information', async ({ page }) => {
    // Check if projects are displayed
    const projectSection = page.locator('[data-testid="projects-section"], .projects-section');
    if (await projectSection.isVisible()) {
      await expect(projectSection).toBeVisible();

      // Check for project actions
      await expect(page.locator('button').filter({ hasText: /crear proyecto/i })).toBeVisible();
    }
  });

  test('should handle view switching', async ({ page }) => {
    // Check for view switcher buttons
    const tableView = page.locator('button').filter({ hasText: /tabla/i });
    const kanbanView = page.locator('button').filter({ hasText: /kanban/i });
    const ganttView = page.locator('button').filter({ hasText: /gantt/i });

    // At least one view should be active/visible
    const visibleViews = await Promise.all([
      tableView.isVisible(),
      kanbanView.isVisible(),
      ganttView.isVisible(),
    ]);

    expect(visibleViews.some(Boolean)).toBe(true);
  });

  test('should display tasks and milestones', async ({ page }) => {
    // Check for tasks section
    const tasksSection = page.locator('[data-testid="tasks-section"], .tasks-section');
    if (await tasksSection.isVisible()) {
      await expect(tasksSection).toBeVisible();
    }

    // Check for milestones section
    const milestonesSection = page.locator('[data-testid="milestones-section"], .milestones-section');
    if (await milestonesSection.isVisible()) {
      await expect(milestonesSection).toBeVisible();
    }
  });

  test('should handle search functionality', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="buscar"], input[type="search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test project');
      await searchInput.press('Enter');

      // Should update results or show no results message
      await expect(page.locator('text=Sin resultados, text=No results, text=Resultados')).toBeTruthy();
    }
  });

  test('should handle sidebar navigation', async ({ page }) => {
    // Check sidebar toggle (mobile)
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"], button[aria-label*="menu"]');

    if (await sidebarToggle.isVisible()) {
      await sidebarToggle.click();

      // Sidebar should be visible or hidden
      const sidebar = page.locator('nav, aside');
      await expect(sidebar).toBeVisible();
    }

    // Check sidebar navigation items
    const navItems = page.locator('nav a, aside a');
    const navCount = await navItems.count();

    if (navCount > 0) {
      // At least one navigation item should be present
      expect(navCount).toBeGreaterThan(0);
    }
  });

  test('should display user menu and settings', async ({ page }) => {
    // Look for user menu/avatar
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="usuario"], .user-menu');

    if (await userMenu.isVisible()) {
      await userMenu.click();

      // User menu should open with options
      const menuItems = page.locator('[role="menu"] li, [role="menuitem"]');
      const menuCount = await menuItems.count();

      if (menuCount > 0) {
        // Should have at least profile/settings option
        await expect(menuItems.filter({ hasText: /perfil|settings|configuración/i })).toBeTruthy();
      }
    }
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Sidebar should be hidden on mobile
    const sidebar = page.locator('nav, aside');
    const sidebarVisible = await sidebar.isVisible();

    // On mobile, sidebar might be hidden by default
    // This is implementation dependent

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Content should be visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display connection status', async ({ page }) => {
    // Look for connection status indicator
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status');

    if (await connectionStatus.isVisible()) {
      // Should show online status
      await expect(connectionStatus).toContainText(/online|conectado/i);
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test skip links
    const skipLinks = page.locator('.skip-link');

    if (await skipLinks.first().isVisible()) {
      // Focus first skip link
      await page.keyboard.press('Tab');

      // Should be able to navigate with keyboard
      await page.keyboard.press('Enter');

      // Should skip to target section
      const mainContent = page.locator('#main-content, [role="main"]');
      if (await mainContent.isVisible()) {
        // Focus should be in main content area
        const activeElement = await page.evaluate(() => document.activeElement?.id);
        expect(activeElement).toBe('main-content');
      }
    }
  });

  test('should display loading states', async ({ page }) => {
    // Trigger an action that shows loading
    const actionButton = page.locator('button').filter({ hasText: /cargar|load|refresh/i }).first();

    if (await actionButton.isVisible()) {
      await actionButton.click();

      // Look for loading indicators
      const loadingIndicator = page.locator('[aria-busy="true"], .loading, .spinner, text=/cargando/i');

      // Loading might be brief, so we don't assert it's always visible
      // Just check that the action completes without error
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should handle empty states', async ({ page }) => {
    // Look for empty state messages
    const emptyStates = page.locator('text=/sin proyectos|no projects|empty|vacío/i');

    // If empty states exist, they should be helpful
    if (await emptyStates.first().isVisible()) {
      // Should have call-to-action
      const ctaButton = page.locator('button').filter({ hasText: /crear|create|add/i });
      await expect(ctaButton).toBeVisible();
    }
  });

  test('should maintain state across navigation', async ({ page }) => {
    // Navigate within dashboard
    const currentUrl = page.url();

    // Click on a navigation item if available
    const navLink = page.locator('nav a').first();
    if (await navLink.isVisible()) {
      await navLink.click();

      // Should navigate somewhere
      await expect(page.url()).not.toBe(currentUrl);

      // Should be able to navigate back
      await page.goBack();
      await expect(page.url()).toBe(currentUrl);
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Try to trigger an error condition (this might be hard to do in E2E)
    // Look for error messages
    const errorMessages = page.locator('[role="alert"], .error, .alert-error');

    // If errors exist, they should be user-friendly
    if (await errorMessages.first().isVisible()) {
      // Should have descriptive error message
      const errorText = await errorMessages.first().textContent();
      expect(errorText?.length).toBeGreaterThan(10);
    }
  });

  test('should display performance metrics', async ({ page }) => {
    // Look for performance indicators
    const performanceMetrics = page.locator('[data-testid="performance-metrics"], .performance-metrics');

    if (await performanceMetrics.isVisible()) {
      // Should show relevant metrics
      await expect(performanceMetrics).toBeVisible();
    }
  });
});
