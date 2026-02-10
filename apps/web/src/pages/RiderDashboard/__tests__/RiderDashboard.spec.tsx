import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';

import { handlers } from '../../../mocks/handlers';
import { AuthProvider } from '../../../contexts/AuthContext';
import { RiderDashboard } from '../index';

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

function renderRiderDashboard({ initialPath = '/dashboard/rider' }: RenderOptions = {}): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/dashboard/rider/*" element={<RiderDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('RiderDashboard', () => {
  describe('Active Tab', () => {
    it('renders the active tab by default', async () => {
      renderRiderDashboard();

      expect(screen.getByRole('heading', { name: 'Rider Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Active Deliveries' })).toBeInTheDocument();
      });
    });

    it('loads and displays active deliveries', async () => {
      renderRiderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId(/active-delivery-del_/)).toBeInTheDocument();
      });
    });

    it('displays delivery addresses', async () => {
      renderRiderDashboard();

      await waitFor(() => {
        expect(screen.getByText('123 Business Center, Nairobi')).toBeInTheDocument();
      });
    });

    it('shows estimated earnings on delivery cards', async () => {
      renderRiderDashboard();

      await waitFor(() => {
        expect(screen.getByText('KES 350')).toBeInTheDocument();
      });
    });
  });

  describe('History Tab', () => {
    it('loads and displays delivery history when tab is clicked', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'History' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Delivery History' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId(/history-delivery-del_/)).toBeInTheDocument();
      });
    });

    it('shows completed delivery statuses', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'History' }));

      await waitFor(() => {
        expect(screen.getByText('delivered')).toBeInTheDocument();
      });
    });
  });

  describe('Earnings Tab', () => {
    it('loads and displays earnings when tab is clicked', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'Earnings' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Earnings Summary' })).toBeInTheDocument();
      });
    });

    it('displays earnings KPIs', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'Earnings' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Total Earnings' })).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: 'Pending Payout' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Completed Deliveries' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Avg Per Delivery' })).toBeInTheDocument();
    });

    it('renders the earnings trend chart', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'Earnings' }));

      await waitFor(() => {
        expect(screen.getByText('Earnings Trend')).toBeInTheDocument();
      });

      expect(screen.getByTestId('mock-line-chart')).toBeInTheDocument();
    });

    it('shows settlement info section', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'Earnings' }));

      await waitFor(() => {
        expect(screen.getByText('Settlement Info')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText(/Settlements are processed weekly/)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('has all three tabs visible', () => {
      renderRiderDashboard();

      expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'History' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Earnings' })).toBeInTheDocument();
    });

    it('navigates between tabs correctly', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'History' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Delivery History' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Earnings' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Earnings Summary' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Active' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Active Deliveries' })).toBeInTheDocument();
      });
    });

    it('renders correct tab based on initial route', async () => {
      renderRiderDashboard({ initialPath: '/dashboard/rider/history' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Delivery History' })).toBeInTheDocument();
      });
    });

    it('renders earnings tab on earnings route', async () => {
      renderRiderDashboard({ initialPath: '/dashboard/rider/earnings' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Earnings Summary' })).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('shows pagination controls on active tab', async () => {
      renderRiderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId(/active-delivery-del_/)).toBeInTheDocument();
      });

      expect(screen.getByLabelText('First page')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Last page')).toBeInTheDocument();
    });

    it('shows pagination controls on history tab', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'History' }));

      await waitFor(() => {
        expect(screen.getByTestId(/history-delivery-del_/)).toBeInTheDocument();
      });

      expect(screen.getByLabelText('First page')).toBeInTheDocument();
      expect(screen.getByLabelText('Last page')).toBeInTheDocument();
    });
  });

  describe('DeliveryCard usage', () => {
    it('uses DeliveryCard component for active deliveries', async () => {
      renderRiderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Pickup')).toBeInTheDocument();
      });

      expect(screen.getByText('Dropoff')).toBeInTheDocument();
    });

    it('uses DeliveryCard component for history deliveries', async () => {
      const user = userEvent.setup();
      renderRiderDashboard();

      await user.click(screen.getByRole('tab', { name: 'History' }));

      await waitFor(() => {
        expect(screen.getByText('Pickup')).toBeInTheDocument();
      });

      expect(screen.getByText('Dropoff')).toBeInTheDocument();
    });
  });
});
