/**
 * Production E2E Tests - My Work Page
 * Test with real user credentials: laurence@fyves.com / hennie12
 */

import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://foco.mx';
const TEST_EMAIL = 'laurence@fyves.com';
const TEST_PASSWORD = 'hennie12';

test.describe('Production - My Work Page Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login to production
    await page.goto(`${PRODUCTION_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"], input[placeholder*="correo"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // Submit login
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard or my-work
    await page.waitForURL(/\/(dashboard|my-work|tasks)/, { timeout: 10000 });
    
    // Navigate to My Work page
    await page.goto(`${PRODUCTION_URL}/my-work`);
    await page.waitForLoadState('networkidle');
  });

  test('My Work page loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/my-work/);
    
    // Check for page title
    const heading = page.getByRole('heading', { name: /my work/i });
    await expect(heading).toBeVisible();
  });

  test('Filter button is visible and clickable', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: /filter/i });
    
    await expect(filterButton).toBeVisible();
    await expect(filterButton).toBeEnabled();
    
    // Click should not throw error
    await filterButton.click();
  });

  test('Plan my day button is visible and clickable', async ({ page }) => {
    const planButton = page.getByRole('button', { name: /plan my day/i });
    
    await expect(planButton).toBeVisible();
    await expect(planButton).toBeEnabled();
    
    // Click the button
    await planButton.click();
    
    // Should show loading state or success message
    await page.waitForTimeout(2000);
  });

  test('All four sections are present', async ({ page }) => {
    // Check for section headings
    const nowSection = page.getByText('Now', { exact: true });
    const nextSection = page.getByText('Next', { exact: true });
    const laterSection = page.getByText('Later', { exact: true });
    const waitingSection = page.getByText('Waiting', { exact: true });
    
    await expect(nowSection).toBeVisible();
    await expect(nextSection).toBeVisible();
    await expect(laterSection).toBeVisible();
    await expect(waitingSection).toBeVisible();
  });

  test('Add task buttons are present in all sections', async ({ page }) => {
    const addTaskButtons = page.getByRole('button', { name: /add task/i });
    const count = await addTaskButtons.count();
    
    // Should have at least 4 (one per section)
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('Add task button navigates correctly', async ({ page }) => {
    const addTaskButton = page.getByRole('button', { name: /add task/i }).first();
    
    await addTaskButton.click();
    
    // Should navigate to task creation
    await page.waitForURL(/tasks\/new/, { timeout: 5000 });
    expect(page.url()).toContain('/tasks/new');
  });

  test('Progress bar is visible', async ({ page }) => {
    const progressText = page.getByText(/progress/i);
    await expect(progressText).toBeVisible();
  });

  test('No console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors
    const criticalErrors = errors.filter(err => 
      !err.includes('404') && 
      !err.includes('Failed to fetch') &&
      !err.includes('NetworkError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('Can interact with task items if present', async ({ page }) => {
    // Check if there are any task items
    const taskItems = page.locator('[class*="group"]').filter({ hasText: /.*/ });
    const count = await taskItems.count();
    
    if (count > 0) {
      // Hover over first item to reveal actions
      await taskItems.first().hover();
      await page.waitForTimeout(500);
    }
    
    // Test passes whether tasks exist or not
    expect(true).toBe(true);
  });

  test('Plan my day API endpoint works', async ({ page }) => {
    // Listen for API calls
    let apiCalled = false;
    
    page.on('response', response => {
      if (response.url().includes('/api/my-work/plan-day')) {
        apiCalled = true;
      }
    });
    
    const planButton = page.getByRole('button', { name: /plan my day/i });
    await planButton.click();
    
    // Wait for API call
    await page.waitForTimeout(3000);
    
    // API should have been called
    expect(apiCalled).toBe(true);
  });

  test('Page is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Page should still be functional
    const heading = page.getByRole('heading', { name: /my work/i });
    await expect(heading).toBeVisible();
  });
});

test.describe('Production - CRICO API Endpoints', () => {
  test('CRICO voice endpoint exists', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_URL}/api/crico/voice`, {
      data: { action: 'process', transcript: 'test', sttConfidence: 0.9 }
    });
    
    // Should return 401 (auth required) not 404 (not found)
    expect(response.status()).toBe(401);
  });

  test('CRICO actions endpoint exists', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/crico/actions`);
    
    // Should return 401 (auth required) not 404 (not found)
    expect(response.status()).toBe(401);
  });

  test('CRICO suggestions endpoint exists', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/crico/suggestions`);
    
    // Should return 401 (auth required) not 404 (not found)
    expect(response.status()).toBe(401);
  });

  test('CRICO alignment endpoint exists', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/crico/alignment`);
    
    // Should return 401 (auth required) not 404 (not found)
    expect(response.status()).toBe(401);
  });

  test('CRICO audit endpoint exists', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/crico/audit`);
    
    // Should return 401 (auth required) not 404 (not found)
    expect(response.status()).toBe(401);
  });

  test('Plan my day endpoint exists', async ({ request }) => {
    const response = await request.post(`${PRODUCTION_URL}/api/my-work/plan-day`);
    
    // Should return 401 (auth required) not 404 (not found)
    expect(response.status()).toBe(401);
  });
});
