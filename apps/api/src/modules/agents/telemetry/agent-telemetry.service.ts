// =============================================================================
// Agent Telemetry Service - Observability for agent executions
// Emits events: triggered, decision_made, execution_started, execution_succeeded,
// execution_failed, blocked, consent_requested
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';

import { AgentTelemetryEvent, AgentTelemetryEventType } from '../types';

/**
 * Telemetry event payload
 */
interface TelemetryPayload {
  eventType: AgentTelemetryEventType;
  executionId: string;
  agentId: string;
  agentName: string;
  timestamp: Date;
  correlationId: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class AgentTelemetry {
  private readonly logger = new Logger(AgentTelemetry.name);
  private readonly eventBuffer: TelemetryPayload[] = [];

  /**
   * Emit a telemetry event
   */
  emit(event: AgentTelemetryEvent): void {
    const telemetryEvent: TelemetryPayload = {
      eventType: event.eventType,
      executionId: event.executionId,
      agentId: event.agentId,
      agentName: event.agentName,
      timestamp: event.timestamp,
      correlationId: event.correlationId,
      payload: event.payload,
    };

    // Buffer the event
    this.eventBuffer.push(telemetryEvent);

    // Log based on event type
    switch (event.eventType) {
      case AgentTelemetryEventType.TRIGGERED:
        this.logger.debug(
          `[TELEMETRY] Agent triggered: ${event.agentName} (${event.executionId})`,
        );
        break;
      case AgentTelemetryEventType.DECISION_MADE:
        this.logger.debug(
          `[TELEMETRY] Decision made: ${String(event.payload['decision'] ?? 'unknown')} for ${event.agentName}`,
        );
        break;
      case AgentTelemetryEventType.EXECUTION_STARTED:
        this.logger.debug(
          `[TELEMETRY] Execution started: ${event.agentName} (${event.executionId})`,
        );
        break;
      case AgentTelemetryEventType.EXECUTION_SUCCEEDED:
        this.logger.log(
          `[TELEMETRY] Execution succeeded: ${event.agentName} (${event.executionId})`,
        );
        break;
      case AgentTelemetryEventType.EXECUTION_FAILED:
        this.logger.error(
          `[TELEMETRY] Execution failed: ${event.agentName} (${event.executionId}) - ${String(event.payload['error'] ?? 'unknown')}`,
        );
        break;
      case AgentTelemetryEventType.BLOCKED:
        this.logger.warn(
          `[TELEMETRY] Execution blocked: ${event.agentName} (${event.executionId}) - ${String(event.payload['reason'] ?? 'unknown')}`,
        );
        break;
      case AgentTelemetryEventType.CONSENT_REQUESTED:
        this.logger.debug(
          `[TELEMETRY] Consent requested: ${event.agentName} (${event.executionId})`,
        );
        break;
    }

    // Flush buffer periodically (would integrate with metrics system in production)
    if (this.eventBuffer.length >= 100) {
      this.flush();
    }
  }

  /**
   * Flush buffered events to external system
   */
  flush(): void {
    if (this.eventBuffer.length === 0) {
      return;
    }

    // In production, this would send to:
    // - Prometheus/Metrics
    // - Neo4j for graph projections
    // - Audit log

    const events = [...this.eventBuffer];
    this.eventBuffer.length = 0;

    this.logger.debug(`[TELEMETRY] Flushed ${events.length} events`);
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(count = 10): TelemetryPayload[] {
    return this.eventBuffer.slice(-count);
  }
}
