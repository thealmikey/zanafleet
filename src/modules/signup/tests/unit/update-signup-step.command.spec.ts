import { v4 as uuidv4 } from 'uuid';

import { UpdateSignUpStepCommand } from '../../commands/update-signup-step.command';

describe('UpdateSignUpStepCommand', () => {
  const sessionId = uuidv4();
  const workspaceIds = [uuidv4()];

  const validPayload = {
    sessionId,
    stepName: 'work-details',
    workspaceIds,
    roles: ['Rider'],
    linkedWallets: [uuidv4()],
    idempotencyKey: 'test-key-123',
    email: 'rider@example.com',
    username: 'john_rider',
    password: 'securePassword123',
    location: 'Nairobi, Kenya',
    workspaceName: 'My Fleet Company',
  };

  it('should validate a valid payload successfully', () => {
    const result = UpdateSignUpStepCommand.validate(validPayload);
    expect(result.sessionId).toBe(sessionId);
    expect(result.stepName).toBe('work-details');
    expect(result.workspaceIds).toEqual(workspaceIds);
    expect(result.roles).toEqual(['Rider']);
    expect(result.idempotencyKey).toBe('test-key-123');
    expect(result.email).toBe('rider@example.com');
    expect(result.username).toBe('john_rider');
    expect(result.password).toBe('securePassword123');
    expect(result.location).toBe('Nairobi, Kenya');
    expect(result.workspaceName).toBe('My Fleet Company');
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
    expect(result.email).toBeUndefined();
    expect(result.username).toBeUndefined();
    expect(result.password).toBeUndefined();
    expect(result.location).toBeUndefined();
    expect(result.workspaceName).toBeUndefined();
  });

  it('should throw ZodError on invalid sessionId', () => {
    const invalidPayload = { ...validPayload, sessionId: 'not-a-uuid' };
    expect(() => UpdateSignUpStepCommand.validate(invalidPayload)).toThrow();
  });

  it('should throw ZodError on missing stepName', () => {
    const { stepName: _stepName, ...invalidPayload } = validPayload as any;
    expect(() => UpdateSignUpStepCommand.validate(invalidPayload)).toThrow();
  });

  it('should throw ZodError on invalid workspaceIds', () => {
    const invalidPayload = { ...validPayload, workspaceIds: ['not-a-uuid'] };
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

  it('should throw ZodError on invalid email format', () => {
    const invalidPayload = { ...validPayload, email: 'not-an-email' };
    expect(() => UpdateSignUpStepCommand.validate(invalidPayload)).toThrow();
  });

  it('should validate payload with only identity fields', () => {
    const identityPayload = {
      sessionId,
      stepName: 'identity',
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      location: 'Test City',
      workspaceName: 'Test Workspace',
    };
    const result = UpdateSignUpStepCommand.validate(identityPayload);
    expect(result.email).toBe('test@example.com');
    expect(result.username).toBe('testuser');
    expect(result.password).toBe('password123');
    expect(result.location).toBe('Test City');
    expect(result.workspaceName).toBe('Test Workspace');
    expect(result.workspaceIds).toEqual([]);
    expect(result.roles).toEqual([]);
  });

  it('should construct command with identity fields', () => {
    const input = UpdateSignUpStepCommand.validate(validPayload);
    const command = new UpdateSignUpStepCommand(input);
    expect(command.email).toBe('rider@example.com');
    expect(command.username).toBe('john_rider');
    expect(command.password).toBe('securePassword123');
    expect(command.location).toBe('Nairobi, Kenya');
    expect(command.workspaceName).toBe('My Fleet Company');
  });
});
