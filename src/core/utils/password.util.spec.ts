import { hashPassword, verifyPassword } from './password.util';

describe('Password Utility', () => {
  describe('hashPassword', () => {
    it('should return a valid bcrypt hash', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      // bcrypt hashes start with $2b$ or $2a$ and are 60 characters
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(hash).toHaveLength(60);
    });

    it('should produce different hashes for the same password (salt verification)', async () => {
      const password = 'samePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'correctPassword123';
      const hash = await hashPassword(password);

      const result = await verifyPassword(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);

      const result = await verifyPassword(wrongPassword, hash);

      expect(result).toBe(false);
    });
  });
});
