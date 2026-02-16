import { Injectable, Logger } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../core/event-bus/event-bus.service';
import {
  CapabilityUsedEventV1,
  CapabilityExecutionResult,
} from '../events/capability-used.event';
import { CapabilityRepository } from '../repositories/capability.repository';

import { CapabilityAccessController } from './capability-access.controller';

/**
 * Orchestration context - passed through the orchestration flow
 */
export interface OrchestrationContext {
  /**
   * Unique ID for this orchestration request
   */
  orchestrationId: string;

  /**
   * Correlation ID for tracing across services
   */
  correlationId?: string;

  /**
   * Actor performing the action
   */
  actorId: string;

  /**
   * Actor type (e.g., 'user', 'system', 'service')
   */
  actorType?: string;

  /**
   * Workspace context
   */
  workspaceId?: string;

  /**
   * Target entity context
   */
  contextId?: string;
  contextType?: string;

  /**
   * Request timestamp
   */
  requestedAt: Date;
}

/**
 * Orchestration request - input for orchestration
 */
export interface OrchestrationRequest {
  /**
   * Name of the capability being executed
   */
  capabilityName: string;

  /**
   * Actor performing the action
   */
  actorId: string;

  /**
   * Optional actor type
   */
  actorType?: string;

  /**
   * Workspace context
   */
  workspaceId?: string;

  /**
   * Target entity context
   */
  contextId?: string;
  contextType?: string;

  /**
   * Command to execute (if capability check passes)
   */
  command?: unknown;

  /**
   * Optional correlation ID for tracing
   */
  correlationId?: string;

  /**
   * Additional payload data
   */
  payload?: Record<string, unknown>;

  /**
   * Whether to skip consent check (for automated systems)
   */
  skipConsentCheck?: boolean;
}

/**
 * Orchestration result - output from orchestration
 */
export interface OrchestrationResult<T = unknown> {
  /**
   * Whether the orchestration was successful
   */
  success: boolean;

  /**
   * Result data (if successful)
   */
  data?: T;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Event ID of the CapabilityUsedEvent
   */
  eventId?: string;

  /**
   * Execution time in milliseconds
   */
  executionTimeMs: number;
}

/**
 * ICapabilityOrchestrator Interface
 *
 * Defines the contract for capability orchestration.
 * This is the ONLY official mutation entrypoint for the system.
 */
export interface ICapabilityOrchestrator {
  /**
   * Execute a capability with full orchestration flow
   */
  execute<T>(request: OrchestrationRequest): Promise<OrchestrationResult<T>>;

  /**
   * Execute multiple capabilities in sequence
   */
  executeBatch<T>(requests: OrchestrationRequest[]): Promise<OrchestrationResult<T>[]>;

  /**
   * Check if actor can execute capability (without executing)
   */
  canExecute(request: OrchestrationRequest): Promise<boolean>;
}

/**
 * CapabilityOrchestrator
 *
 * Lightweight orchestration layer that:
 * 1. Checks capability via ICapabilityAccessController
 * 2. Checks consent via Policy module if required
 * 3. Executes Domain Command via CommandBus
 * 4. Validates Workflow transition if applicable
 * 5. Emits CapabilityUsedEvent for audit
 *
 * This becomes the ONLY official mutation entrypoint.
 */
@Injectable()
export class CapabilityOrchestrator implements ICapabilityOrchestrator {
  private readonly logger = new Logger(CapabilityOrchestrator.name);

  constructor(
    private readonly capabilityAccessController: CapabilityAccessController,
    private readonly capabilityRepository: CapabilityRepository,
    private readonly commandBus: CommandBus,
    private readonly _queryBus: QueryBus,
    private readonly eventBusService: EventBusService
  ) {}

  /**
   * Execute orchestration for a capability
   *
   * This is the main entry point for all mutations in the system.
   */
  async execute<T>(request: OrchestrationRequest): Promise<OrchestrationResult<T>> {
    const startTime = Date.now();
    const orchestrationId = uuidv4();

    this.logger.log(
      `CapabilityOrchestrator: Starting orchestration ${orchestrationId} for capability=${request.capabilityName}, actor=${request.actorId}`
    );

    // Build orchestration context
    const context: OrchestrationContext = {
      orchestrationId,
      correlationId: request.correlationId,
      actorId: request.actorId,
      actorType: request.actorType,
      workspaceId: request.workspaceId,
      contextId: request.contextId,
      contextType: request.contextType,
      requestedAt: new Date(),
    };

    try {
      // Step 1: Capability check
      const hasCapability = await this.capabilityAccessController.hasCapability(
        request.actorId,
        request.capabilityName
      );

      if (!hasCapability) {
        const executionTimeMs = Date.now() - startTime;

        // Emit denied event
        await this.emitCapabilityUsedEvent(
          {
            ...context,
            capabilityName: request.capabilityName,
            result: CapabilityExecutionResult.DENIED,
            reason: `Actor ${request.actorId} lacks capability: ${request.capabilityName}`,
            payload: request.payload,
          },
          executionTimeMs
        );

        return {
          success: false,
          error: `Missing required capability: ${request.capabilityName}`,
          executionTimeMs,
        };
      }

      // Step 2: Consent check (if capability requires it)
      if (!request.skipConsentCheck) {
        const requiresConsent = await this.checkConsentRequirement(request.capabilityName);

        if (requiresConsent) {
          const executionTimeMs = Date.now() - startTime;

          // For now, emit consent required event
          // In production, this would integrate with PolicyGuard/consent system
          await this.emitCapabilityUsedEvent(
            {
              ...context,
              capabilityName: request.capabilityName,
              result: CapabilityExecutionResult.CONSENT_REQUIRED,
              reason: 'Capability requires user consent',
              payload: request.payload,
            },
            executionTimeMs
          );

          return {
            success: false,
            error: 'Consent required for this capability',
            executionTimeMs,
          };
        }
      }

      // Step 3: Execute Domain Command (if provided)
      let commandResult: T | undefined;

      if (request.command) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          commandResult = await this.commandBus.execute<any>(request.command) as T;
          this.logger.debug(
            `CapabilityOrchestrator: Command executed successfully for ${request.capabilityName}`
          );
        } catch (commandError) {
          const executionTimeMs = Date.now() - startTime;

          // Emit failed event
          await this.emitCapabilityUsedEvent(
            {
              ...context,
              capabilityName: request.capabilityName,
              result: CapabilityExecutionResult.FAILED,
              reason: `Command execution failed: ${(commandError as Error).message}`,
              payload: request.payload,
            },
            executionTimeMs
          );

          return {
            success: false,
            error: `Command execution failed: ${(commandError as Error).message}`,
            executionTimeMs,
          };
        }
      }

