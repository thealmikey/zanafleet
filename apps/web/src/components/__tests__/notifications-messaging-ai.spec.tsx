import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';
import { handlers, resetMockSessions, resetMockNotifications, resetMockMessages } from '../../mocks/handlers';
import { AuthProvider } from '../../contexts/AuthContext';
import { DashboardLayout } from '../Layout/DashboardLayout';
import { MessagingPage } from '../../pages/Messaging';
import { AIAssistantPage } from '../../pages/AIAssistant';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@zanafleet/contracts';
import { login } from '../../services/authApi';

const server = setupServer(...handlers);

const theme = createTheme();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockSessions();
  resetMockNotifications();
  resetMockMessages();
});
afterAll(() => server.close());

async function loginAsTestUser(): Promise<void> {
  const account = TEST_ACCOUNTS[0];
  await login({ email: account.email, password: TEST_PASSWORD });
}

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

function renderMessagingPage(): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/messages']}>
          <Routes>
            <Route path="/messages" element={<MessagingPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

function renderAIAssistantPage(): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/ai']}>
          <Routes>
            <Route path="/ai" element={<AIAssistantPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Notifications', () => {
  beforeEach(async () => {
    await loginAsTestUser();
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

  it('opens notification popover and displays items', async () => {
    const user = userEvent.setup();
    renderDashboardWithNotifications();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /open notifications/i })).toBeInTheDocument();
    });

    const notificationButton = screen.getByRole('button', { name: /open notifications/i });
    await user.click(notificationButton);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Welcome to ZanaFleet')).toBeInTheDocument();
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
    await user.click(unreadNotification);

    await waitFor(() => {
      const updatedButton = screen.getByRole('button', { name: /open notifications/i });
      const updatedBadge = within(updatedButton).getByText(/3/);
      expect(updatedBadge).toBeInTheDocument();
    });
  });
});

describe('Messaging Page', () => {
  beforeEach(async () => {
    await loginAsTestUser();
  });

  it('displays message inbox with threads', async () => {
    renderMessagingPage();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Welcome to ZanaFleet!')).toBeInTheDocument();
      expect(screen.getByText('Delivery Assignment Update')).toBeInTheDocument();
    });
  });

  it('loads and displays a message thread when clicked', async () => {
    const user = userEvent.setup();
    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getByText('Welcome to ZanaFleet!')).toBeInTheDocument();
    });

    const threadItem = screen.getByText('Welcome to ZanaFleet!');
    await user.click(threadItem);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to inbox/i })).toBeInTheDocument();
      expect(screen.getByText(/welcome to zanafleet! we are excited/i)).toBeInTheDocument();
    });
  });

  it('allows sending a reply in a thread', async () => {
    const user = userEvent.setup();
    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getByText('Welcome to ZanaFleet!')).toBeInTheDocument();
    });

    const threadItem = screen.getByText('Welcome to ZanaFleet!');
    await user.click(threadItem);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your reply/i)).toBeInTheDocument();
    });

    const replyInput = screen.getByPlaceholderText(/type your reply/i);
    await user.type(replyInput, 'This is a test reply message');

    const sendButton = screen.getByRole('button', { name: /send reply/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('This is a test reply message')).toBeInTheDocument();
    });
  });

  it('navigates back to inbox from thread view', async () => {
    const user = userEvent.setup();
    renderMessagingPage();

    await waitFor(() => {
      expect(screen.getByText('Welcome to ZanaFleet!')).toBeInTheDocument();
    });

    const threadItem = screen.getByText('Welcome to ZanaFleet!');
    await user.click(threadItem);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to inbox/i })).toBeInTheDocument();
    });

    const backButton = screen.getByRole('button', { name: /back to inbox/i });
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByText('Delivery Assignment Update')).toBeInTheDocument();
    });
  });
});

describe('AI Assistant Page', () => {
  beforeEach(async () => {
    await loginAsTestUser();
  });

  it('displays empty state with welcome message', async () => {
    renderAIAssistantPage();

    await waitFor(() => {
      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
      expect(screen.getByText(/ask me anything about zanafleet/i)).toBeInTheDocument();
    });
  });

  it('submits a prompt and displays response', async () => {
    const user = userEvent.setup();
    renderAIAssistantPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    await user.type(input, 'How do I track my deliveries?');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('How do I track my deliveries?')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/this is a mock ai response/i)).toBeInTheDocument();
    });
  });

  it('shows loading indicator while waiting for response', async () => {
    const user = userEvent.setup();
    renderAIAssistantPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    await user.type(input, 'Test prompt');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/this is a mock ai response/i)).toBeInTheDocument();
    });
  });

  it('disables send button when input is empty', async () => {
    renderAIAssistantPage();

    await waitFor(() => {
      const sendButton = screen.getByRole('button', { name: /send message/i });
      expect(sendButton).toBeDisabled();
    });
  });

  it('clears input after sending message', async () => {
    const user = userEvent.setup();
    renderAIAssistantPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type your message/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type your message/i);
    await user.type(input, 'Test message');

    const sendButton = screen.getByRole('button', { name: /send message/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });
});
