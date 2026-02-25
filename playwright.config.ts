import { defineConfig, devices } from '@playwright/test';

/**
 * ZanaFleet Playwright E2E Configuration
 *
 * This config runs E2E tests that exercise the full stack:
 * - Starts the API server
 * - Starts the Simulator UI
 * - Tests UI flows that call real API endpoints
 */
export default defineConfig({
  testDir: './tests/api',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list', { printStep: true }]],

  use: {
    baseURL: 'http://localhost:9944',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  timeout: 60000,

  projects: [
    {
      name: 'simulator-e2e',
      testMatch: '**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  webServer: [
    {
      command: 'npm run start:dev -- --config nest-cli.json api',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 300 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'cd apps/simulator && npm run dev',
      url: 'http://localhost:9944',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