      // Step 4: Workflow transition validation
      // This would integrate with WorkflowEngine if contextId is provided
      if (request.contextId && request.contextType) {
        await this.validateWorkflowTransition(context, request);
      }

      // Step 5: Emit CapabilityUsedEvent
      const executionTimeMs = Date.now() - startTime;
      const eventId = await this.emitCapabilityUsedEvent(
        {
          ...context,
          capabilityName: request.capabilityName,
          result: CapabilityExecutionResult.SUCCESS,
          payload: request.payload,
        },
        executionTimeMs
      );

      this.logger.log(
        `CapabilityOrchestrator: Completed orchestration ${orchestrationId} for capability=${request.capabilityName} in ${executionTimeMs}ms`
      );

      return {
        success: true,
        data: commandResult,
        eventId,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `CapabilityOrchestrator: Orchestration ${orchestrationId} failed: ${errorMessage}`,
        (error as Error).stack
      );

      // Emit failed event
      await this.emitCapabilityUsedEvent(
        {
          ...context,
          capabilityName: request.capabilityName,
          result: CapabilityExecutionResult.FAILED,
          reason: errorMessage,
          payload: request.payload,
        },
        executionTimeMs
      );

      return {
        success: false,
        error: errorMessage,
        executionTimeMs,
      };
    }
  }

  /**
   * Execute multiple capabilities in sequence
   */
  async executeBatch<T>(requests: OrchestrationRequest[]): Promise<OrchestrationResult<T>[]> {
    const results: OrchestrationResult<T>[] = [];

    for (const request of requests) {
      const result = await this.execute<T>(request);
      results.push(result);

      // Stop on first failure if configured
      if (!result.success) {
        this.logger.warn(
          `CapabilityOrchestrator: Batch execution stopped at ${request.capabilityName} due to failure`
        );
        break;
      }
    }

    return results;
  }

  /**
   * Check if actor can execute capability (without executing)
   */
  async canExecute(request: OrchestrationRequest): Promise<boolean> {
    return this.capabilityAccessController.hasCapability(
      request.actorId,
      request.capabilityName
    );
  }

  /**
   * Check if capability requires consent
   */
  private async checkConsentRequirement(capabilityName: string): Promise<boolean> {
    const capability = await this.capabilityRepository.findByName(capabilityName);

    if (!capability) {
      // If capability doesn't exist, don't require consent
      return false;
    }

    return capability.requiresConsent;
  }

  /**
   * Validate workflow transition (placeholder for integration)
   */
  private async validateWorkflowTransition(
    _context: OrchestrationContext,
    _request: OrchestrationRequest
  ): Promise<void> {
    // This would integrate with WorkflowEngine
    // For now, it's a no-op placeholder
    this.logger.debug(
      `CapabilityOrchestrator: Workflow validation skipped for ${_request.contextType ?? ''}:${_request.contextId ?? ''}`
    );
  }

  /**
   * Emit CapabilityUsedEvent for audit trail
   */
  private async emitCapabilityUsedEvent(
    data: {
      orchestrationId: string;
      correlationId?: string;
      actorId: string;
      actorType?: string;
      workspaceId?: string;
      contextId?: string;
      contextType?: string;
      capabilityName: string;
      result: CapabilityExecutionResult;
      reason?: string;
      payload?: Record<string, unknown>;
    },
    executionTimeMs: number
  ): Promise<string> {
    const event = new CapabilityUsedEventV1({
      eventId: uuidv4(),
      actorId: data.actorId,
      actorType: data.actorType,
      capabilityName: data.capabilityName,
      contextId: data.contextId,
      contextType: data.contextType,
      workspaceId: data.workspaceId,
      result: data.result,
      reason: data.reason,
      payload: data.payload,
      correlationId: data.correlationId,
      causationId: data.orchestrationId,
      executionTimeMs,
      metadata: {
        orchestrationId: data.orchestrationId,
      },
    });

    try {
      await this.eventBusService.publishEvent(event);
      return event.eventId;
    } catch (error) {
      this.logger.error(
        `Failed to publish CapabilityUsedEvent: ${(error as Error).message}`,
        (error as Error).stack
      );
      // Don't throw - audit failure shouldn't break the flow
      return event.eventId;
    }
  }
}
