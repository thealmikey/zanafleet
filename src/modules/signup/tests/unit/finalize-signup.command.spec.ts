import { v4 as uuidv4 } from 'uuid';

import { FinalizeSignUpCommand } from '../../commands/finalize-signup.command';

describe('FinalizeSignUpCommand', () => {
  const sessionId = uuidv4();

  const validPayload = {
    sessionId,
  };

  it('should validate a valid payload successfully', () => {
    const result = FinalizeSignUpCommand.validate(validPayload);
    expect(result.sessionId).toBe(sessionId);
  });

  it('should throw ZodError on invalid sessionId', () => {
    const invalidPayload = { sessionId: 'not-a-uuid' };
    expect(() => FinalizeSignUpCommand.validate(invalidPayload)).toThrow();
  });

  it('should throw ZodError on missing sessionId', () => {
    const invalidPayload = {};
    expect(() => FinalizeSignUpCommand.validate(invalidPayload)).toThrow();
  });

  it('should safeValidate and return success for valid payload', () => {
    const result = FinalizeSignUpCommand.safeValidate(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sessionId).toBe(sessionId);
    }
  });

  it('should safeValidate and return failure for invalid payload', () => {
    const result = FinalizeSignUpCommand.safeValidate({
      sessionId: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
