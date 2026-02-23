import { PayoutMethod } from '../dto/settlement.enums';

/**
 * PayoutInitiatedEventV1
 * Domain event representing the initiation of a payout to a rider
 */
export class PayoutInitiatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'PayoutInitiatedEvent-V1' as const;
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
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PayoutInitiatedEvent-V1';
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
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): PayoutInitiatedEventV1 {
    return new PayoutInitiatedEventV1({
      eventId: data.eventId,
      batchId: data.batchId,
      riderAccountId: data.riderAccountId,
      amount: data.amount,
      currency: data.currency,
      payoutMethod: data.payoutMethod,
      providerId: data.providerId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
