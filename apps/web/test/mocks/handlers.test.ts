import { setupServer } from 'msw/node';
import { handlers, getTestAccounts, getTestAccountByEmail, createMockToken } from './handlers';
import { TEST_PASSWORD } from '@zanafleet/contracts';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Auth Mock Handlers', () => {
  describe('helper functions', () => {
    it('getTestAccounts returns all test accounts', () => {
      const accounts = getTestAccounts();
      expect(accounts.length).toBeGreaterThanOrEqual(6);
      expect(accounts.some((a) => a.type === 'Admin')).toBe(true);
      expect(accounts.some((a) => a.type === 'Rider')).toBe(true);
    });

    it('getTestAccountByEmail finds account by email', () => {
      const account = getTestAccountByEmail('test-admin@zanafleet.dev');
      expect(account).toBeDefined();
      expect(account?.type).toBe('Admin');
    });

    it('getTestAccountByEmail returns undefined for unknown email', () => {
      const account = getTestAccountByEmail('unknown@example.com');
      expect(account).toBeUndefined();
    });

    it('createMockToken creates a base64-encoded token', () => {
      const account = getTestAccountByEmail('test-rider@zanafleet.dev')!;
      const token = createMockToken(account);

      // Token should be base64 decodable
      const decoded = JSON.parse(atob(token));
      expect(decoded.sub).toBe(account.id);
      expect(decoded.email).toBe(account.email);
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns LoginResponse for valid test account credentials', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-rider@zanafleet.dev',
          password: TEST_PASSWORD,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test-rider@zanafleet.dev');
      expect(data.user.name).toBe('test-rider'); // username mapped to name
      expect(data.token).toBeDefined();
      expect(data.expiresAt).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-rider@zanafleet.dev',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('Invalid email or password');
    });

    it('returns 401 for unknown email', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'unknown@example.com',
          password: TEST_PASSWORD,
        }),
      });

      expect(response.status).toBe(401);
    });

    it('returns 400 for missing email or password', async () => {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns User for valid token', async () => {
      // First login to get a token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-admin@zanafleet.dev',
          password: TEST_PASSWORD,
        }),
      });
      const loginData = await loginResponse.json();

      // Then use token to get current user
      const meResponse = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${loginData.token}` },
      });

      expect(meResponse.status).toBe(200);
      const userData = await meResponse.json();
      expect(userData.id).toBeDefined();
      expect(userData.email).toBe('test-admin@zanafleet.dev');
      expect(userData.name).toBe('test-admin');
      expect(userData.roles).toContain('Admin');
    });

    it('returns 401 without Authorization header', async () => {
      const response = await fetch('/api/auth/me');

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.message).toBe('Unauthorized');
    });

    it('returns 401 for invalid token', async () => {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: 'Bearer invalid-token' },
      });

      expect(response.status).toBe(401);
    });
  });
});
