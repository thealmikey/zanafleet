/**
 * ProcessTimeoutEventV1
 *
 * Append-only event emitted when a process instance times out (SLA breach).
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Notification to relevant parties
 * 2. Escalation handling
 * 3. Process suspension or cancellation
 */
export class ProcessTimeoutEventV1 {
  readonly eventId: string;
  readonly eventType: 'Workflow.Process.TimeoutV1' = 'Workflow.Process.TimeoutV1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'ProcessInstance' = 'ProcessInstance';

  readonly instanceId: string;
  readonly definitionId: string;
  readonly currentState: string;
  readonly timeoutType: 'sla' | 'user_inactivity' | 'external_response';
  readonly expectedBy: Date;
  readonly timeoutMs: number;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    instanceId: string;
    definitionId: string;
    currentState: string;
    timeoutType: 'sla' | 'user_inactivity' | 'external_response';
    expectedBy: Date;
    timeoutMs: number;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.instanceId = data.instanceId;
    this.aggregateId = data.instanceId;
    this.definitionId = data.definitionId;
    this.currentState = data.currentState;
    this.timeoutType = data.timeoutType;
    this.expectedBy = data.expectedBy;
    this.timeoutMs = data.timeoutMs;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Workflow.Process.TimeoutV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'ProcessInstance';
    instanceId: string;
    definitionId: string;
    currentState: string;
    timeoutType: 'sla' | 'user_inactivity' | 'external_response';
    expectedBy: string;
    timeoutMs: number;
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
      currentState: this.currentState,
      timeoutType: this.timeoutType,
      expectedBy: this.expectedBy.toISOString(),
      timeoutMs: this.timeoutMs,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    instanceId: string;
    definitionId: string;
    currentState: string;
    timeoutType: 'sla' | 'user_inactivity' | 'external_response';
    expectedBy: string;
    timeoutMs: number;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): ProcessTimeoutEventV1 {
    return new ProcessTimeoutEventV1({
      eventId: data.eventId,
      instanceId: data.instanceId,
      definitionId: data.definitionId,
      currentState: data.currentState,
      timeoutType: data.timeoutType,
      expectedBy: new Date(data.expectedBy),
      timeoutMs: data.timeoutMs,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
