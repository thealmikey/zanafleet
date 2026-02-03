import { BaseEvent } from '@api/core/event-bus/interfaces/base-event.interface';

/**
 * JSON representation of SignUpFinalizedEventV1 for serialization
 */
export interface SignUpFinalizedEventV1JSON {
  eventId: string;
  eventType: 'SignUpFinalizedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'SignUpSession';
  sessionId: string;
  actorId: string;
  workspaceId: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * SignUpFinalizedEventV1
 *
 * Emitted when a sign-up session is successfully finalized and an actor created.
 */
export class SignUpFinalizedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'SignUpFinalizedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'SignUpSession' as const;

  readonly sessionId: string;
  readonly actorId: string;
  readonly workspaceId: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    sessionId: string;
    actorId: string;
    workspaceId: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.sessionId = data.sessionId;
    this.actorId = data.actorId;
    this.workspaceId = data.workspaceId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.sessionId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event for transport or logging
   */
  toJSON(): SignUpFinalizedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      sessionId: this.sessionId,
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Hydrates event from serialized form
   */
  static fromJSON(data: SignUpFinalizedEventV1JSON): SignUpFinalizedEventV1 {
    return new SignUpFinalizedEventV1({
      eventId: data.eventId,
      sessionId: data.sessionId,
      actorId: data.actorId,
      workspaceId: data.workspaceId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
