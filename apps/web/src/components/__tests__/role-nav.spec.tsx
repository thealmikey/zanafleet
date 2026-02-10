import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';
import { handlers, resetMockSessions } from '../../mocks/handlers';
import { AuthProvider } from '../../contexts/AuthContext';
import { DashboardLayout } from '../Layout/DashboardLayout';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@zanafleet/contracts';
import { login } from '../../services/authApi';

const server = setupServer(...handlers);

const theme = createTheme();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockSessions();
});
afterAll(() => server.close());

interface RoleNavTestCase {
  accountType: string;
  expectedNavItems: string[];
  unexpectedNavItems: string[];
}

const ROLE_NAV_TEST_CASES: RoleNavTestCase[] = [
  {
    accountType: 'admin',
    expectedNavItems: ['Metrics', 'Settlements', 'Management'],
    unexpectedNavItems: ['Queue', 'Candidates', 'Orders', 'Deliveries', 'Active', 'Earnings'],
  },
  {
    accountType: 'support',
    expectedNavItems: ['Metrics', 'Disputes', 'Refunds', 'Payments'],
    unexpectedNavItems: ['Settlements', 'Management', 'Queue', 'Orders'],
  },
  {
    accountType: 'operator',
    expectedNavItems: ['Metrics', 'Queue', 'Candidates', 'Route'],
    unexpectedNavItems: ['Settlements', 'Disputes', 'Orders', 'Active'],
  },
  {
    accountType: 'business',
    expectedNavItems: ['Metrics', 'Orders', 'Deliveries', 'Invoices'],
    unexpectedNavItems: ['Settlements', 'Disputes', 'Queue', 'Active'],
  },
  {
    accountType: 'rider',
    expectedNavItems: ['Active', 'History', 'Earnings'],
    unexpectedNavItems: ['Settlements', 'Disputes', 'Queue', 'Orders', 'Invoices'],
  },
];

function getTestAccountByType(type: string): (typeof TEST_ACCOUNTS)[number] | undefined {
  const typeMap: Record<string, string[]> = {
    admin: ['Admin', 'SiteOwner'],
    support: ['Support'],
    operator: ['SaccoAdmin', 'Operator'],
    business: ['BusinessOwner', 'Business'],
    rider: ['Rider', 'Driver'],
  };
  const roles = typeMap[type] ?? [];
  return TEST_ACCOUNTS.find((acc) =>
    acc.roles.some((role) => roles.includes(role))
  );
}

function renderDashboardLayout(): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <DashboardLayout title="Test Dashboard">
            <div>Dashboard Content</div>
          </DashboardLayout>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Role-based Navigation', () => {
  describe.each(ROLE_NAV_TEST_CASES)(
    '$accountType role navigation',
    ({ accountType, expectedNavItems, unexpectedNavItems }) => {
      beforeEach(async () => {
        const account = getTestAccountByType(accountType);
        if (account) {
          await login({ email: account.email, password: TEST_PASSWORD });
        }
      });

      it(`displays correct nav items for ${accountType}`, async () => {
        renderDashboardLayout();

        await waitFor(() => {
          expectedNavItems.forEach((item) => {
            expect(screen.getByRole('button', { name: item })).toBeInTheDocument();
          });
        });
      });

      it(`hides other role nav items for ${accountType}`, async () => {
        renderDashboardLayout();

        await waitFor(() => {
          expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
        });

        unexpectedNavItems.forEach((item) => {
          expect(screen.queryByRole('button', { name: item })).not.toBeInTheDocument();
        });
      });
    }
  );

  it('displays common nav items for all roles', async () => {
    const account = getTestAccountByType('rider');
    if (account) {
      await login({ email: account.email, password: TEST_PASSWORD });
    }

    renderDashboardLayout();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });
  });
});
