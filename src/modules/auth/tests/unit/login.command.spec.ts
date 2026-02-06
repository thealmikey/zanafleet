import { LoginCommand } from '../../commands/login.command';

describe('LoginCommand', () => {
  it('should validate a valid identifier successfully', () => {
    const payload = { identifier: '0x123' };
    const result = LoginCommand.validate(payload);
    expect(result.identifier).toBe('0x123');
  });

  it('should throw ZodError on empty identifier', () => {
    const payload = { identifier: '' };
    expect(() => LoginCommand.validate(payload)).toThrow();
  });

  it('should throw ZodError on missing identifier', () => {
    const payload = {};
    expect(() => LoginCommand.validate(payload)).toThrow();
  });

  it('should safeValidate and return success for valid payload', () => {
    const payload = { identifier: 'uuid-or-wallet' };
    const result = LoginCommand.safeValidate(payload);
    expect(result.success).toBe(true);
  });
});
