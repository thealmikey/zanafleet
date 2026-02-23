export interface CapabilityGrantedToPersonaEventV1JSON {
  eventId: string;
  eventType: 'CapabilityGrantedToPersonaEvent-V1';
  eventVersion: '1.0.0';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'Capability';
  personaId: string;
  capabilityId: string;
  grantedAt: string;
  correlationId?: string;
  causationId?: string;
}

export class CapabilityGrantedToPersonaEventV1 {
  readonly eventId: string;
  readonly eventType = 'CapabilityGrantedToPersonaEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Capability' as const;
  readonly personaId: string;
  readonly capabilityId: string;
  readonly grantedAt: Date;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    personaId: string;
    capabilityId: string;
    grantedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.personaId = data.personaId;
    this.capabilityId = data.capabilityId;
    this.grantedAt = data.grantedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.capabilityId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): CapabilityGrantedToPersonaEventV1JSON {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      personaId: this.personaId,
      capabilityId: this.capabilityId,
      grantedAt: this.grantedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: CapabilityGrantedToPersonaEventV1JSON): CapabilityGrantedToPersonaEventV1 {
    return new CapabilityGrantedToPersonaEventV1({
      eventId: data.eventId,
      personaId: data.personaId,
      capabilityId: data.capabilityId,
      grantedAt: new Date(data.grantedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
