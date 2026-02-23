import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

import { Request, Response, NextFunction } from 'express';

import { TenantContextService } from '../services/tenant-context.service';

/**
 * TenantContextMiddleware
 *
 * Extracts tenant context from incoming requests and stores it
 * in AsyncLocalStorage for use throughout the application.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private readonly tenantContextService: TenantContextService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    const context = this.tenantContextService.fromRequest(request as {
      user?: { workspaceId?: string; actorId?: string };
      headers?: Record<string, string | string[] | undefined>;
      id?: string;
    });

    // Run all subsequent handlers in this context
    this.tenantContextService.runInContext(context, () => {
      this.logger.debug(
        `Tenant context set: workspaceId=${context.workspaceId || 'none'}, actorId=${context.actorId || 'none'}, correlationId=${context.correlationId || 'generated'}`,
      );
      next();
    });
  }
}