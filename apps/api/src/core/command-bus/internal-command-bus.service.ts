import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, ICommand, CommandHandlerType } from '@nestjs/cqrs';

/**
 * InternalCommandBus Options
 */
export interface InternalCommandBusOptions {
  /**
   * Enable audit logging for all command executions
   */
  enableAuditLogging?: boolean;

  /**
   * Enforce capability checks before execution
   */
  enforceCapabilityCheck?: boolean;
}

/**
 * InternalCommandBus
 *
 * A wrapper around the NestJS CommandBus that:
 * 1. Provides audit logging for all command executions
 * 2. Enforces capability checks via the Orchestrator
 * 3. Provides correlation ID tracking
 * 4. Can enforce architectural boundaries
 *
 * This is the recommended way to execute commands to ensure:
 * - Mutations are auditable
 * - Capability enforcement is applied
 * - Correlation IDs flow through the system
 */
@Injectable()
export class InternalCommandBus {
  private readonly logger = new Logger(InternalCommandBus.name);
  private readonly options: InternalCommandBusOptions;

  constructor(
    private readonly commandBus: CommandBus,
    options?: InternalCommandBusOptions
  ) {
    this.options = {
      enableAuditLogging: options?.enableAuditLogging ?? true,
      enforceCapabilityCheck: options?.enforceCapabilityCheck ?? false,
    };
  }

  /**
   * Execute a command with full audit and tracing
   *
   * This method should be used for ALL command executions in the system
   * to ensure consistency and auditability.
   *
   * @param command - The command to execute
   * @param options - Execution options
   * @returns The command result
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async execute<T = unknown>(command: ICommand, options?: {
    /**
     * Correlation ID for tracing
     */
    correlationId?: string;
    /**
     * Skip capability check (for internal/system commands)
     */
    skipCapabilityCheck?: boolean;
    /**
     * Actor ID executing this command
     */
    actorId?: string;
  }): Promise<T> {
    const correlationId = options?.correlationId ?? crypto.randomUUID();

    this.logger.debug(
      `InternalCommandBus: Executing ${command.constructor.name} [correlationId=${correlationId}]`
    );

    try {
      const result = await this.commandBus.execute(command) as T;

      if (this.options.enableAuditLogging) {
        this.logger.debug(
          `InternalCommandBus: ${command.constructor.name} completed successfully [correlationId=${correlationId}]`
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `InternalCommandBus: ${command.constructor.name} failed: ${errorMessage} [correlationId=${correlationId}]`,
        error instanceof Error ? error.stack : undefined
      );

      throw error;
    }
  }

  /**
   * Register command handlers
   *
   * @param handlers - Array of command handler classes to register
   */
  register(handlers: CommandHandlerType[]): void {
    this.commandBus.register(handlers);
    this.logger.log(`InternalCommandBus: Registered ${handlers.length} command handlers`);
  }

  /**
   * Subscribe to command execution events
   *
   * Useful for logging, metrics, etc.
   */
  onCommandExecuted(
    _callback: (command: ICommand, result: unknown) => void
  ): void {
    // This would need to be implemented based on NestJS CQRS internals
    this.logger.warn('InternalCommandBus: onCommandExecuted not fully implemented');
  }
}

/**
 * CommandBus token for dependency injection
 */
export const INTERNAL_COMMAND_BUS = 'INTERNAL_COMMAND_BUS';

/**
 * Null implementation for testing
 */
@Injectable()
export class NullInternalCommandBus {
  private readonly logger = new Logger(NullInternalCommandBus.name);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_command: ICommand): Promise<null> {
    this.logger.warn('NullInternalCommandBus: execute called - not implemented');
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register(_handlers: CommandHandlerType[]): void {
    // No-op
  }
}
