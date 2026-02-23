/**
 * WalletCreditedEventV1
 *
 * Append-only event emitted when funds are credited to a wallet.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class WalletCreditedEventV1 {
  readonly eventId: string;
  readonly eventType = 'WalletCreditedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Wallet' as const;

  readonly walletId: string;
  readonly amount: number;
  readonly newBalance: number;
  readonly reference?: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    walletId: string;
    amount: number;
    newBalance: number;
    reference?: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.walletId = data.walletId;
    this.amount = data.amount;
    this.newBalance = data.newBalance;
    this.reference = data.reference;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.walletId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'WalletCreditedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Wallet';
    walletId: string;
    amount: number;
    newBalance: number;
    reference?: string;
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
      walletId: this.walletId,
      amount: this.amount,
      newBalance: this.newBalance,
      reference: this.reference,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    walletId: string;
    amount: number;
    newBalance: number;
    reference?: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): WalletCreditedEventV1 {
    return new WalletCreditedEventV1({
      eventId: data.eventId,
      walletId: data.walletId,
      amount: data.amount,
      newBalance: data.newBalance,
      reference: data.reference,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
