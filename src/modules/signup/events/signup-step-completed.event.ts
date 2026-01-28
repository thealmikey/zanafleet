import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';

/**
 * JSON representation of SignUpStepCompletedEventV1 for serialization
 */
export interface SignUpStepCompletedEventV1JSON {
  eventId: string;
  eventType: 'SignUpStepCompletedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'SignUpSession';
  sessionId: string;
  stepName: string;
  changes: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
}

/**
 * SignUpStepCompletedEventV1
 *
 * Emitted when a sign-up step is successfully completed and session updated.
 */
export class SignUpStepCompletedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'SignUpStepCompletedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'SignUpSession' as const;

  readonly sessionId: string;
  readonly stepName: string;
  readonly changes: Record<string, unknown>;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    sessionId: string;
    stepName: string;
    changes: Record<string, unknown>;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.sessionId = data.sessionId;
    this.stepName = data.stepName;
    this.changes = data.changes;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.sessionId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event for transport or logging
   */
  toJSON(): SignUpStepCompletedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      sessionId: this.sessionId,
      stepName: this.stepName,
      changes: this.changes,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Hydrates event from serialized form
   */
  static fromJSON(
    data: SignUpStepCompletedEventV1JSON,
  ): SignUpStepCompletedEventV1 {
    return new SignUpStepCompletedEventV1({
      eventId: data.eventId,
      sessionId: data.sessionId,
      stepName: data.stepName,
      changes: data.changes,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
