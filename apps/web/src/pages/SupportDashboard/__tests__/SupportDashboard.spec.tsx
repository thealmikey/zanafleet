import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';

import { handlers } from '../../../mocks/handlers';
import { AuthProvider } from '../../../contexts/AuthContext';
import { SupportDashboard } from '../index';

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

function renderSupportDashboard({ initialPath = '/dashboard/support' }: RenderOptions = {}): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/dashboard/support/*" element={<SupportDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('SupportDashboard', () => {
  describe('Metrics Tab', () => {
    it('renders the metrics tab by default', async () => {
      renderSupportDashboard();

      expect(screen.getByRole('heading', { name: 'Support Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Support Overview')).toBeInTheDocument();
      });
    });

    it('displays KPI metrics from the API', async () => {
      renderSupportDashboard();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Open Disputes' })).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: 'Escalated' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Pending Refunds' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Resolved Today' })).toBeInTheDocument();
    });

    it('renders the workload chart', async () => {
      renderSupportDashboard();

      await waitFor(() => {
        expect(screen.getByText('Workload (Last 7 Days)')).toBeInTheDocument();
      });

      expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
    });
  });

  describe('Disputes Tab', () => {
    it('loads and displays disputes when tab is clicked', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Disputes' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Disputes' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('dispute-item-dispute_001')).toBeInTheDocument();
      });

      expect(screen.getByTestId('dispute-item-dispute_002')).toBeInTheDocument();
    });

    it('displays dispute reasons from fixture data', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Disputes' }));

      await waitFor(() => {
        expect(screen.getByText('Item not delivered')).toBeInTheDocument();
      });

      expect(screen.getByText('Damaged goods')).toBeInTheDocument();
    });

    it('shows dispute status chips', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Disputes' }));

      await waitFor(() => {
        expect(screen.getByText('open')).toBeInTheDocument();
      });

      expect(screen.getAllByText('escalated').length).toBeGreaterThan(0);
    });
  });

  describe('Refunds Tab', () => {
    it('loads and displays refunds when tab is clicked', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Refunds' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Refunds' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('refund-item-refund_001')).toBeInTheDocument();
      });

      expect(screen.getByTestId('refund-item-refund_002')).toBeInTheDocument();
    });

    it('displays refund reasons from fixture data', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Refunds' }));

      await waitFor(() => {
        expect(screen.getByText('Order cancelled by customer')).toBeInTheDocument();
      });

      expect(screen.getByText('Duplicate charge')).toBeInTheDocument();
    });
  });

  describe('Recent Payments Tab', () => {
    it('loads and displays recent payments when tab is clicked', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Recent Payments' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Recent Payments' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('payment-item-pi_001')).toBeInTheDocument();
      });

      expect(screen.getByTestId('payment-item-pi_002')).toBeInTheDocument();
    });

    it('displays payment status chips', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Recent Payments' }));

      await waitFor(() => {
        expect(screen.getAllByText('succeeded').length).toBeGreaterThan(0);
      });

      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('has all four tabs visible', () => {
      renderSupportDashboard();

      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Disputes' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Refunds' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Recent Payments' })).toBeInTheDocument();
    });

    it('navigates between tabs correctly', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Disputes' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Disputes' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Refunds' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Refunds' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Recent Payments' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Recent Payments' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Metrics' }));
      await waitFor(() => {
        expect(screen.getByText('Support Overview')).toBeInTheDocument();
      });
    });

    it('renders correct tab based on initial route', async () => {
      renderSupportDashboard({ initialPath: '/dashboard/support/disputes' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Disputes' })).toBeInTheDocument();
      });
    });

    it('renders refunds tab on refunds route', async () => {
      renderSupportDashboard({ initialPath: '/dashboard/support/refunds' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Refunds' })).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls on disputes tab', async () => {
      const user = userEvent.setup();
      renderSupportDashboard();

      await user.click(screen.getByRole('tab', { name: 'Disputes' }));

      await waitFor(() => {
        expect(screen.getByTestId('dispute-item-dispute_001')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('First page')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Last page')).toBeInTheDocument();
    });
  });
});
