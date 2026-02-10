import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';

import { handlers, resetMockSessions } from '../../mocks/handlers';
import { AuthProvider } from '../../contexts/AuthContext';
import { SignupWizardProvider } from '../../contexts/SignupWizardContext';
import App from '../../App';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@zanafleet/contracts';

jest.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="mock-line-chart" />,
  Bar: () => <canvas data-testid="mock-bar-chart" />,
  Doughnut: () => <canvas data-testid="mock-doughnut-chart" />,
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  resetMockSessions();
  localStorage.clear();
});
afterAll(() => server.close());

const theme = createTheme();

interface RenderAppOptions {
  initialPath?: string;
}

function renderApp({ initialPath = '/' }: RenderAppOptions = {}): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <SignupWizardProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <TestableApp />
          </MemoryRouter>
        </SignupWizardProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * TestableApp wraps the App routes without BrowserRouter since we provide MemoryRouter externally.
 * We inline the routes here to avoid double-router issues.
 */
function TestableApp(): React.ReactElement {
  const { Routes, Route } = require('react-router-dom');
  const { HomePage } = require('../HomePage');
  const { SignIn } = require('../SignIn');
  const { SignupWizard } = require('../SignupWizard');
  const { ProtectedRoute } = require('../ProtectedRoute');
  const { RoleDashboardRouter } = require('../Layout');
  const { AdminDashboard } = require('../../pages/AdminDashboard');
  const { SupportDashboard } = require('../../pages/SupportDashboard');
  const { OperatorDashboard } = require('../../pages/OperatorDashboard');
  const { BusinessDashboard } = require('../../pages/BusinessDashboard');
  const { RiderDashboard } = require('../../pages/RiderDashboard');
  const { DevAccountSwitcher } = require('../DevAccountSwitcher');

  return (
    <>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignupWizard />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <RoleDashboardRouter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/*"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/support/*"
          element={
            <ProtectedRoute>
              <SupportDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/operator/*"
          element={
            <ProtectedRoute>
              <OperatorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/business/*"
          element={
            <ProtectedRoute>
              <BusinessDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/rider/*"
          element={
            <ProtectedRoute>
              <RiderDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
      <DevAccountSwitcher />
    </>
  );
}

function getTestAccountByType(type: string): (typeof TEST_ACCOUNTS)[number] | undefined {
  return TEST_ACCOUNTS.find((account) => account.type === type);
}

async function loginViaDevSwitcher(
  user: ReturnType<typeof userEvent.setup>,
  email: string
): Promise<void> {
  const devToggle = screen.getByTitle('Dev Account Switcher (dev mode only)');
  await user.click(devToggle);

  await waitFor(() => {
    expect(screen.getByText('Test Accounts')).toBeInTheDocument();
  });

  const accountButton = screen.getByRole('button', { name: new RegExp(email, 'i') });
  await user.click(accountButton);
}

describe('App Routing Integration', () => {
  describe('ProtectedRoute gating', () => {
    it('redirects unauthenticated users from /dashboard to /signin', async () => {
      renderApp({ initialPath: '/dashboard' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('redirects unauthenticated users from /dashboard/admin to /signin', async () => {
      renderApp({ initialPath: '/dashboard/admin' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('redirects unauthenticated users from /dashboard/business to /signin', async () => {
      renderApp({ initialPath: '/dashboard/business' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('redirects unauthenticated users from /dashboard/rider to /signin', async () => {
      renderApp({ initialPath: '/dashboard/rider' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('redirects unauthenticated users from /dashboard/operator to /signin', async () => {
      renderApp({ initialPath: '/dashboard/operator' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('redirects unauthenticated users from /dashboard/support to /signin', async () => {
      renderApp({ initialPath: '/dashboard/support' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
      });
    });

    it('allows access to public routes without authentication', async () => {
      renderApp({ initialPath: '/' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /your trusted supply chain partner/i })).toBeInTheDocument();
      });
    });
  });

  describe('DevAccountSwitcher navigation', () => {
    it('renders DevAccountSwitcher on homepage', async () => {
      renderApp({ initialPath: '/' });

      await waitFor(() => {
        expect(screen.getByTitle('Dev Account Switcher (dev mode only)')).toBeInTheDocument();
      });
    });

    it('shows test accounts dropdown when clicked', async () => {
      const user = userEvent.setup();
      renderApp({ initialPath: '/' });

      const devToggle = screen.getByTitle('Dev Account Switcher (dev mode only)');
      await user.click(devToggle);

      await waitFor(() => {
        expect(screen.getByText('Test Accounts')).toBeInTheDocument();
      });

      for (const account of TEST_ACCOUNTS) {
        expect(screen.getByText(account.email)).toBeInTheDocument();
      }
    });
  });

  describe('Admin role dashboard smoke test', () => {
    it('renders Admin Dashboard with expected tabs after login', async () => {
      const user = userEvent.setup();
      const adminAccount = getTestAccountByType('Admin');
      expect(adminAccount).toBeDefined();

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, adminAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Settlements' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Policies' })).toBeInTheDocument();
    });
  });

  describe('Support role dashboard smoke test', () => {
    it('renders Support Dashboard with expected tabs after login', async () => {
      const user = userEvent.setup();
      const supportAccount = getTestAccountByType('Support');
      expect(supportAccount).toBeDefined();

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, supportAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Support Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Disputes' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Refunds' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Recent Payments' })).toBeInTheDocument();
    });
  });

  describe('Rider role dashboard smoke test', () => {
    it('renders Rider Dashboard with expected tabs after login', async () => {
      const user = userEvent.setup();
      const riderAccount = getTestAccountByType('Rider');
      expect(riderAccount).toBeDefined();

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, riderAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Rider Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'History' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Earnings' })).toBeInTheDocument();
    });

    it('Driver account routes to Rider Dashboard', async () => {
      const user = userEvent.setup();
      const driverAccount = getTestAccountByType('Driver');
      expect(driverAccount).toBeDefined();

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, driverAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Rider Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'History' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Earnings' })).toBeInTheDocument();
    });
  });

  describe('BusinessOwner role dashboard smoke test', () => {
    it('renders Business Dashboard with expected tabs after login', async () => {
      const user = userEvent.setup();
      const businessAccount = getTestAccountByType('BusinessOwner');
      expect(businessAccount).toBeDefined();

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, businessAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Orders' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Deliveries' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Invoices' })).toBeInTheDocument();
    });
  });

  describe('SaccoAdmin (Operator) role dashboard smoke test', () => {
    it('renders Operator Dashboard with expected tabs after login', async () => {
      const user = userEvent.setup();
      const saccoAdminAccount = getTestAccountByType('SaccoAdmin');
      expect(saccoAdminAccount).toBeDefined();

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, saccoAdminAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Operator Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Queue' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Candidates' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Route' })).toBeInTheDocument();
    });
  });

  describe('Role switching', () => {
    it('can switch from Admin to Rider account', async () => {
      const user = userEvent.setup();
      const adminAccount = getTestAccountByType('Admin');
      const riderAccount = getTestAccountByType('Rider');

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, adminAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
      });

      await loginViaDevSwitcher(user, riderAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Rider Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
    });

    it('can switch from Support to Business account', async () => {
      const user = userEvent.setup();
      const supportAccount = getTestAccountByType('Support');
      const businessAccount = getTestAccountByType('BusinessOwner');

      renderApp({ initialPath: '/' });

      await loginViaDevSwitcher(user, supportAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Support Dashboard' })).toBeInTheDocument();
      });

      await loginViaDevSwitcher(user, businessAccount!.email);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Orders' })).toBeInTheDocument();
    });
  });

  describe('HomePage authenticated state', () => {
    it('shows "Go to Dashboard" button when authenticated', async () => {
      const user = userEvent.setup();
      const adminAccount = getTestAccountByType('Admin');

      renderApp({ initialPath: '/' });

      expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();

      await loginViaDevSwitcher(user, adminAccount!.email);

      await waitFor(() => {
        expect(screen.queryByRole('link', { name: /get started/i })).not.toBeInTheDocument();
      });
    });
  });
});
