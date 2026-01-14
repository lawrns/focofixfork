import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/production-report', open: 'never' }],
    ['json', { outputFile: 'test-results/production-results.json' }],
  ],
  use: {
    baseURL: 'https://foco.mx',
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
