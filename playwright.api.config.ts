import { defineConfig } from '@playwright/test'

/**
 * API Testing Configuration for Production
 * Tests API endpoints without starting a local webserver
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /api-production-verification\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/api-tests' }]
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 60000,
})
