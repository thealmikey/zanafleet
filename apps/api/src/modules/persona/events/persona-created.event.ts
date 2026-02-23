export class PersonaCreatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'PersonaCreatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Persona' as const;

  readonly personaId: string;
  readonly name: string;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    personaId: string;
    name: string;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.personaId = data.personaId;
    this.name = data.name;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.personaId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PersonaCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Persona';
    personaId: string;
    name: string;
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
      personaId: this.personaId,
      name: this.name,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    eventType: 'PersonaCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Persona';
    personaId: string;
    name: string;
    createdAt: string;
    correlationId?: string;
    causationId?: string;
  }): PersonaCreatedEventV1 {
    return new PersonaCreatedEventV1({
      eventId: data.eventId,
      personaId: data.personaId,
      name: data.name,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
