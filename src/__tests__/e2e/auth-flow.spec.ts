/**
 * Authentication Flow E2E Tests
 */

import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from the login page
    await page.goto('/login')
  })

  test('should allow user to register and login', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Sign up')

    // Fill out registration form
    await page.fill('[data-testid="email-input"]', 'testuser@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')

    // Submit registration
    await page.click('[data-testid="register-button"]')

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

    // Logout to test login flow
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Sign out')

    // Should be redirected to login page
    await expect(page).toHaveURL('/login')

    // Login with the registered account
    await page.fill('[data-testid="email-input"]', 'testuser@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should show validation errors for invalid inputs', async ({ page }) => {
    // Try to login with empty fields
    await page.click('[data-testid="login-button"]')

    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()

    // Try with invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await expect(page.locator('text=Please enter a valid email address')).toBeVisible()
  })

  test('should handle invalid credentials', async ({ page }) => {
    // Try to login with wrong credentials
    await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')

    // Should show error message
    await expect(page.locator('text=Invalid login credentials')).toBeVisible()
  })

  test('should allow password reset', async ({ page }) => {
    // Click forgot password link
    await page.click('text=Forgot your password?')

    // Fill out reset form
    await page.fill('[data-testid="reset-email-input"]', 'test@example.com')
    await page.click('[data-testid="reset-button"]')

    // Should show success message
    await expect(page.locator('text=Password reset email sent')).toBeVisible()
  })

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL('/login')

    // Try to access project page
    await page.goto('/projects/project-123')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should maintain session across page refreshes', async ({ page, context }) => {
    // Login first
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL('/dashboard')

    // Refresh the page
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should handle session expiration', async ({ page }) => {
    // This test would require mocking session expiration
    // For now, just ensure the logout functionality works
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    await expect(page).toHaveURL('/dashboard')

    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('text=Sign out')

    await expect(page).toHaveURL('/login')
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Navigate with keyboard
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused()

    // Submit with Enter key
    await page.keyboard.press('Enter')
    // Should show validation errors since fields are empty
    await expect(page.locator('text=Email is required')).toBeVisible()
  })

  test('should be accessible', async ({ page }) => {
    // Check for proper heading structure
    const h1 = page.locator('h1')
    await expect(h1).toContainText(/sign in|login/i)

    // Check for proper form labels
    const emailLabel = page.locator('label[for="email"]')
    await expect(emailLabel).toBeVisible()

    const passwordLabel = page.locator('label[for="password"]')
    await expect(passwordLabel).toBeVisible()

    // Check for sufficient color contrast (this would be checked by axe-core)
    // Check for proper ARIA attributes
    const form = page.locator('form')
    await expect(form).toHaveAttribute('aria-label', /sign in|login/i)
  })
})


