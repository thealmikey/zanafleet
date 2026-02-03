export class PersonaAssignedToActorEventV1 {
  readonly eventId: string;
  readonly eventType: 'PersonaAssignedToActorEvent-V1' = 'PersonaAssignedToActorEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'ActorPersonaAssignment' = 'ActorPersonaAssignment';

  readonly actorId: string;
  readonly workspaceId: string;
  readonly personaId: string;
  readonly assignedAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    actorId: string;
    workspaceId: string;
    personaId: string;
    assignedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.actorId = data.actorId;
    this.workspaceId = data.workspaceId;
    this.personaId = data.personaId;
    this.assignedAt = data.assignedAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.actorId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PersonaAssignedToActorEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'ActorPersonaAssignment';
    actorId: string;
    workspaceId: string;
    personaId: string;
    assignedAt: string;
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
      actorId: this.actorId,
      workspaceId: this.workspaceId,
      personaId: this.personaId,
      assignedAt: this.assignedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'PersonaAssignedToActorEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'ActorPersonaAssignment';
    actorId: string;
    workspaceId: string;
    personaId: string;
    assignedAt: string;
    correlationId?: string;
    causationId?: string;
  }): PersonaAssignedToActorEventV1 {
    return new PersonaAssignedToActorEventV1({
      eventId: data.eventId,
      actorId: data.actorId,
      workspaceId: data.workspaceId,
      personaId: data.personaId,
      assignedAt: new Date(data.assignedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
