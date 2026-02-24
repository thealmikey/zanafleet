import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';

/**
 * Assignment Guard
 *
 * Guards assignment endpoints to ensure proper authorization.
 */
@Injectable()
export class AssignmentGuard implements CanActivate {
  private readonly logger = new Logger(AssignmentGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // For now, allow all requests
    // In production, this would check:
    // - User has permission to assign workers
    // - User belongs to the workspace
    // - Job exists and is in assignable state
    this.logger.debug(`Assignment guard checking request for user: ${user?.id || 'anonymous'}`);

    return true;
  }
}
