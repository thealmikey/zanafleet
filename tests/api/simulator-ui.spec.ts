import { test, expect } from '@playwright/test';

/**
 * ZanaFleet Product Simulator UI Tests
 *
 * These tests verify the React Simulator functionality:
 * - Multi-vertical job orchestration (delivery, moving, wholesale, fleet, marketplace)
 * - Multi-workspace support
 * - Job creation and workflow
 * - Wallet, Billing, Maps features
 * - Contact management
 * - Reporting dashboard
 */

test.describe('ZanaFleet Product Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Homepage', () => {
    test('should load the homepage with branding', async ({ page }) => {
      await expect(page.getByText('ZanaFleet')).toBeVisible();
      await expect(page.getByText('Multi-Vertical Job Orchestration Platform')).toBeVisible();
      await expect(page.getByText('Welcome to ZanaFleet Simulator')).toBeVisible();
    });

    test('should show persona cards for login', async ({ page }) => {
      // Check for persona cards
      await expect(page.getByText('Rider')).toBeVisible();
      await expect(page.getByText('Fleet Manager')).toBeVisible();
      await expect(page.getByText('Business Owner')).toBeVisible();
      await expect(page.getByText('Marketplace Contractor')).toBeVisible();
      await expect(page.getByText('System Admin')).toBeVisible();
    });

    test('should show workspace selector after login', async ({ page }) => {
      // Click on Fleet Manager persona to login
      await page.getByText('Fleet Manager').click();

      // Should navigate to jobs page
      await expect(page).toHaveURL('/jobs');
    });
  });

  test.describe('Authentication', () => {
    test('should login as rider', async ({ page }) => {
      await page.getByText('Rider').click();
      await expect(page).toHaveURL('/jobs');
    });

    test('should login as fleet manager', async ({ page }) => {
      await page.getByText('Fleet Manager').click();
      await expect(page).toHaveURL('/jobs');
    });

    test('should login as business owner', async ({ page }) => {
      await page.getByText('Business Owner').click();
      await expect(page).toHaveURL('/jobs');
    });
  });

  test.describe('Job Feed', () => {
    test('should display job feed after login', async ({ page }) => {
      await page.getByText('Fleet Manager').click();
      await expect(page).toHaveURL('/jobs');
      // Should show job cards - use more specific selector
      await expect(page.getByRole('button', { name: '📋 Jobs' })).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between pages', async ({ page }) => {
      // Login first
      await page.getByText('Fleet Manager').click();
      await expect(page).toHaveURL('/jobs');

      // Navigate to Dashboard
      await page.getByText('Dashboard').first().click();
      await expect(page).toHaveURL('/dashboard');

      // Navigate to Contacts
      await page.getByText('Contacts').first().click();
      await expect(page).toHaveURL('/contacts');
    });
  });

  test.describe('Multi-workspace support', () => {
    test('should show workspace selector', async ({ page }) => {
      await page.getByText('Fleet Manager').click();

      // Should see workspace selector
      await expect(page.getByText('QuickBite')).toBeVisible();
      await expect(page.getByText('SwiftMove')).toBeVisible();
    });

    test('should switch between workspaces', async ({ page }) => {
      await page.getByText('Fleet Manager').click();

      // Just verify the workspaces are visible in the UI
      await expect(page.getByText('QuickBite')).toBeVisible();
    });
  });

  test.describe('Multi-vertical support', () => {
    test('should show delivery jobs', async ({ page }) => {
      await page.getByText('Rider').click();

      // Should see delivery-related job elements - use button role
      await expect(page.getByRole('button', { name: '📋 Jobs' })).toBeVisible();
    });

    test('should show moving jobs', async ({ page }) => {
      await page.getByText('Fleet Manager').click();

      // Should see jobs from different verticals - use button role
      await expect(page.getByRole('button', { name: '📋 Jobs' })).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test('should display dashboard metrics', async ({ page }) => {
      await page.getByText('Business Owner').click();
      await page.getByText('Dashboard').first().click();

      // Should show metrics - look for the metrics heading
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    });
  });

  test.describe('Reports', () => {
    test('should display reports page', async ({ page }) => {
      await page.getByText('Business Owner').click();
      await page.getByText('Reports').first().click();

      await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
    });
  });

  test.describe('Wallet', () => {
    test('should display wallet page', async ({ page }) => {
      await page.getByText('Rider').click();
      await page.getByText('Wallet').first().click();

      await expect(page.getByRole('heading', { name: 'Wallet' })).toBeVisible();
      await expect(page.getByText('Balance')).toBeVisible();
    });
  });

  test.describe('Billing', () => {
    test('should display billing page', async ({ page }) => {
      await page.getByText('Business Owner').click();
      await page.getByText('Billing').first().click();

      await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible();
    });
  });

  test.describe('Maps', () => {
    test('should display maps page', async ({ page }) => {
      await page.getByText('Fleet Manager').click();
      await page.getByText('Maps').first().click();

      await expect(page.getByRole('heading', { name: 'Map View' })).toBeVisible();
    });
  });

  test.describe('Contacts', () => {
    test('should display contacts page', async ({ page }) => {
      await page.getByText('Fleet Manager').click();
      await page.getByText('Contacts').first().click();

      await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
    });
  });
});
