import { FundingSource } from '../dto/incentive.enums';

/**
 * SponsorshipConsumedEventV1
 * Domain event representing the consumption of sponsorship budget
 */
export class SponsorshipConsumedEventV1 {
  readonly eventId: string;
  readonly eventType = 'SponsorshipConsumedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Campaign' as const;

  readonly campaignId: string;
  readonly sponsorAccountId: string;
  readonly fundingSource: FundingSource;
  readonly amountConsumed: number;
  readonly currency: string;
  readonly budgetRemaining: number;
  readonly applicationId: string;
  readonly invoiceId: string;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    campaignId: string;
    sponsorAccountId: string;
    fundingSource: FundingSource;
    amountConsumed: number;
    currency: string;
    budgetRemaining: number;
    applicationId: string;
    invoiceId: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.campaignId = data.campaignId;
    this.aggregateId = data.campaignId;
    this.sponsorAccountId = data.sponsorAccountId;
    this.fundingSource = data.fundingSource;
    this.amountConsumed = data.amountConsumed;
    this.currency = data.currency;
    this.budgetRemaining = data.budgetRemaining;
    this.applicationId = data.applicationId;
    this.invoiceId = data.invoiceId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'SponsorshipConsumedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Campaign';
    campaignId: string;
    sponsorAccountId: string;
    fundingSource: FundingSource;
    amountConsumed: number;
    currency: string;
    budgetRemaining: number;
    applicationId: string;
    invoiceId: string;
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
      sponsorAccountId: this.sponsorAccountId,
      fundingSource: this.fundingSource,
      amountConsumed: this.amountConsumed,
      currency: this.currency,
      budgetRemaining: this.budgetRemaining,
      applicationId: this.applicationId,
      invoiceId: this.invoiceId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    campaignId: string;
    sponsorAccountId: string;
    fundingSource: FundingSource;
    amountConsumed: number;
    currency: string;
    budgetRemaining: number;
    applicationId: string;
    invoiceId: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): SponsorshipConsumedEventV1 {
    return new SponsorshipConsumedEventV1({
      eventId: data.eventId,
      campaignId: data.campaignId,
      sponsorAccountId: data.sponsorAccountId,
      fundingSource: data.fundingSource,
      amountConsumed: data.amountConsumed,
      currency: data.currency,
      budgetRemaining: data.budgetRemaining,
      applicationId: data.applicationId,
      invoiceId: data.invoiceId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
