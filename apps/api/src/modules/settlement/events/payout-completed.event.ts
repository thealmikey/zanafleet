import { PayoutMethod } from '../dto/settlement.enums';

/**
 * PayoutCompletedEventV1
 * Domain event representing the successful completion of a payout
 */
export class PayoutCompletedEventV1 {
  readonly eventId: string;
  readonly eventType = 'PayoutCompletedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'SettlementBatch' as const;

  readonly batchId: string;
  readonly riderAccountId: string;
  readonly amount: number;
  readonly currency: string;
  readonly payoutMethod: PayoutMethod;
  readonly providerId: string;
  readonly providerReference: string;
  readonly processedAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    batchId: string;
    riderAccountId: string;
    amount: number;
    currency: string;
    payoutMethod: PayoutMethod;
    providerId: string;
    providerReference: string;
    processedAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.batchId = data.batchId;
    this.aggregateId = data.batchId;
    this.riderAccountId = data.riderAccountId;
    this.amount = data.amount;
    this.currency = data.currency;
    this.payoutMethod = data.payoutMethod;
    this.providerId = data.providerId;
    this.providerReference = data.providerReference;
    this.processedAt = data.processedAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PayoutCompletedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'SettlementBatch';
    batchId: string;
    riderAccountId: string;
    amount: number;
    currency: string;
    payoutMethod: PayoutMethod;
    providerId: string;
    providerReference: string;
    processedAt: string;
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
      batchId: this.batchId,
      riderAccountId: this.riderAccountId,
      amount: this.amount,
      currency: this.currency,
      payoutMethod: this.payoutMethod,
      providerId: this.providerId,
      providerReference: this.providerReference,
      processedAt: this.processedAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    batchId: string;
    riderAccountId: string;
    amount: number;
    currency: string;
    payoutMethod: PayoutMethod;
    providerId: string;
    providerReference: string;
    processedAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): PayoutCompletedEventV1 {
    return new PayoutCompletedEventV1({
      eventId: data.eventId,
      batchId: data.batchId,
      riderAccountId: data.riderAccountId,
      amount: data.amount,
      currency: data.currency,
      payoutMethod: data.payoutMethod,
      providerId: data.providerId,
      providerReference: data.providerReference,
      processedAt: new Date(data.processedAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
