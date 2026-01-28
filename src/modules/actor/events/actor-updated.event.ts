import { BaseEvent } from '../../../core/event-bus';

/**
 * Changes associated with an ActorUpdatedEvent-V1
 */
export type ActorUpdatedEventV1Changes = {
  roles?: readonly string[];
  linkedWallets?: readonly string[];
};

/**
 * JSON structure for ActorUpdatedEvent-V1
 */
export interface ActorUpdatedEventV1JSON {
  eventId: string;
  eventType: 'ActorUpdatedEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'Actor';
  actorId: string;
  changes: {
    roles?: readonly string[];
    linkedWallets?: readonly string[];
  };
  updatedAt: string;
  correlationId?: string;
  causationId?: string;
}

/**
 * ActorUpdatedEventV1
 * Immutable fact that an actor was updated.
 */
export class ActorUpdatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType: 'ActorUpdatedEvent-V1' = 'ActorUpdatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Actor' = 'Actor';

  readonly actorId: string;
  readonly changes: Readonly<ActorUpdatedEventV1Changes>;
  readonly updatedAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    actorId: string;
    changes: ActorUpdatedEventV1Changes;
    updatedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.actorId = data.actorId;
    this.aggregateId = data.actorId;
    this.changes = Object.freeze({ ...data.changes });
    this.updatedAt = data.updatedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  /**
   * Serializes event to plain object for transport
   */
  toJSON(): ActorUpdatedEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      actorId: this.actorId,
      changes: this.changes,
      updatedAt: this.updatedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  /**
   * Deserializes event from plain object
   */
  static fromJSON(data: ActorUpdatedEventV1JSON): ActorUpdatedEventV1 {
    return new ActorUpdatedEventV1({
      eventId: data.eventId,
      actorId: data.actorId,
      changes: data.changes,
      updatedAt: new Date(data.updatedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
