import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    guard = new JwtAuthGuard();
    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      const user = { actorId: 'test-id', email: 'test@example.com' };

      const result = guard.handleRequest(null, user, undefined, mockContext);

      expect(result).toEqual(user);
    });

    it('should throw UnauthorizedException when user is null (missing token)', () => {
      expect(() =>
        guard.handleRequest(null, null, undefined, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, undefined, mockContext),
      ).toThrow('Unauthorized');
    });

    it('should throw UnauthorizedException with "Token has expired" for expired tokens', () => {
      const expiredError = new Error('jwt expired');
      expiredError.name = 'TokenExpiredError';

      expect(() =>
        guard.handleRequest(null, null, expiredError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, expiredError, mockContext),
      ).toThrow('Token has expired');
    });

    it('should throw UnauthorizedException with "Invalid token" for malformed tokens', () => {
      const invalidError = new Error('invalid token');
      invalidError.name = 'JsonWebTokenError';

      expect(() =>
        guard.handleRequest(null, null, invalidError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, invalidError, mockContext),
      ).toThrow('Invalid token');
    });

    it('should throw UnauthorizedException with "Token not yet valid" for NotBeforeError', () => {
      const notBeforeError = new Error('jwt not active');
      notBeforeError.name = 'NotBeforeError';

      expect(() =>
        guard.handleRequest(null, null, notBeforeError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, notBeforeError, mockContext),
      ).toThrow('Token not yet valid');
    });

    it('should throw UnauthorizedException with info message when provided', () => {
      const customError = new Error('Custom auth error');

      expect(() =>
        guard.handleRequest(null, null, customError, mockContext),
      ).toThrow(UnauthorizedException);
      expect(() =>
        guard.handleRequest(null, null, customError, mockContext),
      ).toThrow('Custom auth error');
    });

    it('should throw UnauthorizedException when error is provided even with valid user', () => {
      const error = new Error('Some error');

      expect(() =>
        guard.handleRequest(error, { id: 'test' }, undefined, mockContext),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is false', () => {
      expect(() =>
        guard.handleRequest(null, false, undefined, mockContext),
      ).toThrow(UnauthorizedException);
    });
  });
});
