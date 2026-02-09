import { IncentiveType, FundingSource } from '../dto/incentive.enums';

/**
 * IncentiveAppliedEventV1
 * Domain event representing the successful application of an incentive
 */
export class IncentiveAppliedEventV1 {
  readonly eventId: string;
  readonly eventType: 'IncentiveAppliedEvent-V1' = 'IncentiveAppliedEvent-V1';
  readonly eventVersion: '1.0.0' = '1.0.0';
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: 'IncentiveApplication' = 'IncentiveApplication';

  readonly applicationId: string;
  readonly campaignId: string;
  readonly invoiceId: string;
  readonly chargeId: string;
  readonly beneficiaryAccountId: string;
  readonly discountAmount: number;
  readonly currency: string;
  readonly incentiveType: IncentiveType;
  readonly fundingSource: FundingSource;

  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    applicationId: string;
    campaignId: string;
    invoiceId: string;
    chargeId: string;
    beneficiaryAccountId: string;
    discountAmount: number;
    currency: string;
    incentiveType: IncentiveType;
    fundingSource: FundingSource;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.applicationId = data.applicationId;
    this.aggregateId = data.applicationId;
    this.campaignId = data.campaignId;
    this.invoiceId = data.invoiceId;
    this.chargeId = data.chargeId;
    this.beneficiaryAccountId = data.beneficiaryAccountId;
    this.discountAmount = data.discountAmount;
    this.currency = data.currency;
    this.incentiveType = data.incentiveType;
    this.fundingSource = data.fundingSource;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'IncentiveAppliedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'IncentiveApplication';
    applicationId: string;
    campaignId: string;
    invoiceId: string;
    chargeId: string;
    beneficiaryAccountId: string;
    discountAmount: number;
    currency: string;
    incentiveType: IncentiveType;
    fundingSource: FundingSource;
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
      applicationId: this.applicationId,
      campaignId: this.campaignId,
      invoiceId: this.invoiceId,
      chargeId: this.chargeId,
      beneficiaryAccountId: this.beneficiaryAccountId,
      discountAmount: this.discountAmount,
      currency: this.currency,
      incentiveType: this.incentiveType,
      fundingSource: this.fundingSource,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    applicationId: string;
    campaignId: string;
    invoiceId: string;
    chargeId: string;
    beneficiaryAccountId: string;
    discountAmount: number;
    currency: string;
    incentiveType: IncentiveType;
    fundingSource: FundingSource;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): IncentiveAppliedEventV1 {
    return new IncentiveAppliedEventV1({
      eventId: data.eventId,
      applicationId: data.applicationId,
      campaignId: data.campaignId,
      invoiceId: data.invoiceId,
      chargeId: data.chargeId,
      beneficiaryAccountId: data.beneficiaryAccountId,
      discountAmount: data.discountAmount,
      currency: data.currency,
      incentiveType: data.incentiveType,
      fundingSource: data.fundingSource,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
