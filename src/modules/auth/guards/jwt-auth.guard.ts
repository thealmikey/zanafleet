import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard
 *
 * Extends Passport's AuthGuard to provide JWT-based authentication
 * with clear error messages for different failure scenarios.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Handles the authentication request result
   *
   * @param err - Error from authentication process
   * @param user - Authenticated user if successful
   * @param info - Additional information about authentication failure
   * @param _context - Execution context (unused)
   * @returns The authenticated user
   * @throws UnauthorizedException with descriptive message
   */
  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    info: Error | undefined,
    _context: ExecutionContext
  ): TUser {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not yet valid');
      }
      throw new UnauthorizedException(info?.message || 'Unauthorized');
    }
    return user;
  }
}
