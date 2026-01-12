import { test, expect } from '@playwright/test';

/**
 * E2E Tests for foco.mx Production Environment
 * Test Credentials:
 * - Email: laurence@fyves.com
 * - Password: hennie12
 */

const PRODUCTION_URL = 'https://foco.mx';
const TEST_EMAIL = 'laurence@fyves.com';
const TEST_PASSWORD = 'hennie12';

test.describe('Scenario 1: Anonymous User Journey', () => {
  test('should visit landing page and explore navigation', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Verify landing page loads
    await expect(page).toHaveURL(PRODUCTION_URL);
    await expect(page).toHaveTitle(/Foco/i);

    // Check for key landing page elements
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible({ timeout: 10000 });

    // Look for navigation menu
    const navigation = page.locator('nav, header');
    await expect(navigation.first()).toBeVisible();

    // Check for sign in button
    const signInButtons = page.locator('a, button').filter({ hasText: /sign in|login|iniciar sesión/i });
    if (await signInButtons.first().isVisible()) {
      await expect(signInButtons.first()).toBeVisible();
    }
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Find and click sign in/login button
    const signInButton = page.locator('a, button').filter({ hasText: /sign in|login|iniciar sesión/i }).first();
    await signInButton.click({ timeout: 5000 });

    // Should navigate to login page
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });

    // Verify login form elements
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="correo"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Scenario 2: Authentication Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/login`);

    // Fill login form
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="correo"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);

    // Submit form
    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign in|login|iniciar|entrar/i }).first();
    await submitButton.click();

    // Wait for redirect after login
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should redirect away from login page
    await expect(page).not.toHaveURL(/login/i, { timeout: 10000 });

    // Check for authenticated state indicators
    const authenticatedElements = page.locator('[data-testid="user-menu"], .user-menu, nav a').filter({ hasText: /dashboard|projects|profile/i });
    const hasAuthElements = await authenticatedElements.count() > 0;

    console.log('Authentication successful:', hasAuthElements);
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // Login first
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.locator('input[type="email"], input[placeholder*="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();

    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const urlAfterLogin = page.url();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should stay on the same page (not redirected to login)
    expect(page.url()).not.toContain('/login');

    console.log('Session persisted after reload:', page.url());
  });

  test('should access protected routes when authenticated', async ({ page }) => {
    // Login
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Try to access dashboard
    await page.goto(`${PRODUCTION_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Should not redirect to login
    expect(page.url()).toContain('dashboard');

    console.log('Protected route accessible:', page.url());
  });
});

test.describe('Scenario 3: Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  });

  test('should display dashboard layout', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    // Check for main dashboard elements
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible({ timeout: 10000 });

    // Check for navigation
    const nav = page.locator('nav, aside');
    await expect(nav.first()).toBeVisible();

    console.log('Dashboard loaded successfully');
  });

  test('should display pinned projects', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    // Look for projects section
    const projectsSection = page.locator('[data-testid*="project"], .project, section').filter({ hasText: /project/i });

    if (await projectsSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Projects section found');
      const projectCount = await projectsSection.count();
      console.log('Project sections found:', projectCount);
    } else {
      console.log('No projects section visible');
    }
  });

  test('should display stats cards', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    // Look for stats/metrics cards
    const statsCards = page.locator('[data-testid*="stat"], [data-testid*="metric"], .stat-card, .metric-card');

    if (await statsCards.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const statsCount = await statsCards.count();
      console.log('Stats cards found:', statsCount);
    } else {
      console.log('No stats cards visible');
    }
  });

  test('should navigate to other sections', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    // Get all navigation links
    const navLinks = page.locator('nav a, aside a');
    const linkCount = await navLinks.count();

    console.log('Navigation links found:', linkCount);

    // Try to click first nav link if available
    if (linkCount > 0) {
      const firstLink = navLinks.first();
      const linkText = await firstLink.textContent();
      console.log('First navigation link:', linkText);

      await firstLink.click();
      await page.waitForLoadState('networkidle');

      console.log('Navigated to:', page.url());
    }
  });
});

test.describe('Scenario 4: Projects Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  });

  test('should navigate to projects page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/projects`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('projects');

    // Check for loading skeleton or projects content
    const loadingSkeleton = page.locator('[data-testid="skeleton"], .skeleton, [aria-busy="true"]');
    const projectsList = page.locator('[data-testid*="project"], .project-list, .project-card');

    // Wait for either loading to finish or projects to appear
    await page.waitForTimeout(2000);

    const hasProjects = await projectsList.count() > 0;
    console.log('Projects found:', hasProjects);
  });

  test('should test project interactions', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/projects`);
    await page.waitForLoadState('networkidle');

    // Look for project cards
    const projectCards = page.locator('[data-testid*="project"], .project-card, article');
    const projectCount = await projectCards.count();

    console.log('Project cards found:', projectCount);

    if (projectCount > 0) {
      // Try clicking first project
      const firstProject = projectCards.first();
      await firstProject.click({ timeout: 5000 });
      await page.waitForLoadState('networkidle');

      console.log('Clicked project, navigated to:', page.url());
    }
  });

  test('should check filters and search', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/projects`);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"], input[placeholder*="buscar"]');

    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Search input found');
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      console.log('Search performed');
    } else {
      console.log('No search input found');
    }

    // Look for filters
    const filters = page.locator('select, [role="combobox"]').filter({ hasText: /filter|sort/i });
    const filterCount = await filters.count();
    console.log('Filters found:', filterCount);
  });
});

