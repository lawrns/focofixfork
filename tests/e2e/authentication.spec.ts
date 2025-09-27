import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should display homepage for unauthenticated users', async ({ page }) => {
    await expect(page).toHaveTitle(/Foco/);
    await expect(page.locator('text=Concéntrate en lo importa')).toBeVisible();
    await expect(page.locator('text=Comenzar gratis')).toBeVisible();
    await expect(page.locator('text=Iniciar sesión')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('text=Iniciar sesión');
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('text=Iniciar sesión en Foco')).toBeVisible();
    await expect(page.locator('input[placeholder*="correo"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]').filter({ hasText: 'Iniciar sesión' })).toBeVisible();
  });

  test('should validate login form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=correo es requerido')).toBeVisible();
    await expect(page.locator('text=contraseña es requerida')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder*="correo"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Credenciales inválidas')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=¿No tienes cuenta? Regístrate');

    await expect(page).toHaveURL(/.*register/);
  });

  test('should show registration form', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('text=Crear cuenta en Foco')).toBeVisible();
    await expect(page.locator('input[placeholder*="correo"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="contraseña"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="nombre"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]').filter({ hasText: 'Crear cuenta' })).toBeVisible();
  });

  test('should validate registration form', async ({ page }) => {
    await page.goto('/register');

    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=correo es requerido')).toBeVisible();
    await expect(page.locator('text=contraseña es requerida')).toBeVisible();
    await expect(page.locator('text=nombre es requerido')).toBeVisible();
  });

  test('should handle registration with existing email', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[placeholder*="correo"]', 'existing@example.com');
    await page.fill('input[placeholder*="contraseña"]', 'password123');
    await page.fill('input[placeholder*="nombre"]', 'Existing User');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=correo ya registrado')).toBeVisible();
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=¿Olvidaste tu contraseña?');

    await expect(page).toHaveURL(/.*forgot-password/);
  });

  test('should handle successful login flow', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Bienvenido')).toBeVisible();
  });

  test('should persist authentication across page reloads', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('text=Bienvenido')).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Find and click logout button (may be in user menu)
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Cerrar sesión');

    // Should redirect to homepage
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Comenzar gratis')).toBeVisible();
  });

  test('should protect authenticated routes', async ({ page }) => {
    // Try to access dashboard without authentication
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle session expiration', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*dashboard/);

    // Simulate session expiration (clear cookies/storage)
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('text=Restablecer contraseña')).toBeVisible();

    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('text=Se ha enviado un correo')).toBeVisible();
  });

  test('should validate email format in login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[placeholder*="correo"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Should show email validation error
    await expect(page.locator('text=correo inválido')).toBeVisible();
  });

  test('should validate password strength in registration', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input[placeholder*="correo"]', 'test@example.com');
    await page.fill('input[placeholder*="contraseña"]', 'weak');
    await page.fill('input[placeholder*="nombre"]', 'Test User');
    await page.click('button[type="submit"]');

    // Should show password strength error
    await expect(page.locator('text=contraseña muy débil')).toBeVisible();
  });
});
