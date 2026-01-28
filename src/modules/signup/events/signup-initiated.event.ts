import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { ActorType } from '../../actor/dto/actor.enums';

/**
 * JSON representation of SignUpInitiatedEventV1 for serialization
 */
export interface SignUpInitiatedEventV1JSON {
  eventId: string;
  eventType: 'SignUpInitiatedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'SignUpSession';
  sessionId: string;
  actorType: ActorType;
  expiresAt: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * SignUpInitiatedEventV1
 *
 * Emitted when a new sign-up session is successfully created and persisted.
 * Used for cross-module integration and projections.
 */
export class SignUpInitiatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'SignUpInitiatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'SignUpSession' as const;

  readonly sessionId: string;
  readonly actorType: ActorType;
  readonly expiresAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    sessionId: string;
    actorType: ActorType;
    expiresAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.sessionId = data.sessionId;
    this.actorType = data.actorType;
    this.expiresAt = data.expiresAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.sessionId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event for transport or logging
   */
  toJSON(): SignUpInitiatedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      sessionId: this.sessionId,
      actorType: this.actorType,
      expiresAt: this.expiresAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Hydrates event from serialized form
   */
  static fromJSON(data: SignUpInitiatedEventV1JSON): SignUpInitiatedEventV1 {
    return new SignUpInitiatedEventV1({
      eventId: data.eventId,
      sessionId: data.sessionId,
      actorType: data.actorType,
      expiresAt: new Date(data.expiresAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
