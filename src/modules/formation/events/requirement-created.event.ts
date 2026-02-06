import { RequirementType } from '../dto/formation.enums';

export class RequirementCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'RequirementCreatedEvent-V1' = 'RequirementCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Requirement' = 'Requirement';
  readonly requirementId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly type: RequirementType;
  readonly key: string;
  readonly description: string;
  readonly blocking: boolean;
  readonly satisfied: boolean;
  readonly targetEntityId: string | null;
  readonly createdAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    requirementId: string;
    entityType: string;
    entityId: string;
    type: RequirementType;
    key: string;
    description: string;
    blocking?: boolean;
    satisfied?: boolean;
    targetEntityId?: string | null;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.requirementId = data.requirementId;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.type = data.type;
    this.key = data.key;
    this.description = data.description;
    this.blocking = data.blocking ?? true;
    this.satisfied = data.satisfied ?? false;
    this.targetEntityId = data.targetEntityId ?? null;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.requirementId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'RequirementCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Requirement';
    requirementId: string;
    entityType: string;
    entityId: string;
    type: RequirementType;
    key: string;
    description: string;
    blocking: boolean;
    satisfied: boolean;
    targetEntityId: string | null;
    createdAt: string;
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
      requirementId: this.requirementId,
      entityType: this.entityType,
      entityId: this.entityId,
      type: this.type,
      key: this.key,
      description: this.description,
      blocking: this.blocking,
      satisfied: this.satisfied,
      targetEntityId: this.targetEntityId,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'RequirementCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Requirement';
    requirementId: string;
    entityType: string;
    entityId: string;
    type: RequirementType;
    key: string;
    description: string;
    blocking: boolean;
    satisfied: boolean;
    targetEntityId: string | null;
    createdAt: string;
    correlationId?: string;
    causationId?: string;
  }): RequirementCreatedEventV1 {
    return new RequirementCreatedEventV1({
      eventId: data.eventId,
      requirementId: data.requirementId,
      entityType: data.entityType,
      entityId: data.entityId,
      type: data.type,
      key: data.key,
      description: data.description,
      blocking: data.blocking,
      satisfied: data.satisfied,
      targetEntityId: data.targetEntityId,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
