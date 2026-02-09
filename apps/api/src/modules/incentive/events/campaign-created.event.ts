import { IncentiveType, CampaignStatus, FundingSource } from '../dto/incentive.enums';

/**
 * CampaignCreatedEventV1
 * Domain event representing the successful creation of a campaign
 */
export class CampaignCreatedEventV1 {
  readonly eventId: string;
  readonly eventType: 'CampaignCreatedEvent-V1' = 'CampaignCreatedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'Campaign' = 'Campaign';

  readonly campaignId: string;
  readonly name: string;
  readonly incentiveType: IncentiveType;
  readonly status: CampaignStatus;
  readonly fundingSource: FundingSource;
  readonly sponsorAccountId: string | null;
  readonly discountValue: number;
  readonly budgetTotal: number;
  readonly validFrom: Date;
  readonly validUntil: Date;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    campaignId: string;
    name: string;
    incentiveType: IncentiveType;
    status: CampaignStatus;
    fundingSource: FundingSource;
    sponsorAccountId?: string | null;
    discountValue: number;
    budgetTotal: number;
    validFrom: Date;
    validUntil: Date;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.campaignId = data.campaignId;
    this.aggregateId = data.campaignId;
    this.name = data.name;
    this.incentiveType = data.incentiveType;
    this.status = data.status;
    this.fundingSource = data.fundingSource;
    this.sponsorAccountId = data.sponsorAccountId ?? null;
    this.discountValue = data.discountValue;
    this.budgetTotal = data.budgetTotal;
    this.validFrom = data.validFrom;
    this.validUntil = data.validUntil;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'CampaignCreatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'Campaign';
    campaignId: string;
    name: string;
    incentiveType: IncentiveType;
    status: CampaignStatus;
    fundingSource: FundingSource;
    sponsorAccountId: string | null;
    discountValue: number;
    budgetTotal: number;
    validFrom: string;
    validUntil: string;
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
      incentiveType: this.incentiveType,
      status: this.status,
      fundingSource: this.fundingSource,
      sponsorAccountId: this.sponsorAccountId,
      discountValue: this.discountValue,
      budgetTotal: this.budgetTotal,
      validFrom: this.validFrom.toISOString(),
      validUntil: this.validUntil.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    campaignId: string;
    name: string;
    incentiveType: IncentiveType;
    status: CampaignStatus;
    fundingSource: FundingSource;
    sponsorAccountId?: string | null;
    discountValue: number;
    budgetTotal: number;
    validFrom: string;
    validUntil: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): CampaignCreatedEventV1 {
    return new CampaignCreatedEventV1({
      eventId: data.eventId,
      campaignId: data.campaignId,
      name: data.name,
      incentiveType: data.incentiveType,
      status: data.status,
      fundingSource: data.fundingSource,
      sponsorAccountId: data.sponsorAccountId,
      discountValue: data.discountValue,
      budgetTotal: data.budgetTotal,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
