/**
 * @file AuthContext Keycloak Integration Tests
 * Tests for Keycloak SSO integration in AuthContext
 */

// Mock signupApi before any imports to avoid TypeScript compilation errors
jest.mock('../../services/signupApi', () => ({
  ApiError: class ApiError extends Error {
    status: number;
    statusText: string;
    body: unknown;
    constructor(status: number, statusText: string, body?: unknown) {
      super(`${status} ${statusText}`);
      this.name = 'ApiError';
      this.status = status;
      this.statusText = statusText;
      this.body = body;
    }
  },
}));

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AuthProvider, AuthContext, AuthContextValue } from '../AuthContext';

// Mock global fetch to avoid MSW ESM compatibility issues with root Jest
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

// Mock keycloak-js module
const mockKeycloakInstance = {
  init: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  updateToken: jest.fn(),
  token: null as string | null,
  authenticated: false,
  onTokenExpired: null as (() => void) | null,
};

jest.mock('../../config/keycloak.config', () => ({
  keycloakConfig: {
    url: 'http://localhost:8080',
    realm: 'zanafleet',
    clientId: 'zanafleet-web',
  },
  keycloakInstance: mockKeycloakInstance,
}));

// Test component to access context
function TestConsumer({ onContext }: { onContext: (ctx: AuthContextValue) => void }): React.ReactElement {
  const context = React.useContext(AuthContext);
  React.useEffect(() => {
    if (context) {
      onContext(context);
    }
  }, [context, onContext]);
  return <div data-testid="test-consumer">Consumer</div>;
}

function TestButton({ action }: { action: string }): React.ReactElement {
  const context = React.useContext(AuthContext);
  
  const handleClick = async (): Promise<void> => {
    if (!context) return;
    if (action === 'loginWithKeycloak') {
      await context.loginWithKeycloak();
    } else if (action === 'initKeycloak') {
      await context.initKeycloak();
    }
  };

  return (
    <button data-testid="test-button" onClick={handleClick}>
      {action}
    </button>
  );
}

