import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';

import { handlers } from '../../../mocks/handlers';
import { AuthProvider } from '../../../contexts/AuthContext';
import { OperatorDashboard } from '../index';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const theme = createTheme();

interface RenderOptions {
  initialPath?: string;
}

function renderOperatorDashboard({ initialPath = '/dashboard/operator' }: RenderOptions = {}): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/dashboard/operator/*" element={<OperatorDashboard />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('OperatorDashboard', () => {
  describe('Metrics Tab', () => {
    it('renders the metrics tab by default', async () => {
      renderOperatorDashboard();

      expect(screen.getByRole('heading', { name: 'Operator Dashboard' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Operations Overview')).toBeInTheDocument();
      });
    });

    it('displays KPI metrics from the API', async () => {
      renderOperatorDashboard();

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Active Deliveries' })).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: 'Pending Assignments' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Available Riders' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Avg Assignment Time' })).toBeInTheDocument();
    });

    it('shows quick actions section', async () => {
      renderOperatorDashboard();

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument();
      });

      expect(screen.getByText('View Assignment Queue')).toBeInTheDocument();
      expect(screen.getByText('Find Nearby Riders')).toBeInTheDocument();
      expect(screen.getByText('Calculate Route')).toBeInTheDocument();
    });
  });

  describe('Queue Tab', () => {
    it('loads and displays assignment queue when tab is clicked', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Queue' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Assignment Queue' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('queue-item-del_queue_001')).toBeInTheDocument();
      });

      expect(screen.getByTestId('queue-item-del_queue_002')).toBeInTheDocument();
    });

    it('displays queue item details', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Queue' }));

      await waitFor(() => {
        expect(screen.getByText('123 Restaurant Ave, CBD')).toBeInTheDocument();
      });

      expect(screen.getByText('456 Apartment Complex, Kilimani')).toBeInTheDocument();
    });

    it('shows priority and status chips', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Queue' }));

      await waitFor(() => {
        expect(screen.getByText('Priority: 10')).toBeInTheDocument();
      });

      expect(screen.getByText('pending_assignment')).toBeInTheDocument();
    });

    it('shows pagination controls', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Queue' }));

      await waitFor(() => {
        expect(screen.getByTestId('queue-item-del_queue_001')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('First page')).toBeInTheDocument();
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
      expect(screen.getByLabelText('Next page')).toBeInTheDocument();
      expect(screen.getByLabelText('Last page')).toBeInTheDocument();
    });
  });

  describe('Candidates Tab', () => {
    it('loads and displays candidates when tab is clicked', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Candidate Discovery' })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('candidate-item-rider_cand_001')).toBeInTheDocument();
      });
    });

    it('displays candidate details', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByText('James Mwangi')).toBeInTheDocument();
      });

      expect(screen.getByText('Sarah Achieng')).toBeInTheDocument();
    });

    it('shows mode selector for area vs delivery search', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Search Mode')).toBeInTheDocument();
      });
    });

    it('shows radius and limit filter inputs', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByTestId('radius-input')).toBeInTheDocument();
      });

      expect(screen.getByTestId('limit-input')).toBeInTheDocument();
    });

    it('updates candidates when filters change and search is clicked', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByTestId('candidate-item-rider_cand_001')).toBeInTheDocument();
      });

      const limitInput = screen.getByTestId('limit-input').querySelector('input');
      expect(limitInput).toBeInTheDocument();
      
      if (limitInput) {
        await user.clear(limitInput);
        await user.type(limitInput, '2');
      }

      await user.click(screen.getByRole('button', { name: /search/i }));

      await waitFor(() => {
        const candidates = screen.getAllByTestId(/candidate-item-/);
        expect(candidates.length).toBeLessThanOrEqual(2);
      });
    });

    it('renders map with rider locations', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByText('Rider Locations')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Map showing nearby rider locations')).toBeInTheDocument();
      });
    });

    it('shows delivery ID input when mode is set to delivery', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByLabelText('Search Mode')).toBeInTheDocument();
      });

      const modeSelect = screen.getByLabelText('Search Mode');
      await user.click(modeSelect);
      
      const deliveryOption = await screen.findByRole('option', { name: 'By Delivery' });
      await user.click(deliveryOption);

      await waitFor(() => {
        expect(screen.getByLabelText('Delivery ID')).toBeInTheDocument();
      });
    });
  });

  describe('Route Tab', () => {
    it('renders route tab when clicked', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Route' }));

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Route Hint Calculator' })).toBeInTheDocument();
      });
    });

    it('shows origin and destination inputs', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Route' }));

      await waitFor(() => {
        expect(screen.getByText('Origin')).toBeInTheDocument();
      });

      expect(screen.getByText('Destination')).toBeInTheDocument();
    });

    it('calculates and displays route hint', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Route' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /calculate/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /calculate/i }));

      await waitFor(() => {
        expect(screen.getByTestId('route-summary')).toBeInTheDocument();
      });

      expect(screen.getByTestId('route-distance')).toBeInTheDocument();
      expect(screen.getByTestId('route-duration')).toBeInTheDocument();
    });

    it('renders route preview map', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Route' }));

      await waitFor(() => {
        expect(screen.getByText('Route Preview')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Map showing route origin and destination')).toBeInTheDocument();
    });

    it('shows polyline when route is calculated', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Route' }));

      await user.click(screen.getByRole('button', { name: /calculate/i }));

      await waitFor(() => {
        expect(screen.getByTestId('route-polyline')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('has all four tabs visible', () => {
      renderOperatorDashboard();

      expect(screen.getByRole('tab', { name: 'Metrics' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Queue' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Candidates' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Route' })).toBeInTheDocument();
    });

    it('navigates between tabs correctly', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Queue' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Assignment Queue' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Candidate Discovery' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Route' }));
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Route Hint Calculator' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: 'Metrics' }));
      await waitFor(() => {
        expect(screen.getByText('Operations Overview')).toBeInTheDocument();
      });
    });

    it('renders correct tab based on initial route', async () => {
      renderOperatorDashboard({ initialPath: '/dashboard/operator/queue' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Assignment Queue' })).toBeInTheDocument();
      });
    });

    it('renders candidates tab on candidates route', async () => {
      renderOperatorDashboard({ initialPath: '/dashboard/operator/candidates' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Candidate Discovery' })).toBeInTheDocument();
      });
    });

    it('renders route tab on route path', async () => {
      renderOperatorDashboard({ initialPath: '/dashboard/operator/route' });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Route Hint Calculator' })).toBeInTheDocument();
      });
    });
  });

  describe('GeoMap Integration', () => {
    it('renders map markers for candidates', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        const map = screen.getByLabelText('Map showing nearby rider locations');
        expect(map).toBeInTheDocument();
      });

      await waitFor(() => {
        const markers = screen.getAllByRole('button');
        expect(markers.length).toBeGreaterThan(0);
      });
    });

    it('displays coordinates list in map', async () => {
      const user = userEvent.setup();
      renderOperatorDashboard();

      await user.click(screen.getByRole('tab', { name: 'Candidates' }));

      await waitFor(() => {
        expect(screen.getByText('Coordinates')).toBeInTheDocument();
      });
    });
  });
});
