/**
 * DropoffConfirmedEventV1
 *
 * Append-only event emitted when a rider confirms dropoff of a delivery.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export interface DropoffProofData {
  photoUrl?: string;
  signature?: string;
  recipientName?: string;
  notes?: string;
}

export class DropoffConfirmedEventV1 {
  readonly eventId: string;
  readonly eventType: 'DropoffConfirmedEvent-V1' = 'DropoffConfirmedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Delivery' = 'Delivery';

  readonly deliveryId: string;
  readonly riderId: string;
  readonly proofData: DropoffProofData | null;
  readonly confirmedAt: Date;

  readonly correlationId?: string;

  constructor(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    proofData?: DropoffProofData | null;
    confirmedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
  }) {
    this.eventId = data.eventId;
    this.deliveryId = data.deliveryId;
    this.riderId = data.riderId;
    this.proofData = data.proofData ?? null;
    this.confirmedAt = data.confirmedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.aggregateId = data.deliveryId;
    this.correlationId = data.correlationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'DropoffConfirmedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Delivery';
    deliveryId: string;
    riderId: string;
    proofData: DropoffProofData | null;
    confirmedAt: string;
    correlationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      deliveryId: this.deliveryId,
      riderId: this.riderId,
      proofData: this.proofData,
      confirmedAt: this.confirmedAt.toISOString(),
      correlationId: this.correlationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    deliveryId: string;
    riderId: string;
    proofData: DropoffProofData | null;
    confirmedAt: string;
    occurredAt: string;
    correlationId?: string;
  }): DropoffConfirmedEventV1 {
    return new DropoffConfirmedEventV1({
      eventId: data.eventId,
      deliveryId: data.deliveryId,
      riderId: data.riderId,
      proofData: data.proofData,
      confirmedAt: new Date(data.confirmedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
    });
  }
}
