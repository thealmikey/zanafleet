import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../dto/ledger.enums';

export interface LedgerEntryData {
  ledgerEntryId: string;
  accountId: string;
  entryType: LedgerEntryType;
  category: LedgerCategory;
  amount: number;
  currency: string;
  balanceAfter: number;
}

/**
 * LedgerEntryRecordedEventV1
 * Domain event representing the successful recording of balanced ledger entries
 * Follows the BaseEvent contract pattern
 */
export class LedgerEntryRecordedEventV1 {
  readonly eventId: string;
  readonly eventType = 'LedgerEntryRecordedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Ledger' as const;

  readonly referenceType: LedgerReferenceType;
  readonly referenceId: string;
  readonly entries: LedgerEntryData[];
  readonly totalAmount: number;
  readonly currency: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    referenceType: LedgerReferenceType;
    referenceId: string;
    entries: LedgerEntryData[];
    totalAmount: number;
    currency: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.referenceType = data.referenceType;
    this.referenceId = data.referenceId;
    this.aggregateId = data.referenceId;
    this.entries = data.entries;
    this.totalAmount = data.totalAmount;
    this.currency = data.currency;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'LedgerEntryRecordedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Ledger';
    referenceType: LedgerReferenceType;
    referenceId: string;
    entries: LedgerEntryData[];
    totalAmount: number;
    currency: string;
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
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      entries: this.entries,
      totalAmount: this.totalAmount,
      currency: this.currency,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    referenceType: LedgerReferenceType;
    referenceId: string;
    entries: LedgerEntryData[];
    totalAmount: number;
    currency: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): LedgerEntryRecordedEventV1 {
    return new LedgerEntryRecordedEventV1({
      eventId: data.eventId,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      entries: data.entries,
      totalAmount: data.totalAmount,
      currency: data.currency,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
