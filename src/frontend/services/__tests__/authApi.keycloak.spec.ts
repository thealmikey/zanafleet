// Mock signupApi before any imports to avoid TypeScript compilation errors
// (signupApi imports Workspace from types which may not exist)
jest.mock('../signupApi', () => ({
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

import { exchangeKeycloakToken } from '../authApi';
import { ApiError } from '../signupApi';

// Mock global fetch to avoid MSW ESM compatibility issues with root Jest
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe('authApi - Keycloak', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('exchangeKeycloakToken', () => {
    it('should call the correct endpoint with access token', async () => {
      const mockResponse = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          roles: ['user'],
        },
        token: 'local-jwt-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await exchangeKeycloakToken('keycloak-access-token');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/keycloak/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accessToken: 'keycloak-access-token' }),
        }),
      );
    });

    it('should return user and token on success', async () => {
      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'keycloak-user@example.com',
          name: 'Keycloak User',
          roles: ['admin', 'user'],
        },
        token: 'jwt-token-abc123',
        expiresAt: '2026-02-02T14:00:00.000Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await exchangeKeycloakToken('valid-keycloak-token');

      expect(result).toEqual(mockResponse);
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe('keycloak-user@example.com');
      expect(result.token).toBe('jwt-token-abc123');
    });

    it('should throw ApiError on 401 unauthorized response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid token', statusCode: 401 }),
      } as Response);

      await expect(exchangeKeycloakToken('invalid-token')).rejects.toThrow(ApiError);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Invalid token', statusCode: 401 }),
      } as Response);

      try {
        await exchangeKeycloakToken('invalid-token');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(401);
      }
    });

    it('should throw ApiError on 400 bad request response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Token missing email claim', statusCode: 400 }),
      } as Response);

      await expect(exchangeKeycloakToken('token-without-email')).rejects.toThrow(ApiError);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ message: 'Token missing email claim', statusCode: 400 }),
      } as Response);

      try {
        await exchangeKeycloakToken('token-without-email');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(400);
      }
    });

    it('should throw ApiError on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Internal server error' }),
      } as Response);

      await expect(exchangeKeycloakToken('any-token')).rejects.toThrow(ApiError);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Internal server error' }),
      } as Response);

      try {
        await exchangeKeycloakToken('any-token');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(500);
      }
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(exchangeKeycloakToken('any-token')).rejects.toThrow();
    });
  });
});
