import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { GetSignUpSessionQuery } from '../../queries/get-signup-session.query';

describe('GetSignUpSessionQuery', () => {
  const validSessionId = uuidv4();

  describe('validate()', () => {
    it('should return valid input for correct UUID', () => {
      const input = { sessionId: validSessionId };
      const result = GetSignUpSessionQuery.validate(input);
      expect(result).toEqual(input);
    });

    it('should throw ZodError for invalid UUID format', () => {
      const input = { sessionId: 'not-a-uuid' };
      expect(() => GetSignUpSessionQuery.validate(input)).toThrow(ZodError);
    });

    it('should throw ZodError for non-string input', () => {
      const input = { sessionId: 123 };
      expect(() => GetSignUpSessionQuery.validate(input)).toThrow(ZodError);
    });

    it('should throw ZodError for missing sessionId', () => {
      const input = {};
      expect(() => GetSignUpSessionQuery.validate(input)).toThrow(ZodError);
    });
  });

  describe('safeValidate()', () => {
    it('should return success object for valid input', () => {
      const input = { sessionId: validSessionId };
      const result = GetSignUpSessionQuery.safeValidate(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });

    it('should return error object (not thrown) for invalid input', () => {
      const input = { sessionId: 'not-a-uuid' };
      const result = GetSignUpSessionQuery.safeValidate(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ZodError);
      }
    });
  });

  describe('constructor', () => {
    it('should create an instance with sessionId', () => {
      const input = { sessionId: validSessionId };
      const query = new GetSignUpSessionQuery(input);
      expect(query.sessionId).toBe(validSessionId);
    });
  });
});
