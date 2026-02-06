import { ActorType } from '../../../actor/dto/actor.enums';
import { InitiateSignUpCommand } from '../../commands/initiate-signup.command';

describe('InitiateSignUpCommand', () => {
  const validPayload = {
    actorType: ActorType.Rider,
    idempotencyKey: 'test-idempotency-key-123',
  };

  it('should validate a valid payload successfully', () => {
    const result = InitiateSignUpCommand.validate(validPayload);
    expect(result.actorType).toBe(ActorType.Rider);
    expect(result.idempotencyKey).toBe('test-idempotency-key-123');
  });

  it('should validate a payload without an idempotency key', () => {
    const { idempotencyKey: _idempotencyKey, ...payload } = validPayload;
    const result = InitiateSignUpCommand.validate(payload);
    expect(result.actorType).toBe(ActorType.Rider);
    expect(result.idempotencyKey).toBeUndefined();
  });

  it('should throw ZodError on invalid actorType', () => {
    const invalidPayload = { ...validPayload, actorType: 'NOT_A_VALID_TYPE' };
    expect(() => InitiateSignUpCommand.validate(invalidPayload)).toThrow();
  });

  it('should throw ZodError on missing actorType', () => {
    const invalidPayload = { idempotencyKey: 'some-key' };
    expect(() => InitiateSignUpCommand.validate(invalidPayload)).toThrow();
  });

  it('should safeValidate and return success for valid payload', () => {
    const result = InitiateSignUpCommand.safeValidate(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actorType).toBe(ActorType.Rider);
    }
  });

  it('should safeValidate and return failure for invalid payload', () => {
    const result = InitiateSignUpCommand.safeValidate({
      actorType: 'INVALID_ENUM_VALUE',
    });
    expect(result.success).toBe(false);
  });
});