describe('AuthContext - Keycloak Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    localStorage.clear();
    
    // Reset mock keycloak state
    mockKeycloakInstance.token = null;
    mockKeycloakInstance.authenticated = false;
    mockKeycloakInstance.onTokenExpired = null;
    mockKeycloakInstance.init.mockReset();
    mockKeycloakInstance.login.mockReset();
    mockKeycloakInstance.logout.mockReset();
    mockKeycloakInstance.updateToken.mockReset();
  });

  describe('loginWithKeycloak', () => {
    it('should call keycloak.login() when loginWithKeycloak is invoked', async () => {
      mockKeycloakInstance.init.mockResolvedValue(false);
      mockKeycloakInstance.login.mockResolvedValue(undefined);

      const user = userEvent.setup();

      render(
        <AuthProvider>
          <TestButton action="loginWithKeycloak" />
        </AuthProvider>,
      );

      // Wait for initial mount and keycloak init
      await waitFor(() => {
        expect(mockKeycloakInstance.init).toHaveBeenCalled();
      });

      const button = screen.getByTestId('test-button');
      await user.click(button);

      await waitFor(() => {
        expect(mockKeycloakInstance.login).toHaveBeenCalledWith({
          redirectUri: window.location.origin,
        });
      });
    });

    it('should initialize keycloak first if not already initialized', async () => {
      mockKeycloakInstance.init.mockResolvedValue(false);
      mockKeycloakInstance.login.mockResolvedValue(undefined);

      const user = userEvent.setup();
      let contextValue: AuthContextValue | null = null;

      render(
        <AuthProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
          <TestButton action="loginWithKeycloak" />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(contextValue?.keycloakInitialized).toBe(true);
      });

      const button = screen.getByTestId('test-button');
      await user.click(button);

      await waitFor(() => {
        expect(mockKeycloakInstance.login).toHaveBeenCalled();
      });
    });
  });

  describe('initKeycloak', () => {
    it('should exchange token when keycloak is authenticated', async () => {
      const mockUser = {
        id: 'kc-user-id',
        email: 'keycloak@example.com',
        name: 'Keycloak User',
        roles: ['user'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: mockUser,
          token: 'exchanged-jwt-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as Response);

      mockKeycloakInstance.token = 'keycloak-access-token';
      mockKeycloakInstance.authenticated = true;
      mockKeycloakInstance.init.mockResolvedValue(true);

      let contextValue: AuthContextValue | null = null;

      render(
        <AuthProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(contextValue?.isAuthenticated).toBe(true);
        expect(contextValue?.keycloakAuthenticated).toBe(true);
      });

      expect(contextValue?.user).toEqual(mockUser);
      expect(contextValue?.token).toBe('exchanged-jwt-token');
    });

    it('should not exchange token when keycloak is not authenticated', async () => {
      mockKeycloakInstance.token = null;
      mockKeycloakInstance.authenticated = false;
      mockKeycloakInstance.init.mockResolvedValue(false);

      let contextValue: AuthContextValue | null = null;

      render(
        <AuthProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(contextValue?.keycloakInitialized).toBe(true);
      });

      expect(contextValue?.isAuthenticated).toBe(false);
      expect(contextValue?.keycloakAuthenticated).toBe(false);
      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/auth/keycloak/token'),
        expect.anything(),
      );
    });

    it('should set keycloakInitialized to true after init', async () => {
      mockKeycloakInstance.init.mockResolvedValue(false);

      let contextValue: AuthContextValue | null = null;

      render(
        <AuthProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(contextValue?.keycloakInitialized).toBe(true);
      });
    });

    it('should handle keycloak init failure gracefully', async () => {
      mockKeycloakInstance.init.mockRejectedValue(new Error('Keycloak server unavailable'));

      let contextValue: AuthContextValue | null = null;

      render(
        <AuthProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(contextValue?.keycloakInitialized).toBe(true);
      });

      expect(contextValue?.keycloakAuthenticated).toBe(false);
      expect(contextValue?.isAuthenticated).toBe(false);
    });

    it('should set error when token exchange fails', async () => {
      mockKeycloakInstance.token = 'keycloak-token';
      mockKeycloakInstance.authenticated = true;
      mockKeycloakInstance.init.mockResolvedValue(true);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Token exchange failed' }),
      } as Response);

      let contextValue: AuthContextValue | null = null;

      render(
        <AuthProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(contextValue?.error).toBe('Failed to complete Keycloak authentication');
      });

      expect(contextValue?.isAuthenticated).toBe(false);
    });

    it('should persist token to localStorage after successful exchange', async () => {
      mockKeycloakInstance.token = 'keycloak-access-token';
      mockKeycloakInstance.authenticated = true;
      mockKeycloakInstance.init.mockResolvedValue(true);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-1', email: 'test@test.com', name: 'Test', roles: [] },
          token: 'persisted-jwt-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as Response);

      render(
        <AuthProvider>
          <TestConsumer onContext={() => {}} />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(localStorage.getItem('zanafleet_auth_token')).toBe('persisted-jwt-token');
      });
    });
  });

  describe('logout with Keycloak', () => {
    it('should call keycloak.logout when logging out keycloak-authenticated user', async () => {
      mockKeycloakInstance.token = 'keycloak-token';
      mockKeycloakInstance.authenticated = true;
      mockKeycloakInstance.init.mockResolvedValue(true);
      mockKeycloakInstance.logout.mockResolvedValue(undefined);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            user: { id: 'user-1', email: 'test@test.com', name: 'Test', roles: [] },
            token: 'jwt-token',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
        } as Response);

      let contextValue: AuthContextValue | null = null;

      render(
        <AuthProvider>
          <TestConsumer onContext={(ctx) => { contextValue = ctx; }} />
        </AuthProvider>,
      );

      await waitFor(() => {
        expect(contextValue?.isAuthenticated).toBe(true);
        expect(contextValue?.keycloakAuthenticated).toBe(true);
      });

      await act(async () => {
        await contextValue?.logout();
      });

      await waitFor(() => {
        expect(mockKeycloakInstance.logout).toHaveBeenCalledWith({
          redirectUri: window.location.origin,
        });
      });
    });
  });
});
