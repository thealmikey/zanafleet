import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { TEST_ACCOUNTS } from '@zanafleet/contracts';

import { AuthProvider } from '../../../contexts/AuthContext';
import { DevAccountSwitcher } from '../DevAccountSwitcher';
import { server } from '../../../mocks/server';

describe('DevAccountSwitcher (MSW-backed)', () => {
  function renderWithProvider(): ReturnType<typeof render> {
    return render(
      <AuthProvider>
        <DevAccountSwitcher />
      </AuthProvider>
    );
  }

  it('logs in with a test account, shows loading, and updates current user/roles, highlights the chosen account, and persists token', async () => {
    const admin = TEST_ACCOUNTS.find(a => a.type === 'Admin');
    expect(admin).toBeDefined();

    const user = userEvent.setup();
    renderWithProvider();

    // Open the switcher
    const toggle = screen.getByTitle('Dev Account Switcher (dev mode only)');
    await user.click(toggle);

    // Select the Admin account
    const adminBtn = await screen.findByRole('button', { name: new RegExp(admin!.username, 'i') });
    await user.click(adminBtn);

    // Loading UI appears transiently
    expect(await screen.findByText(/Logging in\.\.\./i)).toBeInTheDocument();

    // Wait for token persistence
    await waitFor(() => {
      expect(window.localStorage.getItem('zanafleet_auth_token')).not.toBeNull();
    });

    // Re-open to inspect current user and highlight
    await user.click(toggle);

    // Current User section shows expected name
    const currentUserHeader = await screen.findByText(/Current User/i);
    const currentUserSection = currentUserHeader.closest('div');
    expect(currentUserSection).not.toBeNull();
    expect(within(currentUserSection as HTMLElement).getByText(new RegExp(admin!.username, 'i'))).toBeInTheDocument();

    // Roles badges include at least one expected role
    const expectedRole = admin!.roles[0];
    expect(within(currentUserSection as HTMLElement).getByText(new RegExp(expectedRole, 'i'))).toBeInTheDocument();

    // The chosen account is highlighted/checked
    const adminBtnAfter = screen.getByRole('button', { name: new RegExp(`\\b${admin!.username}\\b`, 'i') });
    expect(within(adminBtnAfter).getByText('✓')).toBeInTheDocument();
  });

  it('shows an error banner on 401 and allows dismissing it', async () => {
    // Force login to return 401
    server.use(
      http.post('/api/auth/login', async () => {
        return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
      })
    );

    const admin = TEST_ACCOUNTS.find(a => a.type === 'Admin');
    expect(admin).toBeDefined();

    const user = userEvent.setup();
    renderWithProvider();

    // Open the switcher
    const toggle = screen.getByTitle('Dev Account Switcher (dev mode only)');
    await user.click(toggle);

    // Attempt login (will 401)
    const adminBtn = await screen.findByRole('button', { name: new RegExp(admin!.username, 'i') });
    await user.click(adminBtn);

    // Error banner shows
    const errorBanner = await screen.findByText(/Login failed/i);
    expect(errorBanner).toBeInTheDocument();

    // Token should not be persisted
    expect(window.localStorage.getItem('zanafleet_auth_token')).toBeNull();

    // Dismiss the error
    const dismissBtn = screen.getByRole('button', { name: /Dismiss error/i });
    await user.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Login failed/i)).not.toBeInTheDocument();
    });
  });
});
