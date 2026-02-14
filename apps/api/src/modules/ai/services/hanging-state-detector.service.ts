import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '@api/core/event-bus';
import { v4 as uuidv4 } from 'uuid';

import { AIHangingStateDetectedEventV1 } from '../events/ai-hanging-state-detected.event';

/**
 * Workflow state timeout configuration
 */
interface StateTimeoutConfig {
  state: string;
  expectedDurationMs: number;
  suggestedCapability?: string;
  reason?: string;
}

/**
 * Hanging State Detector Service
 *
 * Detects workflow states that exceed their expected duration.
 * Emits AIHangingStateDetectedEvent when a hanging state is detected.
 */
@Injectable()
export class HangingStateDetectorService {
  private readonly logger = new Logger(HangingStateDetectorService.name);

  // Default timeouts per workflow state (in milliseconds)
  // These should be configured based on business requirements
  private readonly defaultTimeouts: StateTimeoutConfig[] = [
    { state: 'pending', expectedDurationMs: 5 * 60 * 1000 }, // 5 minutes
    { state: 'in_progress', expectedDurationMs: 30 * 60 * 1000 }, // 30 minutes
    { state: 'awaiting_review', expectedDurationMs: 60 * 60 * 1000 }, // 1 hour
    { state: 'waiting', expectedDurationMs: 15 * 60 * 1000 }, // 15 minutes
    { state: 'pending_approval', expectedDurationMs: 60 * 60 * 1000 }, // 1 hour
  ];

  constructor(private readonly eventBus: EventBusService) {}

  /**
   * Check if a workflow state has been hanging
   * This would typically be called by a scheduled job that queries active processes
   */
  async checkHangingState(params: {
    actorId: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    stateEnteredAt: Date;
    previousState?: string;
    correlationId?: string;
  }): Promise<AIHangingStateDetectedEventV1 | null> {
    const config = this.getTimeoutConfig(params.workflowState);
    const durationMs = Date.now() - params.stateEnteredAt.getTime();

    this.logger.debug(
      `Checking hanging state: ${params.workflowState}, duration=${durationMs}ms, expected=${config.expectedDurationMs}ms`
    );

    // Check if state has exceeded expected duration
    if (durationMs < config.expectedDurationMs) {
      return null;
    }

    // Create and emit the event
    const event = new AIHangingStateDetectedEventV1({
      eventId: uuidv4(),
      aggregateId: params.contextId,
      actorId: params.actorId,
      contextType: params.contextType,
      contextId: params.contextId,
      workflowState: params.workflowState,
      previousState: params.previousState,
      stateEnteredAt: params.stateEnteredAt,
      durationMs,
      expectedDurationMs: config.expectedDurationMs,
      suggestedCapability: config.suggestedCapability,
      reason: config.reason,
      correlationId: params.correlationId,
    });

    try {
      await this.eventBus.publish('ai.hanging-state.detected', event);
      this.logger.log(
        `Hanging state detected: ${params.contextType}:${params.contextId} in state ${params.workflowState} for ${durationMs}ms`
      );
      return event;
    } catch (error) {
      this.logger.error(
        `Failed to publish hanging state event: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Get timeout configuration for a workflow state
   */
  private getTimeoutConfig(workflowState: string): StateTimeoutConfig {
    const config = this.defaultTimeouts.find(
      (t) => t.state.toLowerCase() === workflowState.toLowerCase()
    );

    if (config) {
      return config;
    }

    // Default timeout: 1 hour
    return {
      state: workflowState,
      expectedDurationMs: 60 * 60 * 1000,
    };
  }

  /**
   * Update timeout configuration
   */
  updateTimeoutConfig(config: StateTimeoutConfig[]): void {
    // Merge with defaults
    for (const newConfig of config) {
      const index = this.defaultTimeouts.findIndex(
        (t) => t.state.toLowerCase() === newConfig.state.toLowerCase()
      );
      if (index >= 0) {
        this.defaultTimeouts[index] = newConfig;
      } else {
        this.defaultTimeouts.push(newConfig);
      }
    }
    this.logger.log(`Updated timeout configuration for ${config.length} states`);
  }

  /**
   * Get current timeout configuration
   */
  getTimeoutConfigs(): StateTimeoutConfig[] {
    return [...this.defaultTimeouts];
  }

  /**
   * Calculate severity ratio for a hanging state
   */
  calculateSeverityRatio(durationMs: number, expectedDurationMs: number): number {
    return durationMs / expectedDurationMs;
  }

  /**
   * Determine if a hanging state is critical (>2x expected)
   */
  isCritical(durationMs: number, expectedDurationMs: number): boolean {
    return this.calculateSeverityRatio(durationMs, expectedDurationMs) > 2;
  }
}
