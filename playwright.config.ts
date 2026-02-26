import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Pre-flight check to verify build artifacts and module resolution
 */
function preFlightCheck(): void {
  const checks = [
    { name: 'API entry point', path: 'dist/api/src/main.js' },
    { name: 'Contracts package', path: 'packages/contracts/dist/src/index.js' },
    { name: 'Utils package', path: 'packages/utils/dist/src/index.js' },
  ];

  let allPassed = true;
  console.log('\n🔍 Pre-flight build verification:');

  for (const check of checks) {
    const exists = existsSync(resolve(process.cwd(), check.path));
    if (exists) {
      console.log(`  ✓ ${check.name}: ${check.path}`);
    } else {
      console.log(`  ✗ ${check.name}: ${check.path} - NOT FOUND`);
      allPassed = false;
    }
  }

  // Check for module resolution in compiled files
  if (existsSync('dist/api/src/core/media/entities/media-asset.entity.js')) {
    const content = readFileSync('dist/api/src/core/media/entities/media-asset.entity.js', 'utf-8');
    if (content.includes('packages/contracts/dist/src')) {
      console.log('  ✓ Module resolution: Correctly points to dist/');
    } else if (content.includes('packages/contracts/src')) {
      console.log('  ✗ Module resolution: Still points to source - will fail!');
      allPassed = false;
    }
  }

  if (!allPassed) {
    console.error('\n❌ Pre-flight check failed! Run "npm run build" first.');
    process.exit(1);
  }
  console.log('\n✅ All pre-flight checks passed!\n');
}

// Run pre-flight check
preFlightCheck();

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
      // Run the compiled API directly from dist/api/src
      command: 'node dist/api/src/main.js',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 300 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test',
        PORT: '3000',
        DB_HOST: '127.0.0.1',
        DB_PORT: '5432',
        DB_USER: 'postgres',
        DB_PASSWORD: 'postgres',
        DB_NAME: 'zanafleet_test',
        NEO4J_HOST: '127.0.0.1',
        NEO4J_PORT: '7687',
        NATS_HOST: '127.0.0.1',
        NATS_PORT: '4222',
      },
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
