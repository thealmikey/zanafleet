import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';

import { handlers } from '../../../mocks/handlers';
import { AuthProvider } from '../../../contexts/AuthContext';
import { AdminDashboard } from '../index';

jest.mock('react-chartjs-2', () => ({
  Line: () => <canvas data-testid="mock-line-chart" />,
  Bar: () => <canvas data-testid="mock-bar-chart" />,
  Doughnut: () => <canvas data-testid="mock-doughnut-chart" />,
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const theme = createTheme();

interface RenderOptions {
  initialPath?: string;
}

function renderAdminDashboard({ initialPath = '/dashboard/admin' }: RenderOptions = {}): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/dashboard/admin/*" element={<AdminDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('AdminDashboard', () => {
  describe('Metrics Tab', () => {
    it('renders the metrics tab by default', async () => {
      renderAdminDashboard();

      expect(screen.getByRole('heading', { name: 'Admin Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('System Overview')).toBeInTheDocument();
      });
    });

    it('displays KPI metrics from the API', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Total Orders' })).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: 'Total Deliveries' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Total Revenue' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Active Riders' })).toBeInTheDocument();
    });

    it('renders charts', async () => {
      renderAdminDashboard();

      await waitFor(() => {
        expect(screen.getByText('Revenue Trend')).toBeInTheDocument();
      });

      expect(screen.getByText('Settlement Status')).toBeInTheDocument();
      expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('mock-doughnut-chart')).toBeInTheDocument();
    });
  });

  describe('Settlements Tab', () => {
    it('loads and displays settlements when tab is clicked', async () => {
      const user = userEvent.setup();
      renderAdminDashboard();

      await user.click(screen.getByRole('tab', { name: 'Settlements' }));

      await waitFor(() => {
        expect(screen.getByText('Settlement Batches')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('settlement-row-batch_001')).toBeInTheDocument();
      });

      expect(screen.getByTestId('settlement-row-batch_002')).toBeInTheDocument();
      expect(screen.getByTestId('settlement-row-batch_003')).toBeInTheDocument();
    });

    it('displays settlement table columns', async () => {
      const user = userEvent.setup();
      renderAdminDashboard();

      await user.click(screen.getByRole('tab', { name: 'Settlements' }));

      await waitFor(() => {
        expect(screen.getByRole('table', { name: 'Settlements table' })).toBeInTheDocument();
      });

      const table = screen.getByRole('table', { name: 'Settlements table' });
      expect(within(table).getByText('Batch ID')).toBeInTheDocument();
      expect(within(table).getByText('Status')).toBeInTheDocument();
      expect(within(table).getByText('Amount')).toBeInTheDocument();
      expect(within(table).getByText('Recipients')).toBeInTheDocument();
    });
  });

  describe('Policies Tab', () => {
    it('loads and displays policies when tab is clicked', async () => {
      const user = userEvent.setup();
      renderAdminDashboard();

      await user.click(screen.getByRole('tab', { name: 'Policies' }));

      await waitFor(() => {
        expect(screen.getByText('Platform Policies')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('policy-row-policy_001')).toBeInTheDocument();
      });

      expect(screen.getByTestId('policy-row-policy_002')).toBeInTheDocument();
      expect(screen.getByTestId('policy-row-policy_003')).toBeInTheDocument();
    });

    it('displays policy table columns', async () => {
      const user = userEvent.setup();
      renderAdminDashboard();

      await user.click(screen.getByRole('tab', { name: 'Policies' }));

      await waitFor(() => {
        expect(screen.getByRole('table', { name: 'Policies table' })).toBeInTheDocument();
      });

      const table = screen.getByRole('table', { name: 'Policies table' });
      expect(within(table).getByText('Policy ID')).toBeInTheDocument();
      expect(within(table).getByText('Name')).toBeInTheDocument();
      expect(within(table).getByText('Scope')).toBeInTheDocument();
      expect(within(table).getByText('Status')).toBeInTheDocument();
      expect(within(table).getByText('Trigger')).toBeInTheDocument();
      expect(within(table).getByText('Priority')).toBeInTheDocument();
    });

    it('displays policy names from fixture data', async () => {
      const user = userEvent.setup();
      renderAdminDashboard();

      await user.click(screen.getByRole('tab', { name: 'Policies' }));

      await waitFor(() => {
        expect(screen.getByText('Peak Hour Surge')).toBeInTheDocument();
      });

      expect(screen.getByText('New Rider Bonus')).toBeInTheDocument();
      expect(screen.getByText('Weekend Discount')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('navigates between tabs correctly', async () => {
      const user = userEvent.setup();
      renderAdminDashboard();

      await user.click(screen.getByRole('tab', { name: 'Settlements' }));
      await waitFor(() => {
        expect(screen.getByText('Settlement Batches')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Policies' }));
      await waitFor(() => {
        expect(screen.getByText('Platform Policies')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Metrics' }));
      await waitFor(() => {
        expect(screen.getByText('System Overview')).toBeInTheDocument();
      });
    });

    it('renders correct tab based on initial route', async () => {
      renderAdminDashboard({ initialPath: '/dashboard/admin/settlements' });

      await waitFor(() => {
        expect(screen.getByText('Settlement Batches')).toBeInTheDocument();
      });
    });
  });
});
