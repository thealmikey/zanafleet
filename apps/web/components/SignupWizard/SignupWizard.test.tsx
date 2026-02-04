import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SignupWizard } from './SignupWizard';
import { SignupWizardProvider } from '../../contexts/SignupWizardContext';
import {
  seedMockSession,
  getMockSession,
} from '../../test/mocks/handlers';
import {
  ActorType,
  SignUpSessionStatus,
  SignupSession,
} from '../../types';

// Test wrapper with provider
function renderWithProvider(
  ui: React.ReactElement,
): ReturnType<typeof render> & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();
  const result = render(<SignupWizardProvider>{ui}</SignupWizardProvider>);
  return { ...result, user };
}

// Helper to create a valid mock session
function createTestSession(overrides: Partial<SignupSession> = {}): SignupSession {
  const now = new Date();
  return {
    sessionId: 'test-session-123',
    status: SignUpSessionStatus.PARTIAL,
    actorType: ActorType.Rider,
    workspaceIds: [],
    roles: [],
    linkedWallets: [],
    completedSteps: ['account-type'],
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    ...overrides,
  };
}

const VALID_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

describe('SignupWizard Integration Tests', () => {
  describe('1. Full Happy Path', () => {
    it('completes signup flow from account type selection to finalization', async () => {
      const onComplete = jest.fn();
      const { user } = renderWithProvider(<SignupWizard onComplete={onComplete} />);

      // Step 1: Account Type Selection
      expect(screen.getByText('Select Account Type')).toBeInTheDocument();

      // Select Rider account type
      const riderOption = screen.getByLabelText('Rider');
      await user.click(riderOption);

      // Wait for session to be initiated
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Click Next to proceed to Roles step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Step 2: Roles Assignment
      await waitFor(() => {
        expect(screen.getByText('Assign Roles')).toBeInTheDocument();
      });

      // Add a role (optional step, just proceed)
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 3: Wallets
      await waitFor(() => {
        expect(screen.getByText('Link Wallets')).toBeInTheDocument();
      });

      // Skip wallets (optional step)
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Step 4: Review
      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });

      // Verify summary shows our selections
      expect(screen.getByText('Rider')).toBeInTheDocument();

      // Click Finalize
      const finalizeButton = screen.getByRole('button', { name: /finalize account/i });
      expect(finalizeButton).toBeEnabled();
      await user.click(finalizeButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText('Account created successfully!')).toBeInTheDocument();
      });

      // Verify onComplete callback was called
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: expect.any(String),
          workspaceId: expect.any(String),
        }),
      );
    });

    it('allows adding optional roles and wallets during signup', async () => {
      const { user } = renderWithProvider(<SignupWizard />);

      // Complete account type step
      await user.click(screen.getByLabelText('Business Owner'));
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Add roles
      await waitFor(() => {
        expect(screen.getByText('Assign Roles')).toBeInTheDocument();
      });
      const rolesInput = screen.getByRole('combobox');
      await user.click(rolesInput);
      await user.click(screen.getByText('Admin'));
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Add wallet
      await waitFor(() => {
        expect(screen.getByText('Link Wallets')).toBeInTheDocument();
      });
      const walletInput = screen.getByRole('textbox', { name: /new wallet address/i });
      await user.type(walletInput, VALID_WALLET_ADDRESS);
      await user.click(screen.getByRole('button', { name: /add/i }));

      // Verify wallet was added
      expect(screen.getByText(/1 wallet/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /next/i }));

      // Verify review shows all data
      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });
      expect(screen.getByText('Admin')).toBeInTheDocument();
      expect(screen.getByText('1 wallet(s)')).toBeInTheDocument();
    });
  });

  describe('2. Session Recovery from localStorage', () => {
    it('recovers an existing session on mount', async () => {
      // Seed a session in the mock backend
      const existingSession = createTestSession({
        sessionId: 'recovered-session-456',
        actorType: ActorType.SaccoAdmin,
        roles: ['Manager'],
        completedSteps: ['account-type', 'roles'],
      });
      seedMockSession(existingSession);

      // Set session ID in localStorage
      localStorage.setItem('zanafleet_signup_session_id', existingSession.sessionId);

      renderWithProvider(<SignupWizard />);

      // Wait for session to be loaded
      await waitFor(() => {
        // Should be on step 3 (index 2) since 2 steps were completed
        expect(screen.getByText('Link Wallets')).toBeInTheDocument();
      });

      // Navigate to review to verify data was restored
      await userEvent.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });

      // Verify restored data is displayed
      expect(screen.getByText('SaccoAdmin')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
    });

    it('clears localStorage and starts fresh when session not found', async () => {
      // Set an invalid session ID
      localStorage.setItem('zanafleet_signup_session_id', 'non-existent-session');

      renderWithProvider(<SignupWizard />);

      // Should start at first step after recovery failure
      await waitFor(() => {
        expect(screen.getByText('Select Account Type')).toBeInTheDocument();
      });

      // localStorage should be cleared
      expect(localStorage.getItem('zanafleet_signup_session_id')).toBeNull();
    });

    it('restores linked wallets from recovered session', async () => {
      const existingSession = createTestSession({
        sessionId: 'wallet-session-789',
        linkedWallets: [VALID_WALLET_ADDRESS, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'],
        completedSteps: ['account-type', 'roles', 'wallets'],
      });
      seedMockSession(existingSession);
      localStorage.setItem('zanafleet_signup_session_id', existingSession.sessionId);

      renderWithProvider(<SignupWizard />);

      // Should land on review step (index 3)
      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });

      // Verify wallets are shown
      expect(screen.getByText('2 wallet(s)')).toBeInTheDocument();
    });
  });

  describe('3. Partial Progress Saving via PATCH Endpoint', () => {
    it('updates session with roles via state management', async () => {
      const { user } = renderWithProvider(<SignupWizard />);

      // Complete initial steps
      await user.click(screen.getByLabelText('Rider'));
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Add multiple roles
      await waitFor(() => {
        expect(screen.getByText('Assign Roles')).toBeInTheDocument();
      });

      const rolesInput = screen.getByRole('combobox');
      await user.click(rolesInput);
      await user.click(screen.getByText('Driver'));
      await user.click(rolesInput);
      await user.click(screen.getByText('Dispatcher'));

      // Verify roles are shown
      expect(screen.getByText('Driver')).toBeInTheDocument();
      expect(screen.getByText('Dispatcher')).toBeInTheDocument();

      // Navigate to review
      await user.click(screen.getByRole('button', { name: /next/i }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });

      // Verify roles in summary
      expect(screen.getByText(/Driver, Dispatcher/)).toBeInTheDocument();
    });

    it('persists session ID to localStorage on initiation', async () => {
      const { user } = renderWithProvider(<SignupWizard />);

      expect(localStorage.getItem('zanafleet_signup_session_id')).toBeNull();

      await user.click(screen.getByLabelText('AIService'));

      await waitFor(() => {
        expect(localStorage.getItem('zanafleet_signup_session_id')).not.toBeNull();
      });
    });
  });

  describe('4. Validation Prevents Finalize Without Required Fields', () => {
    it('prevents proceeding from account type step without selection', async () => {
      renderWithProvider(<SignupWizard />);

      expect(screen.getByText('Select Account Type')).toBeInTheDocument();

      // Next button should be disabled without selection
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('enables finalize button when actor type is selected', async () => {
      const { user } = renderWithProvider(<SignupWizard />);

      // Select account type
      await user.click(screen.getByLabelText('Business'));
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Navigate through steps to review
      await user.click(screen.getByRole('button', { name: /next/i }));
      await user.click(screen.getByRole('button', { name: /next/i }));
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
      });

      // Finalize button should be enabled with valid actor type
      const finalizeButton = screen.getByRole('button', { name: /finalize account/i });
      expect(finalizeButton).toBeEnabled();
    });
  });

  describe('Navigation', () => {
    it('allows navigating back to previous steps', async () => {
      const { user } = renderWithProvider(<SignupWizard />);

      // Complete first step
      await user.click(screen.getByLabelText('Rider'));
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Workspace Configuration')).toBeInTheDocument();
      });

      // Go back
      await user.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByText('Select Account Type')).toBeInTheDocument();
      });

      // Selection should be preserved
      const riderRadio = screen.getByLabelText('Rider') as HTMLInputElement;
      expect(riderRadio.checked).toBe(true);
    });

    it('disables back button on first step', () => {
      renderWithProvider(<SignupWizard />);

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });

    it('preserves form data when navigating between steps', async () => {
      const { user } = renderWithProvider(<SignupWizard />);

      // Complete first two steps
      await user.click(screen.getByLabelText('Business'));
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /next/i }));

      await waitFor(() => {
        expect(screen.getByText('Workspace Configuration')).toBeInTheDocument();
      });

      await user.type(
        screen.getByRole('textbox', { name: /workspace id/i }),
        VALID_WORKSPACE_ID,
      );
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Go back to workspace step
      await waitFor(() => {
        expect(screen.getByText('Assign Roles')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /back/i }));

      // Verify workspace ID is preserved
      await waitFor(() => {
        const input = screen.getByRole('textbox', { name: /workspace id/i }) as HTMLInputElement;
        expect(input.value).toBe(VALID_WORKSPACE_ID);
      });
    });
  });
});
