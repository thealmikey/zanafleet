/**
 * Revenue Distribution Events
 * Domain events for revenue distribution and earnings accrual
 */

import { AccountType } from '../dto/ledger.enums';
import { RevenueSplits } from '../dto/revenue-distribution.types';

export interface BaseEvent {
  eventId: string;
  eventVersion: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  occurredAt: Date;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface RevenueDistributedPayload {
  distributionId: string;
  deliveryId: string;
  totalAmount: number;
  currency: string;
  splits: RevenueSplits;
  ledgerEntryIds: string[];
  distributedAt: string;
}

export class RevenueDistributedEventV1 implements BaseEvent {
  readonly eventVersion = '1';
  readonly eventType = 'Ledger.Revenue.DistributedV1';
  readonly aggregateType = 'RevenueDistribution';

  eventId: string;
  aggregateId: string;
  occurredAt: Date;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  payload: RevenueDistributedPayload;

  constructor(data: {
    eventId: string;
    distributionId: string;
    deliveryId: string;
    totalAmount: number;
    currency: string;
    splits: RevenueSplits;
    ledgerEntryIds: string[];
    distributedAt: Date;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.eventId = data.eventId;
    this.aggregateId = data.distributionId;
    this.occurredAt = new Date();
    this.correlationId = data.correlationId;
    this.metadata = data.metadata;
    this.payload = {
      distributionId: data.distributionId,
      deliveryId: data.deliveryId,
      totalAmount: data.totalAmount,
      currency: data.currency,
      splits: data.splits,
      ledgerEntryIds: data.ledgerEntryIds,
      distributedAt: data.distributedAt.toISOString(),
    };
  }
}

export interface EarningsAccruedPayload {
  accountId: string;
  accountType: AccountType;
  amount: number;
  currency: string;
  referenceType: string;
  referenceId: string;
  balanceAfter: number;
  accruedAt: string;
}

export class EarningsAccruedEventV1 implements BaseEvent {
  readonly eventVersion = '1';
  readonly eventType = 'Ledger.Earnings.AccruedV1';
  readonly aggregateType = 'Earnings';

  eventId: string;
  aggregateId: string;
  occurredAt: Date;
  correlationId?: string;
  metadata?: Record<string, unknown>;
  payload: EarningsAccruedPayload;

  constructor(data: {
    eventId: string;
    accountId: string;
    accountType: AccountType;
    amount: number;
    currency: string;
    referenceType: string;
    referenceId: string;
    balanceAfter: number;
    accruedAt: Date;
    correlationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    this.eventId = data.eventId;
    this.aggregateId = data.accountId;
    this.occurredAt = new Date();
    this.correlationId = data.correlationId;
    this.metadata = data.metadata;
    this.payload = {
      accountId: data.accountId,
      accountType: data.accountType,
      amount: data.amount,
      currency: data.currency,
      referenceType: data.referenceType,
      referenceId: data.referenceId,
      balanceAfter: data.balanceAfter,
      accruedAt: data.accruedAt.toISOString(),
    };
  }
}
