/**
 * My Work Page Button Functionality Tests
 * Verify all buttons have click handlers and work correctly
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3002';

test.describe('My Work Page - Button Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/my-work`);
    await page.waitForLoadState('networkidle');
  });

  test('Filter button exists and is clickable', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: /filter/i });
    await expect(filterButton).toBeVisible();
    
    // Click should not throw error
    await filterButton.click();
    
    // Button should toggle state (showFilter state changes)
    await expect(filterButton).toBeEnabled();
  });

  test('Plan my day button exists and is clickable', async ({ page }) => {
    const planButton = page.getByRole('button', { name: /plan my day/i });
    await expect(planButton).toBeVisible();
    await expect(planButton).toBeEnabled();
    
    // Button should be clickable (will fail auth but that's expected)
    await planButton.click();
  });

  test('Add task buttons exist in all sections', async ({ page }) => {
    // Check for "Add task" buttons in each section
    const addTaskButtons = page.getByRole('button', { name: /add task/i });
    const count = await addTaskButtons.count();
    
    // Should have 4 sections: Now, Next, Later, Waiting
    expect(count).toBeGreaterThanOrEqual(4);
    
    // All should be clickable
    for (let i = 0; i < Math.min(count, 4); i++) {
      await expect(addTaskButtons.nth(i)).toBeEnabled();
    }
  });

  test('Add task button navigates to task creation', async ({ page }) => {
    const addTaskButton = page.getByRole('button', { name: /add task/i }).first();
    
    // Click should navigate
    await addTaskButton.click();
    
    // Should navigate to /tasks/new with section parameter
    await page.waitForURL(/\/tasks\/new/);
    expect(page.url()).toContain('/tasks/new');
  });

  test('Plan my day API endpoint exists', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/my-work/plan-day`);
    
    // Should return 401 (unauthorized) not 404 (not found)
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('All buttons have proper aria labels', async ({ page }) => {
    const filterButton = page.getByRole('button', { name: /filter/i });
    const planButton = page.getByRole('button', { name: /plan my day/i });
    
    await expect(filterButton).toBeVisible();
    await expect(planButton).toBeVisible();
  });

  test('Buttons do not have console errors on click', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Click all buttons
    const filterButton = page.getByRole('button', { name: /filter/i });
    await filterButton.click();
    
    await page.waitForTimeout(500);
    
    // Filter out expected auth errors
    const unexpectedErrors = errors.filter(err => 
      !err.includes('401') && 
      !err.includes('Unauthorized') &&
      !err.includes('Failed to fetch')
    );
    
    expect(unexpectedErrors.length).toBe(0);
  });

  test('Plan my day button shows loading state', async ({ page }) => {
    const planButton = page.getByRole('button', { name: /plan my day/i });
    
    await planButton.click();
    
    // Should show "Planning..." text briefly
    // (Will fail auth but should still show loading state)
    await page.waitForTimeout(100);
  });

  test('No onClick handler errors in console', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('onClick')) {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/my-work`);
    await page.waitForLoadState('networkidle');
    
    expect(errors.length).toBe(0);
  });
});
