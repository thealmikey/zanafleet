import { BusinessType } from '@zanafleet/contracts';

/**
 * BusinessOnboardedEventV1
 *
 * Append-only event emitted when a business is successfully onboarded.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 *
 * This event triggers:
 * 1. Postgres persistence (Business entity)
 * 2. Neo4j projection (Business node in graph)
 * 3. Any other downstream event handlers
 */
export class BusinessOnboardedEventV1 {
  readonly eventId: string;
  readonly eventType: 'Business.Business.OnboardedV1' = 'Business.Business.OnboardedV1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Business' = 'Business';

  readonly businessId: string;
  readonly businessName: string;
  readonly phone: string;
  readonly location: string;
  readonly businessType: BusinessType;
  readonly email: string | null;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    businessId: string;
    businessName: string;
    phone: string;
    location: string;
    businessType: BusinessType;
    email: string | null;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.businessId = data.businessId;
    this.aggregateId = data.businessId;
    this.businessName = data.businessName;
    this.phone = data.phone;
    this.location = data.location;
    this.businessType = data.businessType;
    this.email = data.email;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'Business.Business.OnboardedV1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Business';
    businessId: string;
    businessName: string;
    phone: string;
    location: string;
    businessType: BusinessType;
    email: string | null;
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
      businessId: this.businessId,
      businessName: this.businessName,
      phone: this.phone,
      location: this.location,
      businessType: this.businessType,
      email: this.email,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    businessId: string;
    businessName: string;
    phone: string;
    location: string;
    businessType: BusinessType;
    email: string | null;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): BusinessOnboardedEventV1 {
    return new BusinessOnboardedEventV1({
      eventId: data.eventId,
      businessId: data.businessId,
      businessName: data.businessName,
      phone: data.phone,
      location: data.location,
      businessType: data.businessType,
      email: data.email,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
