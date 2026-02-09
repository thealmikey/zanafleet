import { SettlementStatus, PayoutMethod } from '../dto/settlement.enums';

/**
 * SettlementBatchCreatedEventV1
 * Domain event representing the successful creation of a settlement batch
 */
export class SettlementBatchCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'SettlementBatchCreatedEvent-V1' = 'SettlementBatchCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'SettlementBatch' = 'SettlementBatch';

  readonly batchId: string;
  readonly riderAccountId: string;
  readonly status: SettlementStatus;
  readonly totalEarnings: number;
  readonly platformCommission: number;
  readonly netPayout: number;
  readonly currency: string;
  readonly payoutMethod: PayoutMethod;
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly itemCount: number;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    batchId: string;
    riderAccountId: string;
    status: SettlementStatus;
    totalEarnings: number;
    platformCommission: number;
    netPayout: number;
    currency: string;
    payoutMethod: PayoutMethod;
    periodStart: Date;
    periodEnd: Date;
    itemCount: number;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.batchId = data.batchId;
    this.aggregateId = data.batchId;
    this.riderAccountId = data.riderAccountId;
    this.status = data.status;
    this.totalEarnings = data.totalEarnings;
    this.platformCommission = data.platformCommission;
    this.netPayout = data.netPayout;
    this.currency = data.currency;
    this.payoutMethod = data.payoutMethod;
    this.periodStart = data.periodStart;
    this.periodEnd = data.periodEnd;
    this.itemCount = data.itemCount;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'SettlementBatchCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'SettlementBatch';
    batchId: string;
    riderAccountId: string;
    status: SettlementStatus;
    totalEarnings: number;
    platformCommission: number;
    netPayout: number;
    currency: string;
    payoutMethod: PayoutMethod;
    periodStart: string;
    periodEnd: string;
    itemCount: number;
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
      status: this.status,
      totalEarnings: this.totalEarnings,
      platformCommission: this.platformCommission,
      netPayout: this.netPayout,
      currency: this.currency,
      payoutMethod: this.payoutMethod,
      periodStart: this.periodStart.toISOString(),
      periodEnd: this.periodEnd.toISOString(),
      itemCount: this.itemCount,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    batchId: string;
    riderAccountId: string;
    status: SettlementStatus;
    totalEarnings: number;
    platformCommission: number;
    netPayout: number;
    currency: string;
    payoutMethod: PayoutMethod;
    periodStart: string;
    periodEnd: string;
    itemCount: number;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): SettlementBatchCreatedEventV1 {
    return new SettlementBatchCreatedEventV1({
      eventId: data.eventId,
      batchId: data.batchId,
      riderAccountId: data.riderAccountId,
      status: data.status,
      totalEarnings: data.totalEarnings,
      platformCommission: data.platformCommission,
      netPayout: data.netPayout,
      currency: data.currency,
      payoutMethod: data.payoutMethod,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      itemCount: data.itemCount,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
