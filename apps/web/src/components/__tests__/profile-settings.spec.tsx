import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { setupServer } from 'msw/node';
import { handlers, resetMockSessions } from '../../mocks/handlers';
import { AuthProvider } from '../../contexts/AuthContext';
import { ProfilePage } from '../../pages/Profile';
import { SettingsPage } from '../../pages/Settings';
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

function renderWithRouter(initialPath: string): ReturnType<typeof render> {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

async function loginAsTestUser(accountType = 'rider'): Promise<void> {
  const typeMap: Record<string, string[]> = {
    admin: ['Admin', 'SiteOwner'],
    support: ['Support'],
    operator: ['SaccoAdmin', 'Operator'],
    business: ['BusinessOwner', 'Business'],
    rider: ['Rider', 'Driver'],
  };
  const roles = typeMap[accountType] ?? ['Rider'];
  const account = TEST_ACCOUNTS.find((acc) =>
    acc.roles.some((role) => roles.includes(role))
  );
  if (account) {
    await login({ email: account.email, password: TEST_PASSWORD });
  }
}

describe('Profile Page', () => {
  beforeEach(async () => {
    await loginAsTestUser('rider');
  });

  it('loads and displays profile data after login', async () => {
    renderWithRouter('/profile');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('allows editing name field and saves changes', async () => {
    const user = userEvent.setup();
    renderWithRouter('/profile');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Test Name');

    expect(nameInput).toHaveValue('Updated Test Name');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument();
    });
  });

  it('allows editing email field', async () => {
    const user = userEvent.setup();
    renderWithRouter('/profile');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'newemail@example.com');

    expect(emailInput).toHaveValue('newemail@example.com');
  });

  it('displays user roles section', async () => {
    renderWithRouter('/profile');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/roles/i)).toBeInTheDocument();
  });
});

describe('Settings Page', () => {
  beforeEach(async () => {
    await loginAsTestUser('rider');
  });

  it('loads and displays settings after login', async () => {
    renderWithRouter('/settings');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/availability/i)).toBeInTheDocument();
    expect(screen.getByText(/working hours/i)).toBeInTheDocument();
  });

  it('toggles availability switch and saves', async () => {
    const user = userEvent.setup();
    renderWithRouter('/settings');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const availabilitySwitch = screen.getByRole('checkbox', { name: /toggle availability/i });
    const initialChecked = availabilitySwitch.getAttribute('checked') !== null;

    await user.click(availabilitySwitch);

    if (initialChecked) {
      expect(availabilitySwitch).not.toBeChecked();
    } else {
      expect(availabilitySwitch).toBeChecked();
    }

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/settings saved successfully/i)).toBeInTheDocument();
    });
  });

  it('displays working hours fields', async () => {
    renderWithRouter('/settings');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it('displays vehicle info for rider role', async () => {
    renderWithRouter('/settings');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/vehicle information/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vehicle type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/license plate/i)).toBeInTheDocument();
  });
});

describe('Settings Page - Business Role', () => {
  beforeEach(async () => {
    await loginAsTestUser('business');
  });

  it('displays business locations for business role', async () => {
    renderWithRouter('/settings');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/business locations/i)).toBeInTheDocument();
  });

  it('allows adding a new location', async () => {
    const user = userEvent.setup();
    renderWithRouter('/settings');

    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    const addButton = screen.getByRole('button', { name: /add location/i });
    await user.click(addButton);

    const locationInputs = screen.getAllByLabelText(/location \d+/i);
    expect(locationInputs.length).toBeGreaterThan(1);
  });
});
