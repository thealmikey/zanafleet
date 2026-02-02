import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { ValidatedUser } from '../strategies/jwt.strategy';

/**
 * Request interface extended with authenticated user
 */
interface RequestWithUser extends Request {
  user: ValidatedUser;
}

/**
 * CurrentUser decorator
 * Extracts the authenticated user from the request object (set by Passport)
 *
 * Usage:
 * @Get('profile')
 * getProfile(@CurrentUser() user: ValidatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ValidatedUser => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  }
);
