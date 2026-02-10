import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { CAPABILITY_KEY } from '../decorators/require-capability.decorator';

/**
 * Injection token for the CapabilityAccessController service.
 */
export const CAPABILITY_ACCESS_CONTROLLER = 'CAPABILITY_ACCESS_CONTROLLER';

/**
 * Interface for capability access control.
 * Implementations should check whether an actor has a specific capability.
 */
export interface ICapabilityAccessController {
  /**
   * Check if an actor has a specific capability.
   * @param actorId - The ID of the actor to check
   * @param capabilityName - The name of the capability required
   * @returns true if the actor has the capability, false otherwise
   */
  hasCapability(actorId: string, capabilityName: string): Promise<boolean>;
}

/**
 * CapabilityGuard
 *
 * NestJS Guard that enforces capability-based access control on routes.
 * Works in conjunction with @RequireCapability() decorator.
 *
 * Usage:
 * ```typescript
 * @Controller('admin')
 * @UseGuards(AuthGuard, CapabilityGuard)
 * export class AdminController {
 *   @Get('users')
 *   @RequireCapability('admin_read_users')
 *   getUsers() { ... }
 * }
 * ```
 *
 * The guard:
 * 1. Reads required capabilities from route metadata
 * 2. Extracts the authenticated user from request
 * 3. Verifies the user has ALL required capabilities
 * 4. Throws ForbiddenException if any capability is missing
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  private readonly logger = new Logger(CapabilityGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(CAPABILITY_ACCESS_CONTROLLER)
    private readonly capabilityAccessController?: ICapabilityAccessController
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapabilities = this.reflector.getAllAndOverride<string[]>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: { actorId?: string } }>();
    const user = request.user;

    if (!user?.actorId) {
      this.logger.warn('CapabilityGuard: No authenticated user found on request');
      throw new ForbiddenException('Authentication required');
    }

    if (!this.capabilityAccessController) {
      this.logger.error('CapabilityGuard: CapabilityAccessController not configured');
      throw new ForbiddenException('Capability access controller not configured');
    }

    for (const capability of requiredCapabilities) {
      const hasCapability = await this.capabilityAccessController.hasCapability(
        user.actorId,
        capability
      );

      if (!hasCapability) {
        this.logger.debug(
          `CapabilityGuard: Actor ${user.actorId} missing capability: ${capability}`
        );
        throw new ForbiddenException(`Missing required capability: ${capability}`);
      }
    }

    this.logger.debug(
      `CapabilityGuard: Actor ${user.actorId} authorized with capabilities: ${requiredCapabilities.join(', ')}`
    );

    return true;
  }
}
