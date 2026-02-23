import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let jwtAuthGuard: JwtAuthGuard;

  beforeEach(() => {
    jwtAuthGuard = new JwtAuthGuard();
  });

  const createMockContext = (user: unknown, info: Error | undefined): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
    } as ExecutionContext;
  };

  describe('handleRequest()', () => {
    describe('when authentication succeeds', () => {
      it('should allow valid tokens', () => {
        const mockUser = {
          actorId: 'actor-123',
          email: 'test@example.com',
          workspaceId: 'workspace-456',
          roles: ['admin'],
        };

        const context = createMockContext(mockUser, undefined);
        const result = jwtAuthGuard.handleRequest(null, mockUser, undefined, context);

        expect(result).toEqual(mockUser);
      });

      it('should return user object for valid token', () => {
        const validUser = { actorId: 'test-actor-id' };
        const context = createMockContext(validUser, undefined);

        const result = jwtAuthGuard.handleRequest(null, validUser, undefined, context);

        expect(result).toBe(validUser);
      });
    });

    describe('when authentication fails', () => {
      it('should return 401 with "Token has expired" for expired tokens', () => {
        const expiredError = new Error('Token has expired') as Error & { name: string };
        expiredError.name = 'TokenExpiredError';

        const context = createMockContext(null, expiredError);

        expect(() => {
          jwtAuthGuard.handleRequest(null, null, expiredError, context);
        }).toThrow(UnauthorizedException);

        try {
          jwtAuthGuard.handleRequest(null, null, expiredError, context);
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          expect((error as UnauthorizedException).message).toBe('Token has expired');
        }
      });

      it('should return 401 with "Invalid token" for malformed tokens', () => {
        const malformedError = new Error('Invalid token') as Error & { name: string };
        malformedError.name = 'JsonWebTokenError';

        const context = createMockContext(null, malformedError);

        expect(() => {
          jwtAuthGuard.handleRequest(null, null, malformedError, context);
        }).toThrow(UnauthorizedException);

        try {
          jwtAuthGuard.handleRequest(null, null, malformedError, context);
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          expect((error as UnauthorizedException).message).toBe('Invalid token');
        }
      });

      it('should return 401 with "Token not yet valid" for NotBeforeError', () => {
        const notBeforeError = new Error('Token not yet valid') as Error & { name: string };
        notBeforeError.name = 'NotBeforeError';

        const context = createMockContext(null, notBeforeError);

        try {
          jwtAuthGuard.handleRequest(null, null, notBeforeError, context);
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          expect((error as UnauthorizedException).message).toBe('Token not yet valid');
        }
      });

      it('should return 401 with default message for unknown errors', () => {
        const unknownError = new Error('Some unknown error');
        const context = createMockContext(null, unknownError);

        try {
          jwtAuthGuard.handleRequest(null, null, unknownError, context);
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
        }
      });

      it('should return 401 when user is null', () => {
        const context = createMockContext(null, undefined);

        try {
          jwtAuthGuard.handleRequest(null, null, undefined, context);
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
        }
      });

      it('should return 401 when there is an authentication error', () => {
        const authError = new Error('Authentication failed');
        const context = createMockContext(null, undefined);

        try {
          jwtAuthGuard.handleRequest(authError, null, undefined, context);
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle tokens with empty info object', () => {
        const mockUser = { actorId: 'test' };
        const context = createMockContext(mockUser, {} as Error);

        const result = jwtAuthGuard.handleRequest(null, mockUser, {} as Error, context);

        expect(result).toEqual(mockUser);
      });

      it('should preserve original error message when available', () => {
        const errorWithMessage = new Error('Custom error message') as Error & { name: string };
        errorWithMessage.name = 'SomeError';

        const context = createMockContext(null, errorWithMessage);

        try {
          jwtAuthGuard.handleRequest(null, null, errorWithMessage, context);
        } catch (error) {
          expect(error).toBeInstanceOf(UnauthorizedException);
          expect((error as UnauthorizedException).message).toBe('Custom error message');
        }
      });
    });
  });
});
