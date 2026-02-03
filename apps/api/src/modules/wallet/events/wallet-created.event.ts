import { WalletType, OwnerType } from '../dto/wallet.enums';

/**
 * WalletCreatedEventV1
 *
 * Append-only event emitted when a wallet is successfully created.
 *
 * Event Contract:
 * - Immutable: Once created, event data cannot be modified
 * - Append-only: Only new events can be added to the event log
 * - Deterministic: Same input always produces same event
 * - Versioned: V1 suffix indicates event schema version
 */
export class WalletCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'WalletCreatedEvent-V1' = 'WalletCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Wallet' = 'Wallet';

  readonly walletId: string;
  readonly ownerId: string;
  readonly ownerType: OwnerType;
  readonly type: WalletType;
  readonly currency: string;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    walletId: string;
    ownerId: string;
    ownerType: OwnerType;
    type: WalletType;
    currency: string;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.walletId = data.walletId;
    this.ownerId = data.ownerId;
    this.ownerType = data.ownerType;
    this.type = data.type;
    this.currency = data.currency;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt || new Date();
    this.aggregateId = data.walletId;
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'WalletCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Wallet';
    walletId: string;
    ownerId: string;
    ownerType: OwnerType;
    type: WalletType;
    currency: string;
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
      walletId: this.walletId,
      ownerId: this.ownerId,
      ownerType: this.ownerType,
      type: this.type,
      currency: this.currency,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    walletId: string;
    ownerId: string;
    ownerType: OwnerType;
    type: WalletType;
    currency: string;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): WalletCreatedEventV1 {
    return new WalletCreatedEventV1({
      eventId: data.eventId,
      walletId: data.walletId,
      ownerId: data.ownerId,
      ownerType: data.ownerType,
      type: data.type,
      currency: data.currency,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
