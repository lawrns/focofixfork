import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for production testing
 * Tests against live foco.mx site
 */
export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'test-results/production-smoke-report' }],
    ['json', { outputFile: 'test-results/production-smoke-results.json' }],
    ['list']
  ],
  timeout: 60000,
  use: {
    baseURL: 'https://foco.mx',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  expect: {
    timeout: 10000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
})