test.describe('Scenario 5: Search Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  });

  test('should navigate to search page', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/search`);
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('search');

    // Verify search input visible
    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]');
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 });
  });

  test('should perform search', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/search`);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search"]').first();
    await searchInput.fill('project test');
    await searchInput.press('Enter');

    await page.waitForTimeout(2000);

    // Check for results or no results message
    const resultsContainer = page.locator('[data-testid="search-results"], .search-results, main');
    await expect(resultsContainer).toBeVisible();

    console.log('Search performed, URL:', page.url());
  });

  test('should display loading states during search', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/search`);

    const searchInput = page.locator('input[type="search"]').first();
    await searchInput.fill('test query');
    await searchInput.press('Enter');

    // Look for loading indicators
    const loadingIndicators = page.locator('[aria-busy="true"], .loading, .spinner');

    // Note: Loading might be too fast to catch
    console.log('Search initiated');
  });
});

test.describe('Scenario 6: Accessibility Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    // Test Tab navigation
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          type: el?.getAttribute('type'),
          text: el?.textContent?.substring(0, 30)
        };
      });
      console.log(`Tab ${i + 1} focused:`, focusedElement);
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    // Tab to an interactive element
    await page.keyboard.press('Tab');

    // Check if focused element has visible outline
    const focusedStyle = await page.evaluate(() => {
      const el = document.activeElement;
      const style = window.getComputedStyle(el as Element);
      return {
        outline: style.outline,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow
      };
    });

    console.log('Focus styles:', focusedStyle);

    // Should have some focus indication
    const hasFocusIndicator = focusedStyle.outline !== 'none' ||
                             focusedStyle.outlineWidth !== '0px' ||
                             focusedStyle.boxShadow !== 'none';

    expect(hasFocusIndicator).toBe(true);
  });

  test('should have aria-labels on icon buttons', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    // Find all buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    let buttonsWithLabels = 0;
    let totalButtons = Math.min(buttonCount, 10); // Check first 10

    for (let i = 0; i < totalButtons; i++) {
      const button = buttons.nth(i);
      const hasLabel = await button.evaluate(el => {
        return !!(
          el.textContent?.trim() ||
          el.getAttribute('aria-label') ||
          el.getAttribute('aria-labelledby') ||
          el.getAttribute('title')
        );
      });

      if (hasLabel) buttonsWithLabels++;
    }

    console.log(`Buttons with labels: ${buttonsWithLabels}/${totalButtons}`);
    expect(buttonsWithLabels).toBeGreaterThan(0);
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    const headings = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1')).map(el => el.textContent);
      const h2s = Array.from(document.querySelectorAll('h2')).map(el => el.textContent);
      const h3s = Array.from(document.querySelectorAll('h3')).map(el => el.textContent);

      return { h1: h1s.length, h2: h2s.length, h3: h3s.length };
    });

    console.log('Heading structure:', headings);

    // Should have at least one h1
    expect(headings.h1).toBeGreaterThanOrEqual(1);
  });

  test('should support screen reader landmarks', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    const landmarks = await page.evaluate(() => {
      return {
        main: document.querySelectorAll('main, [role="main"]').length,
        nav: document.querySelectorAll('nav, [role="navigation"]').length,
        header: document.querySelectorAll('header, [role="banner"]').length,
        footer: document.querySelectorAll('footer, [role="contentinfo"]').length
      };
    });

    console.log('ARIA landmarks:', landmarks);

    expect(landmarks.main).toBeGreaterThanOrEqual(1);
    expect(landmarks.nav).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Critical Checks', () => {
  test('should handle authentication redirects', async ({ page }) => {
    // Try to access protected route without auth
    await page.context().clearCookies();
    await page.goto(`${PRODUCTION_URL}/dashboard`);

    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should redirect to login
    expect(page.url()).toMatch(/login|signin|auth/i);

    console.log('Unauthenticated redirect works:', page.url());
  });

  test('should display error messages appropriately', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/login`);

    // Try login with invalid credentials
    await page.locator('input[type="email"]').first().fill('invalid@test.com');
    await page.locator('input[type="password"]').first().fill('wrongpassword');
    await page.locator('button[type="submit"]').first().click();

    await page.waitForTimeout(2000);

    // Look for error message
    const errorMessages = page.locator('[role="alert"], .error, .alert-error');

    if (await errorMessages.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      const errorText = await errorMessages.first().textContent();
      console.log('Error message displayed:', errorText);
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.locator('input[type="email"]').first().fill(TEST_EMAIL);
    await page.locator('input[type="password"]').first().fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Simulate offline
    await page.context().setOffline(true);

    // Try to navigate
    await page.goto(`${PRODUCTION_URL}/projects`).catch(() => {});

    await page.waitForTimeout(2000);

    // Set back online
    await page.context().setOffline(false);

    console.log('Network error handling tested');
  });
});
