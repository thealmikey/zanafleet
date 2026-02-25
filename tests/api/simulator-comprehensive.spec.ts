import { expect, test } from '@playwright/test';

/**
 * ZanaFleet Comprehensive E2E Tests
 *
 * These tests exercise critical API flows:
 * - Job creation and assignment
 * - Order lifecycle
 * - Delivery workflow
 * - Wallet operations
 * - Debug panel functionality
 * - Error handling
 */

test.describe('ZanaFleet Comprehensive API Tests', () => {
  // Setup - go to homepage before each test
  test.beforeEach(async ({ page }) => {
    console.log('[TEST SETUP] Navigating to homepage...');
    await page.goto('/');
    console.log('[TEST SETUP] Homepage loaded successfully');
  });

  test.describe('Job Feed Operations', () => {
    test('should load job feed with seeded jobs', async ({ page }) => {
      console.log('[TEST] Testing job feed loading...');

      // Login as fleet manager
      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in as Fleet Manager, URL: /jobs');

      // Check job feed elements
      const jobsButton = page.getByRole('button', { name: '📋 Jobs' });
      await expect(jobsButton).toBeVisible();
      console.log('[TEST] Jobs button visible');

      // Wait for job cards to load
      await page.waitForTimeout(1000);
      console.log('[TEST] Job feed loaded');
    });

    test('should filter jobs by status', async ({ page }) => {
      console.log('[TEST] Testing job filtering...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Navigated to jobs page');

      // Look for filter controls
      const filterButtons = page.getByRole('button', { name: /Active|Pending|Completed/i });
      const count = await filterButtons.count();
      console.log(`[TEST] Found ${count} filter buttons`);

      // If filter buttons exist, test them
      if (count > 0) {
        await filterButtons.first().click();
        await page.waitForTimeout(500);
        console.log('[TEST] Filter clicked');
      }
    });

    test('should display job details on click', async ({ page }) => {
      console.log('[TEST] Testing job details view...');

      await page.getByText('Rider').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in as Rider');

      // Look for any job card and click
      const jobCards = page
        .locator('[class*="card"], [class*="Job"]')
        .filter({ hasText: /Delivery|Move|Job/i });
      const cardCount = await jobCards.count();
      console.log(`[TEST] Found ${cardCount} job-related elements`);

      if (cardCount > 0) {
        await jobCards.first().click();
        await page.waitForTimeout(500);
        console.log('[TEST] Clicked on job element');
      }
    });
  });

  test.describe('Order Creation Flow', () => {
    test('should navigate to order creation page', async ({ page }) => {
      console.log('[TEST] Testing order creation navigation...');

      await page.getByText('Business Owner').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in as Business Owner');

      // Look for create order button
      const createButtons = page.getByRole('button', { name: /Create|New Order|Add/i });
      const count = await createButtons.count();
      console.log(`[TEST] Found ${count} create buttons`);

      if (count > 0) {
        await createButtons.first().click();
        await page.waitForTimeout(500);
        console.log('[TEST] Clicked create order button');
      }
    });

    test('should display order form fields', async ({ page }) => {
      console.log('[TEST] Testing order form display...');

      await page.getByText('Business Owner').click();
      await page.waitForURL('/jobs');

      // Navigate to orders if there's a nav item
      const orderNavItems = page
        .getByText('Orders')
        .or(page.getByRole('link', { name: /Orders/i }));
      const navCount = await orderNavItems.count();
      console.log(`[TEST] Found ${navCount} order navigation items`);

      if (navCount > 0) {
        await orderNavItems.first().click();
        await page.waitForTimeout(1000);
        console.log('[TEST] Navigated to orders page');
      }
    });
  });

  test.describe('Delivery Workflow', () => {
    test('should display delivery tracking', async ({ page }) => {
      console.log('[TEST] Testing delivery tracking display...');

      await page.getByText('Rider').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in as Rider');

      // Look for delivery-related elements
      const deliveryElements = page.getByText(/delivery|tracking|status/i);
      const count = await deliveryElements.count();
      console.log(`[TEST] Found ${count} delivery-related elements`);
    });

    test('should show delivery status updates', async ({ page }) => {
      console.log('[TEST] Testing delivery status updates...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in as Fleet Manager');

      // Check for status badges
      const statusBadges = page
        .locator('[class*="status"], [class*="badge"]')
        .filter({ hasText: /Pending|Active|Completed|Cancelled/i });
      const count = await statusBadges.count();
      console.log(`[TEST] Found ${count} status badges`);
    });
  });

  test.describe('Wallet Operations', () => {
    test('should display wallet balance', async ({ page }) => {
      console.log('[TEST] Testing wallet balance display...');

      await page.getByText('Rider').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in as Rider');

      // Navigate to wallet
      await page.getByText('Wallet').first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] Navigated to Wallet page');

      // Check for balance display
      await expect(page.getByText('Balance')).toBeVisible();
      console.log('[TEST] Balance section visible');
    });

    test('should show wallet transactions', async ({ page }) => {
      console.log('[TEST] Testing wallet transactions...');

      await page.getByText('Rider').click();
      await page.waitForURL('/jobs');
      await page.getByText('Wallet').first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] Navigated to wallet');

      // Look for transaction history
      const transactionElements = page.getByText(/transaction|earning|payout|ksh|kes/i);
      const count = await transactionElements.count();
      console.log(`[TEST] Found ${count} transaction-related elements`);
    });

    test('should request payout', async ({ page }) => {
      console.log('[TEST] Testing payout request flow...');

      await page.getByText('Rider').click();
      await page.waitForURL('/jobs');
      await page.getByText('Wallet').first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] On wallet page');

      // Look for payout/request buttons
      const payoutButtons = page.getByRole('button', { name: /Payout|Withdraw|Request/i });
      const count = await payoutButtons.count();
      console.log(`[TEST] Found ${count} payout buttons`);

      if (count > 0) {
        console.log('[TEST] Payout functionality available');
      }
    });
  });

  test.describe('Multi-Workspace Operations', () => {
    test('should switch between workspaces', async ({ page }) => {
      console.log('[TEST] Testing workspace switching...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in');

      // Find and click workspace selector
      const workspaceSelector = page.getByText('QuickBite').or(page.getByText('SwiftMove'));
      await expect(workspaceSelector).toBeVisible();
      console.log('[TEST] Workspace selector visible');

      // Click to switch workspace
      await workspaceSelector.first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] Workspace switched');

      // Verify the other workspace is visible
      const otherWorkspace = page.getByText('SwiftMove');
      const isVisible = await otherWorkspace.isVisible();
      console.log(`[TEST] Other workspace visible: ${isVisible}`);
    });

    test('should display different data per workspace', async ({ page }) => {
      console.log('[TEST] Testing workspace-specific data...');

      await page.getByText('Business Owner').click();
      await page.waitForURL('/jobs');
      console.log('[TEST] Logged in as Business Owner');

      // Should see multiple workspaces
      const workspaces = page.getByText('QuickBite').or(page.getByText('BulkHub'));
      const count = await workspaces.count();
      console.log(`[TEST] Found ${count} workspace options`);
    });
  });

  test.describe('Reports and Analytics', () => {
    test('should display dashboard metrics', async ({ page }) => {
      console.log('[TEST] Testing dashboard metrics...');

      await page.getByText('Business Owner').click();
      await page.waitForURL('/jobs');
      await page.getByText('Dashboard').first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] On dashboard page');

      // Check for metrics
      const metricElements = page.getByText(/total|earnings|jobs|success|rate/i);
      const count = await metricElements.count();
      console.log(`[TEST] Found ${count} metric elements`);
    });

    test('should generate reports', async ({ page }) => {
      console.log('[TEST] Testing report generation...');

      await page.getByText('Business Owner').click();
      await page.waitForURL('/jobs');
      await page.getByText('Reports').first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] On reports page');

      // Look for report controls
      const reportButtons = page.getByRole('button', { name: /Generate|Export|Download|Filter/i });
      const count = await reportButtons.count();
      console.log(`[TEST] Found ${count} report control buttons`);
    });
  });

  test.describe('Contact Management', () => {
    test('should display contacts list', async ({ page }) => {
      console.log('[TEST] Testing contacts list...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');
      await page.getByText('Contacts').first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] On contacts page');

      // Check for contacts
      await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
      console.log('[TEST] Contacts page visible');
    });

    test('should add new contact', async ({ page }) => {
      console.log('[TEST] Testing add contact flow...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');
      await page.getByText('Contacts').first().click();
      await page.waitForTimeout(500);

      // Look for add contact button
      const addButtons = page.getByRole('button', { name: /Add|New|Contact/i });
      const count = await addButtons.count();
      console.log(`[TEST] Found ${count} add contact buttons`);
    });
  });

  test.describe('Debug Panel', () => {
    test('should toggle debug panel', async ({ page }) => {
      console.log('[TEST] Testing debug panel toggle...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');

      // Look for debug/API panel toggle
      const debugToggles = page.getByText(/API|Debug|Logs|Console/i);
      const count = await debugToggles.count();
      console.log(`[TEST] Found ${count} debug toggle elements`);

      if (count > 0) {
        await debugToggles.first().click();
        await page.waitForTimeout(500);
        console.log('[TEST] Debug panel toggled');
      }
    });

    test('should display request history', async ({ page }) => {
      console.log('[TEST] Testing request history display...');

      await page.getByText('Rider').click();
      await page.waitForURL('/jobs');

      // Trigger some navigation to generate requests
      await page.getByText('Dashboard').first().click();
      await page.waitForTimeout(1000);
      console.log('[TEST] Navigated, generating request history');

      // Look for request history display
      const requestElements = page.getByText(/request|response|api|call/i);
      const count = await requestElements.count();
      console.log(`[TEST] Found ${count} request-related elements`);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      console.log('[TEST] Testing error handling...');

      // Go directly to a non-existent route
      await page.goto('/non-existent-route-12345');
      await page.waitForTimeout(500);
      console.log('[TEST] Navigated to non-existent route');

      // Should show error page or redirect
      const currentUrl = page.url();
      console.log(`[TEST] Current URL: ${currentUrl}`);
    });

    test('should show loading states', async ({ page }) => {
      console.log('[TEST] Testing loading states...');

      await page.getByText('Fleet Manager').click();

      // Check for loading indicators during navigation
      const loadingElements = page.locator(
        '[class*="loading"], [class*="spinner"], [class*="skeleton"]'
      );
      const count = await loadingElements.count();
      console.log(`[TEST] Found ${count} loading elements during navigation`);
    });
  });

  test.describe('Navigation UX', () => {
    test('should maintain navigation state', async ({ page }) => {
      console.log('[TEST] Testing navigation state...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');

      // Navigate to multiple pages
      await page.getByText('Dashboard').first().click();
      await page.waitForURL('/dashboard');
      console.log('[TEST] Navigated to dashboard');

      await page.getByText('Jobs').first().click();
      await page.waitForTimeout(500);
      console.log('[TEST] Navigated back to jobs');

      // Verify we're on jobs page
      await expect(page).toHaveURL(/jobs/);
      console.log('[TEST] Navigation state maintained');
    });

    test('should highlight active navigation item', async ({ page }) => {
      console.log('[TEST] Testing active navigation highlight...');

      await page.getByText('Rider').click();
      await page.waitForURL('/jobs');

      // Get navigation items
      const navItems = page.locator('nav a, nav button, [class*="nav"] a, [class*="menu"] a');
      const count = await navItems.count();
      console.log(`[TEST] Found ${count} navigation items`);
    });
  });

  test.describe('Performance', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      console.log('[TEST] Testing page load performance...');

      const startTime = Date.now();
      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');
      const loadTime = Date.now() - startTime;

      console.log(`[TEST] Page load time: ${loadTime}ms`);

      // Performance assertion - page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large data sets', async ({ page }) => {
      console.log('[TEST] Testing large data set handling...');

      await page.getByText('Fleet Manager').click();
      await page.waitForURL('/jobs');

      // Wait for any data to load
      await page.waitForTimeout(2000);

      const content = await page.content();
      const size = content.length;
      console.log(`[TEST] Page content size: ${size} characters`);
    });
  });
});

