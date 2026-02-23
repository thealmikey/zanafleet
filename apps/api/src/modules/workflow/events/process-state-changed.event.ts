import { GuardEvaluationResult } from '../entities/process-instance.entity';

/**
 * ProcessStateChangedEventV1
 *
 * Append-only event emitted when a process instance state transitions.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Neo4j projection (Process node in graph)
 * 2. Downstream event handlers (InteractionEngine, CapabilityOrchestrator)
 */
export class ProcessStateChangedEventV1 {
  readonly eventId: string;
  readonly eventType = 'Workflow.Process.StateChangedV1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'ProcessInstance' as const;

  readonly instanceId: string;
  readonly definitionId: string;
  readonly previousState: string;
  readonly newState: string;
  readonly context: Record<string, unknown>;
  readonly transitionId: string;
  readonly guardResults?: GuardEvaluationResult[];
  readonly triggeredBy: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    instanceId: string;
    definitionId: string;
    previousState: string;
    newState: string;
    context: Record<string, unknown>;
    transitionId: string;
    guardResults?: GuardEvaluationResult[];
    triggeredBy: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.instanceId = data.instanceId;
    this.aggregateId = data.instanceId;
    this.definitionId = data.definitionId;
    this.previousState = data.previousState;
    this.newState = data.newState;
    this.context = data.context;
    this.transitionId = data.transitionId;
    this.guardResults = data.guardResults;
    this.triggeredBy = data.triggeredBy;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Workflow.Process.StateChangedV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'ProcessInstance';
    instanceId: string;
    definitionId: string;
    previousState: string;
    newState: string;
    context: Record<string, unknown>;
    transitionId: string;
    guardResults?: GuardEvaluationResult[];
    triggeredBy: string;
    correlationId?: string;
    causationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      instanceId: this.instanceId,
      definitionId: this.definitionId,
      previousState: this.previousState,
      newState: this.newState,
      context: this.context,
      transitionId: this.transitionId,
      guardResults: this.guardResults,
      triggeredBy: this.triggeredBy,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    instanceId: string;
    definitionId: string;
    previousState: string;
    newState: string;
    context: Record<string, unknown>;
    transitionId: string;
    guardResults?: GuardEvaluationResult[];
    triggeredBy: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): ProcessStateChangedEventV1 {
    return new ProcessStateChangedEventV1({
      eventId: data.eventId,
      instanceId: data.instanceId,
      definitionId: data.definitionId,
      previousState: data.previousState,
      newState: data.newState,
      context: data.context,
      transitionId: data.transitionId,
      guardResults: data.guardResults,
      triggeredBy: data.triggeredBy,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
