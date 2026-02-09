import { FundingSource } from '../dto/incentive.enums';

/**
 * BudgetExhaustedEventV1
 * Domain event representing a campaign reaching its budget limit
 */
export class BudgetExhaustedEventV1 {
  readonly eventId: string;
  readonly eventType: 'BudgetExhaustedEvent-V1' = 'BudgetExhaustedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Campaign' = 'Campaign';

  readonly campaignId: string;
  readonly name: string;
  readonly fundingSource: FundingSource;
  readonly sponsorAccountId: string | null;
  readonly budgetTotal: number;
  readonly budgetUsed: number;
  readonly currency: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    campaignId: string;
    name: string;
    fundingSource: FundingSource;
    sponsorAccountId?: string | null;
    budgetTotal: number;
    budgetUsed: number;
    currency: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.campaignId = data.campaignId;
    this.aggregateId = data.campaignId;
    this.name = data.name;
    this.fundingSource = data.fundingSource;
    this.sponsorAccountId = data.sponsorAccountId ?? null;
    this.budgetTotal = data.budgetTotal;
    this.budgetUsed = data.budgetUsed;
    this.currency = data.currency;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'BudgetExhaustedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Campaign';
    campaignId: string;
    name: string;
    fundingSource: FundingSource;
    sponsorAccountId: string | null;
    budgetTotal: number;
    budgetUsed: number;
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
      campaignId: this.campaignId,
      name: this.name,
      fundingSource: this.fundingSource,
      sponsorAccountId: this.sponsorAccountId,
      budgetTotal: this.budgetTotal,
      budgetUsed: this.budgetUsed,
      currency: this.currency,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    campaignId: string;
    name: string;
    fundingSource: FundingSource;
    sponsorAccountId?: string | null;
    budgetTotal: number;
    budgetUsed: number;
    currency: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): BudgetExhaustedEventV1 {
    return new BudgetExhaustedEventV1({
      eventId: data.eventId,
      campaignId: data.campaignId,
      name: data.name,
      fundingSource: data.fundingSource,
      sponsorAccountId: data.sponsorAccountId,
      budgetTotal: data.budgetTotal,
      budgetUsed: data.budgetUsed,
      currency: data.currency,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
