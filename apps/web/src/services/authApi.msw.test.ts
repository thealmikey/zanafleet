import { login, getCurrentUser } from './authApi';

describe('authApi MSW contract', () => {
  it('login returns LoginResponse and getCurrentUser returns dummy user', async () => {
    const email = 'test@example.com';
    const password = 'any-password';

    const loginResp = await login({ email, password });

    expect(loginResp).toEqual({
      user: expect.objectContaining({
        id: 'user_1',
        email,
        name: 'Test User',
      }),
      token: expect.any(String),
      expiresAt: expect.any(String),
    });

    const me = await getCurrentUser(loginResp.token);
    expect(me).toEqual(
      expect.objectContaining({
        id: 'user_1',
        email,
        name: 'Test User',
      })
    );
  });
});
