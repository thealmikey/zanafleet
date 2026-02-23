import { FormationState } from '../dto/formation.enums';

export class FormationStatusChangedEventV1 {
  readonly eventId: string;
  readonly eventType = 'FormationStatusChangedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'FormationStatus' as const;
  readonly entityType: string;
  readonly entityId: string;
  readonly previousState: FormationState;
  readonly newState: FormationState;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    entityType: string;
    entityId: string;
    previousState: FormationState;
    newState: FormationState;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.previousState = data.previousState;
    this.newState = data.newState;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.entityId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'FormationStatusChangedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'FormationStatus';
    entityType: string;
    entityId: string;
    previousState: FormationState;
    newState: FormationState;
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
      entityType: this.entityType,
      entityId: this.entityId,
      previousState: this.previousState,
      newState: this.newState,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'FormationStatusChangedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'FormationStatus';
    entityType: string;
    entityId: string;
    previousState: FormationState;
    newState: FormationState;
    correlationId?: string;
    causationId?: string;
  }): FormationStatusChangedEventV1 {
    return new FormationStatusChangedEventV1({
      eventId: data.eventId,
      entityType: data.entityType,
      entityId: data.entityId,
      previousState: data.previousState,
      newState: data.newState,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
