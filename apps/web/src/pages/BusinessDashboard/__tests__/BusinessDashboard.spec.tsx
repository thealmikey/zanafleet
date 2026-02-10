import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';

import { handlers } from '../../../mocks/handlers';
import { AuthProvider } from '../../../contexts/AuthContext';
import { BusinessDashboard } from '../index';

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

function renderBusinessDashboard({ initialPath = '/dashboard/business' }: RenderOptions = {}): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/dashboard/business/*" element={<BusinessDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('BusinessDashboard', () => {
  describe('Metrics Tab', () => {
    it('renders the metrics tab by default', async () => {
      renderBusinessDashboard();

      expect(screen.getByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Business Overview')).toBeInTheDocument();
      });
    });

    it('displays KPI metrics from the API', async () => {
      renderBusinessDashboard();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Total Orders' })).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: 'Total Deliveries' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Total Spent' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Avg Delivery Time' })).toBeInTheDocument();
    });

    it('renders the delivery volume chart', async () => {
      renderBusinessDashboard();

      await waitFor(() => {
        expect(screen.getByText('Delivery Volume (Last 7 Days)')).toBeInTheDocument();
      });

      expect(screen.getByTestId('mock-bar-chart')).toBeInTheDocument();
    });
  });

  describe('Orders Tab', () => {
    it('loads and displays orders when tab is clicked', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Orders' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId(/order-item-order_/)).toBeInTheDocument();
      });
    });

    it('shows order status chips', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Orders' }));

      await waitFor(() => {
        expect(screen.getByText('pending')).toBeInTheDocument();
      });
    });
  });

  describe('Deliveries Tab', () => {
    it('loads and displays deliveries when tab is clicked', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Deliveries' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Deliveries' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId(/delivery-item-del_/)).toBeInTheDocument();
      });
    });

    it('displays delivery addresses', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Deliveries' }));

      await waitFor(() => {
        expect(screen.getByText('123 Warehouse Ave, Nairobi')).toBeInTheDocument();
      });
    });
  });

  describe('Invoices Tab', () => {
    it('loads and displays invoices when tab is clicked', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Invoices' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId(/invoice-item-inv_/)).toBeInTheDocument();
      });
    });

    it('shows invoice status chips', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Invoices' }));

      await waitFor(() => {
        expect(screen.getByText('paid')).toBeInTheDocument();
      });

      expect(screen.getByText('pending')).toBeInTheDocument();
      expect(screen.getByText('overdue')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('has all four tabs visible', () => {
      renderBusinessDashboard();

      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Orders' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Deliveries' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Invoices' })).toBeInTheDocument();
    });

    it('navigates between tabs correctly', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Orders' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Deliveries' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Deliveries' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Invoices' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Metrics' }));
      await waitFor(() => {
        expect(screen.getByText('Business Overview')).toBeInTheDocument();
      });
    });

    it('renders correct tab based on initial route', async () => {
      renderBusinessDashboard({ initialPath: '/dashboard/business/orders' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
      });
    });

    it('renders deliveries tab on deliveries route', async () => {
      renderBusinessDashboard({ initialPath: '/dashboard/business/deliveries' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Deliveries' })).toBeInTheDocument();
      });
    });

    it('renders invoices tab on invoices route', async () => {
      renderBusinessDashboard({ initialPath: '/dashboard/business/invoices' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls on orders tab', async () => {
      const user = userEvent.setup();
      renderBusinessDashboard();

      await user.click(screen.getByRole('tab', { name: 'Orders' }));

      await waitFor(() => {
        expect(screen.getByTestId(/order-item-order_/)).toBeInTheDocument();
      });

      expect(screen.getByLabelText('First page')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Last page')).toBeInTheDocument();
    });
  });
});
