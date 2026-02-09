import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ChargeType } from '@api/modules/billing';
import { CampaignEntity } from '../entities/campaign.entity';
import { IncentiveApplicationEntity } from '../entities/incentive-application.entity';
import { CampaignStatus, IncentiveType, FundingSource } from '../dto/incentive.enums';
import {
  IncentiveEligibilityService,
  EligibilityContext,
} from './incentive-eligibility.service';

export interface ApplicableIncentive {
  campaign: CampaignEntity;
  discountAmount: number;
}

export interface IncentiveChargeResult {
  chargeId: string;
  chargeType: ChargeType;
  description: string;
  amount: number;
  currency: string;
  quantity: number;
  unitPrice: number;
  metadata: {
    campaignId: string;
    applicationId: string;
    incentiveType: IncentiveType;
    fundingSource: FundingSource;
  };
}

export interface ApplyIncentiveResult {
  applicationId: string;
  campaignId: string;
  chargeId: string;
  discountAmount: number;
  budgetExhausted: boolean;
}

/**
 * IncentiveEngineService
 * Main service for finding and applying incentives to invoices
 */
@Injectable()
export class IncentiveEngineService {
  private readonly logger = new Logger(IncentiveEngineService.name);

  constructor(
    @InjectRepository(CampaignEntity)
    private readonly campaignRepository: Repository<CampaignEntity>,
    @InjectRepository(IncentiveApplicationEntity)
    private readonly applicationRepository: Repository<IncentiveApplicationEntity>,
    private readonly eligibilityService: IncentiveEligibilityService,
  ) {}

  async findApplicableIncentives(
    context: EligibilityContext,
  ): Promise<ApplicableIncentive[]> {
    const now = context.timestamp;

    const activeCampaigns = await this.campaignRepository.find({
      where: {
        status: CampaignStatus.ACTIVE,
        validFrom: LessThanOrEqual(now),
        validUntil: MoreThanOrEqual(now),
      },
      order: { discountValue: 'DESC' },
    });

    const applicableIncentives: ApplicableIncentive[] = [];

    for (const campaign of activeCampaigns) {
      const result = this.eligibilityService.evaluateEligibility(campaign, context);

      if (result.eligible) {
        const discountAmount = this.calculateDiscountAmount(
          campaign,
          context.orderAmount ?? 0,
        );

        if (discountAmount > 0) {
          applicableIncentives.push({
            campaign,
            discountAmount,
          });
        }
      }
    }

    this.logger.debug(
      `Found ${applicableIncentives.length} applicable incentives for account ${context.accountId}`,
    );

    return applicableIncentives;
  }

  calculateDiscountAmount(campaign: CampaignEntity, baseAmount: number): number {
    const campaignDomain = campaign.toDomain();
    let discount = 0;

    switch (campaignDomain.incentiveType) {
      case IncentiveType.PERCENTAGE_DISCOUNT:
        discount = this.roundToTwoDecimals(baseAmount * (campaignDomain.discountValue / 100));
        break;

      case IncentiveType.FIXED_DISCOUNT:
        discount = campaignDomain.discountValue;
        break;

      case IncentiveType.FREE_DELIVERY:
        discount = baseAmount;
        break;

      case IncentiveType.RIDER_BONUS:
      case IncentiveType.REFERRAL_REWARD:
        discount = campaignDomain.discountValue;
        break;
    }

    if (campaignDomain.maxDiscountAmount !== null) {
      discount = Math.min(discount, campaignDomain.maxDiscountAmount);
    }

    const remainingBudget = campaignDomain.budgetTotal - campaignDomain.budgetUsed;
    discount = Math.min(discount, remainingBudget);

    return this.roundToTwoDecimals(discount);
  }

  createIncentiveCharge(
    campaign: CampaignEntity,
    applicationId: string,
    discountAmount: number,
    currency: string,
  ): IncentiveChargeResult {
    const campaignDomain = campaign.toDomain();
    const chargeId = uuidv4();

    return {
      chargeId,
      chargeType: ChargeType.DISCOUNT,
      description: `${campaignDomain.name} (${campaignDomain.incentiveType})`,
      amount: -Math.abs(discountAmount),
      currency,
      quantity: 1,
      unitPrice: -Math.abs(discountAmount),
      metadata: {
        campaignId: campaignDomain.campaignId,
        applicationId,
        incentiveType: campaignDomain.incentiveType,
        fundingSource: campaignDomain.fundingSource,
      },
    };
  }

  async applyToInvoice(
    campaignId: string,
    invoiceId: string,
    chargeId: string,
    beneficiaryAccountId: string,
    discountAmount: number,
    currency: string,
  ): Promise<ApplyIncentiveResult> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const applicationId = uuidv4();
    const now = new Date();

    const application = IncentiveApplicationEntity.fromDomain({
      applicationId,
      campaignId,
      invoiceId,
      chargeId,
      beneficiaryAccountId,
      discountAmount,
      currency,
      appliedAt: now,
    });

    await this.applicationRepository.save(application);

    const budgetExhausted = await this.trackBudgetBurn(campaignId, discountAmount);

    this.logger.log(
      `Applied incentive ${applicationId} from campaign ${campaignId} to invoice ${invoiceId}: -${discountAmount} ${currency}`,
    );

    return {
      applicationId,
      campaignId,
      chargeId,
      discountAmount,
      budgetExhausted,
    };
  }

  async trackBudgetBurn(campaignId: string, amount: number): Promise<boolean> {
    const campaign = await this.campaignRepository.findOne({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const campaignDomain = campaign.toDomain();
    const newBudgetUsed = this.roundToTwoDecimals(campaignDomain.budgetUsed + amount);
    const newUsageCount = campaignDomain.usageCount + 1;

    const budgetExhausted = newBudgetUsed >= campaignDomain.budgetTotal;
    const usageLimitReached =
      campaignDomain.usageLimit !== null && newUsageCount >= campaignDomain.usageLimit;

    const updates: { budgetUsed: string; usageCount: number; status?: CampaignStatus } = {
      budgetUsed: newBudgetUsed.toFixed(2),
      usageCount: newUsageCount,
    };

    if (budgetExhausted || usageLimitReached) {
      updates.status = CampaignStatus.EXHAUSTED;
      this.logger.log(`Campaign ${campaignId} is now EXHAUSTED`);
    }

    await this.campaignRepository.update(campaignId, updates);

    return budgetExhausted || usageLimitReached;
  }

  async getCampaign(campaignId: string): Promise<CampaignEntity | null> {
    return this.campaignRepository.findOne({
      where: { id: campaignId },
    });
  }

  async getApplicationsByInvoice(invoiceId: string): Promise<IncentiveApplicationEntity[]> {
    return this.applicationRepository.find({
      where: { invoiceId },
    });
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
