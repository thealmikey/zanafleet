import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';
import { handlers, resetMockSessions } from '../../mocks/handlers';
import { AuthProvider } from '../../contexts/AuthContext';
import { ProfilePage } from '../../pages/Profile';
import { TEST_ACCOUNTS, TEST_PASSWORD } from '@zanafleet/contracts';
import { updateSettings } from '../../services/settingsApi';

const server = setupServer(...handlers);

const theme = createTheme();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetMockSessions();
});
afterAll(() => server.close());

function renderProfilePage(): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/profile']}>
          <ProfilePage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

async function loginAsTestUser(): Promise<void> {
  const testAccount = TEST_ACCOUNTS[0];
  const { login } = await import('../../services/authApi');
  await login({ email: testAccount.email, password: TEST_PASSWORD });
}

describe('ProfilePage', () => {
  beforeEach(async () => {
    await loginAsTestUser();
  });

  it('loads and displays profile data', async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('allows editing name and email fields', async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    await user.clear(emailInput);
    await user.type(emailInput, 'updated@example.com');

    expect(nameInput).toHaveValue('Updated Name');
    expect(emailInput).toHaveValue('updated@example.com');
  });

  it('saves profile changes and shows success message', async () => {
    const user = userEvent.setup();
    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Profile Name');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });
  });

  it('displays user roles', async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/roles/i)).toBeInTheDocument();
  });

  it('displays user ID', async () => {
    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/user id/i)).toBeInTheDocument();
  });

  it('renders avatar image when profileImage.url is set in settings', async () => {
    await updateSettings({ profileImage: { url: 'https://cdn.test/avatar.png' } });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const images = screen.getAllByRole('img');
    const avatarImage = images.find((img) => img.getAttribute('src') === 'https://cdn.test/avatar.png');
    expect(avatarImage).toBeInTheDocument();
  });
});
