import { v4 as uuidv4 } from 'uuid';

import { UpdateSignUpStepCommand } from '../../commands/update-signup-step.command';

describe('UpdateSignUpStepCommand', () => {
  const sessionId = uuidv4();
  const workspaceId = uuidv4();

  const validPayload = {
    sessionId,
    stepName: 'work-details',
    workspaceId,
    roles: ['Rider'],
    linkedWallets: [uuidv4()],
    idempotencyKey: 'test-key-123',
  };

  it('should validate a valid payload successfully', () => {
    const result = UpdateSignUpStepCommand.validate(validPayload);
    expect(result.sessionId).toBe(sessionId);
    expect(result.stepName).toBe('work-details');
    expect(result.workspaceId).toBe(workspaceId);
    expect(result.roles).toEqual(['Rider']);
    expect(result.idempotencyKey).toBe('test-key-123');
  });

  it('should validate a payload with minimal required fields', () => {
    const minimalPayload = {
      sessionId,
      stepName: 'init',
    };
    const result = UpdateSignUpStepCommand.validate(minimalPayload);
    expect(result.sessionId).toBe(sessionId);
    expect(result.stepName).toBe('init');
    expect(result.roles).toEqual([]);
    expect(result.linkedWallets).toEqual([]);
  });

  it('should throw ZodError on invalid sessionId', () => {
    const invalidPayload = { ...validPayload, sessionId: 'not-a-uuid' };
    expect(() => UpdateSignUpStepCommand.validate(invalidPayload)).toThrow();
  });

  it('should throw ZodError on missing stepName', () => {
    const { stepName, ...invalidPayload } = validPayload as any;
    expect(() => UpdateSignUpStepCommand.validate(invalidPayload)).toThrow();
  });

  it('should throw ZodError on invalid workspaceId', () => {
    const invalidPayload = { ...validPayload, workspaceId: 'not-a-uuid' };
    expect(() => UpdateSignUpStepCommand.validate(invalidPayload)).toThrow();
  });

  it('should safeValidate and return success for valid payload', () => {
    const result = UpdateSignUpStepCommand.safeValidate(validPayload);
    expect(result.success).toBe(true);
  });

  it('should safeValidate and return failure for invalid payload', () => {
    const result = UpdateSignUpStepCommand.safeValidate({
      sessionId: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
