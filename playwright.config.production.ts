import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for production testing
 * Tests against live foco.mx site
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run sequentially for production testing
  forbidOnly: true,
  retries: 2, // Retry failed tests due to network issues
  workers: 1, // Single worker for production
  reporter: [['html', { outputFolder: 'playwright-report-production' }], ['list']],
  timeout: 30000, // 30 second timeout per test
  use: {
    baseURL: 'https://foco.mx',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // No webServer needed - testing production site
})
