import { Injectable, Logger } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context containing multi-tenant identification
 */
export interface TenantContext {
  workspaceId?: string;
  actorId?: string;
  correlationId?: string;
  requestId?: string;
}

/**
 * TenantContextService
 *
 * Provides thread-safe storage of tenant context for the current request.
 * Uses AsyncLocalStorage to maintain context across async operations.
 * This enables proper multi-tenant logging throughout the application.
 */
@Injectable()
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private readonly asyncLocalStorage = new AsyncLocalStorage<TenantContext>();

  /**
   * Set the tenant context for the current async execution context
   */
  setContext(context: TenantContext): void {
    const currentContext = this.asyncLocalStorage.getStore();
    if (currentContext) {
      // Merge with existing context
      Object.assign(currentContext, context);
    } else {
      // Store new context
      this.asyncLocalStorage.run(context, () => {
        // Context is now active
      });
    }
  }

  /**
   * Get the current tenant context
   */
  getContext(): TenantContext {
    const context = this.asyncLocalStorage.getStore();
    return context || {};
  }

  /**
   * Get workspaceId from current context
   */
  getWorkspaceId(): string | undefined {
    return this.getContext().workspaceId;
  }

  /**
   * Get actorId from current context
   */
  getActorId(): string | undefined {
    return this.getContext().actorId;
  }

  /**
   * Get correlationId from current context
   */
  getCorrelationId(): string | undefined {
    return this.getContext().correlationId;
  }

  /**
   * Run a callback within a specific tenant context
   */
  runInContext<T>(context: TenantContext, callback: () => T): T {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Execute a callback with a temporary context override
   */
  async runInContextAsync<T>(context: TenantContext, callback: () => Promise<T>): Promise<T> {
    return this.asyncLocalStorage.run(context, callback);
  }

  /**
   * Clear the current context
   */
  clearContext(): void {
    const context = this.asyncLocalStorage.getStore();
    if (context) {
      delete context.workspaceId;
      delete context.actorId;
      delete context.correlationId;
      delete context.requestId;
    }
  }

  /**
   * Middleware-style wrapper for Express/NestJS requests
   * Call this in a middleware to set up context from request
   */
  fromRequest(request: {
    user?: { workspaceId?: string; actorId?: string };
    headers?: Record<string, string | string[] | undefined>;
    id?: string;
  }): TenantContext {
    const workspaceId = request.user?.workspaceId;
    const actorId = request.user?.actorId;
    const correlationId = request.headers?.['x-correlation-id'] as string 
      || request.headers?.['x-request-id'] as string;
    const requestId = request.id || request.headers?.['x-request-id'] as string;

    const context: TenantContext = {};
    if (workspaceId) context.workspaceId = workspaceId;
    if (actorId) context.actorId = actorId;
    if (correlationId) context.correlationId = correlationId;
    if (requestId) context.requestId = requestId;

    return context;
  }
}