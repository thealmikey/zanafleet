export class RequirementSatisfiedEventV1 {
  readonly eventId: string;
  readonly eventType = 'RequirementSatisfiedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Requirement' as const;
  readonly requirementId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly key: string;
  readonly satisfiedAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    requirementId: string;
    entityType: string;
    entityId: string;
    key: string;
    satisfiedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.requirementId = data.requirementId;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.key = data.key;
    this.satisfiedAt = data.satisfiedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.requirementId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'RequirementSatisfiedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Requirement';
    requirementId: string;
    entityType: string;
    entityId: string;
    key: string;
    satisfiedAt: string;
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
      key: this.key,
      satisfiedAt: this.satisfiedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'RequirementSatisfiedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Requirement';
    requirementId: string;
    entityType: string;
    entityId: string;
    key: string;
    satisfiedAt: string;
    correlationId?: string;
    causationId?: string;
  }): RequirementSatisfiedEventV1 {
    return new RequirementSatisfiedEventV1({
      eventId: data.eventId,
      requirementId: data.requirementId,
      entityType: data.entityType,
      entityId: data.entityId,
      key: data.key,
      satisfiedAt: new Date(data.satisfiedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
