import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';
import { handlers, resetMockSessions, resetMockNotifications } from '../../mocks/handlers';
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
  resetMockNotifications();
});
afterAll(() => server.close());

function renderDashboardWithNotifications(): ReturnType<typeof render> {
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

describe('Notifications', () => {
  beforeEach(async () => {
    const account = TEST_ACCOUNTS[0];
    await login({ email: account.email, password: TEST_PASSWORD });
  });

  it('displays notification badge with unread count', async () => {
    renderDashboardWithNotifications();

    await waitFor(() => {
      const notificationButton = screen.getByRole('button', { name: /open notifications/i });
      expect(notificationButton).toBeInTheDocument();

      const badge = within(notificationButton).getByText(/\d+/);
      expect(badge).toBeInTheDocument();
    });
  });

  it('opens notification popover when clicking the bell icon', async () => {
    const user = userEvent.setup();
    renderDashboardWithNotifications();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open notifications/i })).toBeInTheDocument();
    });

    const notificationButton = screen.getByRole('button', { name: /open notifications/i });
    await user.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('displays notification items in the list', async () => {
    const user = userEvent.setup();
    renderDashboardWithNotifications();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open notifications/i })).toBeInTheDocument();
    });

    const notificationButton = screen.getByRole('button', { name: /open notifications/i });
    await user.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('Welcome to ZanaFleet')).toBeInTheDocument();
      expect(screen.getByText('New delivery assigned')).toBeInTheDocument();
    });
  });

  it('marks notification as read when clicked', async () => {
    const user = userEvent.setup();
    renderDashboardWithNotifications();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open notifications/i })).toBeInTheDocument();
    });

    const notificationButton = screen.getByRole('button', { name: /open notifications/i });
    await user.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('New delivery assigned')).toBeInTheDocument();
    });

    const unreadNotification = screen.getByRole('button', {
      name: /notification: new delivery assigned/i,
    });

    const listItem = unreadNotification.closest('li');
    expect(listItem).toHaveStyle({ backgroundColor: expect.stringContaining('') });

    await user.click(unreadNotification);

    await waitFor(() => {
      const updatedListItem = screen
        .getByRole('button', { name: /notification: new delivery assigned/i })
        .closest('li');
      expect(updatedListItem).toBeInTheDocument();
    });
  });

  it('shows empty state when no notifications exist', async () => {
    const { http, HttpResponse } = await import('msw');
    server.use(
      http.get('/api/notifications', () => {
        return HttpResponse.json({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      })
    );

    const user = userEvent.setup();
    renderDashboardWithNotifications();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open notifications/i })).toBeInTheDocument();
    });

    const notificationButton = screen.getByRole('button', { name: /open notifications/i });
    await user.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });
  });

  it('updates badge count after marking notification as read', async () => {
    const user = userEvent.setup();
    renderDashboardWithNotifications();

    await waitFor(() => {
      const notificationButton = screen.getByRole('button', { name: /open notifications/i });
      const badge = within(notificationButton).getByText(/4/);
      expect(badge).toBeInTheDocument();
    });

    const notificationButton = screen.getByRole('button', { name: /open notifications/i });
    await user.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('New delivery assigned')).toBeInTheDocument();
    });

    const unreadNotification = screen.getByRole('button', {
      name: /notification: new delivery assigned/i,
    });
    await user.click(unreadNotification);

    await waitFor(() => {
      const updatedButton = screen.getByRole('button', { name: /open notifications/i });
      const updatedBadge = within(updatedButton).getByText(/3/);
      expect(updatedBadge).toBeInTheDocument();
    });
  });
});
