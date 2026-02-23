import { AccountType, AccountStatus } from '../dto/account.enums';

/**
 * AccountCreatedEventV1
 * Domain event representing the successful creation of an account
 * Follows the BaseEvent contract pattern
 */
export class AccountCreatedEventV1 {
  readonly eventId: string;
  readonly eventType = 'AccountCreatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Account' as const;

  readonly accountId: string;
  readonly externalId: string;
  readonly accountType: AccountType;
  readonly status: AccountStatus;
  readonly currency: string;
  readonly metadata: Record<string, unknown> | null;
  readonly createdAt: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    accountId: string;
    externalId: string;
    accountType: AccountType;
    status: AccountStatus;
    currency: string;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.accountId = data.accountId;
    this.aggregateId = data.accountId;
    this.externalId = data.externalId;
    this.accountType = data.accountType;
    this.status = data.status;
    this.currency = data.currency;
    this.metadata = data.metadata ?? null;
    this.createdAt = data.createdAt;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'AccountCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Account';
    accountId: string;
    externalId: string;
    accountType: AccountType;
    status: AccountStatus;
    currency: string;
    metadata: Record<string, unknown> | null;
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
      accountId: this.accountId,
      externalId: this.externalId,
      accountType: this.accountType,
      status: this.status,
      currency: this.currency,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    accountId: string;
    externalId: string;
    accountType: AccountType;
    status: AccountStatus;
    currency: string;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): AccountCreatedEventV1 {
    return new AccountCreatedEventV1({
      eventId: data.eventId,
      accountId: data.accountId,
      externalId: data.externalId,
      accountType: data.accountType,
      status: data.status,
      currency: data.currency,
      metadata: data.metadata,
      createdAt: new Date(data.createdAt),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
