/**
 * DeliveryPricingAppliedEventV1
 *
 * Append-only event emitted when pricing is calculated and applied to a delivery.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class DeliveryPricingAppliedEventV1 {
  readonly eventId: string;
  readonly eventType: 'DeliveryPricingAppliedEvent-V1' = 'DeliveryPricingAppliedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Delivery' = 'Delivery';

  readonly deliveryId: string;
  readonly baseFee: number;
  readonly distanceFee: number;
  readonly serviceFee: number;
  readonly tax: number;
  readonly surgeMultiplier: number;
  readonly totalCharges: number;
  readonly currency: string;
  readonly appliedAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    baseFee: number;
    distanceFee: number;
    serviceFee: number;
    tax: number;
    surgeMultiplier: number;
    totalCharges: number;
    currency: string;
    appliedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.baseFee = data.baseFee;
    this.distanceFee = data.distanceFee;
    this.serviceFee = data.serviceFee;
    this.tax = data.tax;
    this.surgeMultiplier = data.surgeMultiplier;
    this.totalCharges = data.totalCharges;
    this.currency = data.currency;
    this.appliedAt = data.appliedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'DeliveryPricingAppliedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    baseFee: number;
    distanceFee: number;
    serviceFee: number;
    tax: number;
    surgeMultiplier: number;
    totalCharges: number;
    currency: string;
    appliedAt: string;
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
      deliveryId: this.deliveryId,
      baseFee: this.baseFee,
      distanceFee: this.distanceFee,
      serviceFee: this.serviceFee,
      tax: this.tax,
      surgeMultiplier: this.surgeMultiplier,
      totalCharges: this.totalCharges,
      currency: this.currency,
      appliedAt: this.appliedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    baseFee: number;
    distanceFee: number;
    serviceFee: number;
    tax: number;
    surgeMultiplier: number;
    totalCharges: number;
    currency: string;
    appliedAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): DeliveryPricingAppliedEventV1 {
    return new DeliveryPricingAppliedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      baseFee: data.baseFee,
      distanceFee: data.distanceFee,
      serviceFee: data.serviceFee,
      tax: data.tax,
      surgeMultiplier: data.surgeMultiplier,
      totalCharges: data.totalCharges,
      currency: data.currency,
      appliedAt: new Date(data.appliedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
