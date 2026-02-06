import { TransactionType, TransactionStatus } from '../dto/transaction.enums';

/**
 * TransactionCreatedEventV1
 *
 * Append-only event emitted when a transaction is successfully created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class TransactionCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'TransactionCreatedEvent-V1' = 'TransactionCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Transaction' = 'Transaction';

  readonly transactionId: string;
  readonly sourceWalletId: string;
  readonly destinationWalletId: string;
  readonly amount: number;
  readonly type: TransactionType;
  readonly status: TransactionStatus;
  readonly linkedEventId: string | null;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    transactionId: string;
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    linkedEventId?: string | null;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.transactionId = data.transactionId;
    this.sourceWalletId = data.sourceWalletId;
    this.destinationWalletId = data.destinationWalletId;
    this.amount = data.amount;
    this.type = data.type;
    this.status = data.status;
    this.linkedEventId = data.linkedEventId ?? null;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.transactionId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'TransactionCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Transaction';
    transactionId: string;
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    linkedEventId: string | null;
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
      transactionId: this.transactionId,
      sourceWalletId: this.sourceWalletId,
      destinationWalletId: this.destinationWalletId,
      amount: this.amount,
      type: this.type,
      status: this.status,
      linkedEventId: this.linkedEventId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    transactionId: string;
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    linkedEventId?: string | null;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): TransactionCreatedEventV1 {
    return new TransactionCreatedEventV1({
      eventId: data.eventId,
      transactionId: data.transactionId,
      sourceWalletId: data.sourceWalletId,
      destinationWalletId: data.destinationWalletId,
      amount: data.amount,
      type: data.type,
      status: data.status,
      linkedEventId: data.linkedEventId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