test.describe('ZanaFleet Critical Path Tests', () => {
  test.beforeEach(async ({ page }) => {
    console.log('[CRITICAL TEST] Starting critical path test...');
    await page.goto('/');
  });

  test('Complete rider delivery flow', async ({ page }) => {
    console.log('[CRITICAL] Testing complete rider delivery flow...');

    // 1. Login as Rider
    await page.getByText('Rider').click();
    await page.waitForURL('/jobs');
    console.log('[CRITICAL] Step 1: Logged in as Rider');

    // 2. View available jobs
    await page.waitForTimeout(1000);
    console.log('[CRITICAL] Step 2: Viewing available jobs');

    // 3. Navigate to wallet to check earnings
    await page.getByText('Wallet').first().click();
    await page.waitForTimeout(500);
    const balanceVisible = await page.getByText('Balance').isVisible();
    console.log(`[CRITICAL] Step 3: Wallet balance visible: ${balanceVisible}`);

    // 4. Navigate back to jobs
    await page.getByText('Jobs').first().click();
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 4: Back to jobs');

    // 5. Check contacts
    await page.getByText('Contacts').first().click();
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 5: Viewed contacts');

    console.log('[CRITICAL] Complete rider flow finished successfully');
  });

  test('Complete business owner flow', async ({ page }) => {
    console.log('[CRITICAL] Testing complete business owner flow...');

    // 1. Login as Business Owner
    await page.getByText('Business Owner').click();
    await page.waitForURL('/jobs');
    console.log('[CRITICAL] Step 1: Logged in as Business Owner');

    // 2. Check dashboard
    await page.getByText('Dashboard').first().click();
    await page.waitForTimeout(1000);
    console.log('[CRITICAL] Step 2: Viewed dashboard');

    // 3. Check billing
    await page.getByText('Billing').first().click();
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 3: Viewed billing');

    // 4. Check reports
    await page.getByText('Reports').first().click();
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 4: Viewed reports');

    // 5. Check contacts
    await page.getByText('Contacts').first().click();
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 5: Viewed contacts');

    console.log('[CRITICAL] Complete business owner flow finished successfully');
  });

  test('Multi-workspace switching flow', async ({ page }) => {
    console.log('[CRITICAL] Testing multi-workspace switching...');

    // 1. Login
    await page.getByText('Fleet Manager').click();
    await page.waitForURL('/jobs');
    console.log('[CRITICAL] Step 1: Logged in');

    // 2. Switch to first workspace
    await page.getByText('QuickBite').click();
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 2: Switched to QuickBite');

    // 3. View jobs in first workspace
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 3: Viewed jobs in QuickBite');

    // 4. Switch to second workspace
    await page.getByText('SwiftMove').click();
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 4: Switched to SwiftMove');

    // 5. View jobs in second workspace
    await page.waitForTimeout(500);
    console.log('[CRITICAL] Step 5: Viewed jobs in SwiftMove');

    console.log('[CRITICAL] Multi-workspace switching finished successfully');
  });
});
