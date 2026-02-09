import { Injectable, Logger } from '@nestjs/common';

import { CampaignStatus, IncentiveType } from '../dto/incentive.enums';
import { CampaignEntity } from '../entities/campaign.entity';

export interface EligibilityContext {
  accountId: string;
  deliveryId?: string;
  businessId?: string;
  timestamp: Date;
  orderAmount?: number;
  isFirstOrder?: boolean;
  referralCode?: string;
  metadata?: Record<string, unknown>;
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  campaign?: CampaignEntity;
}

/**
 * IncentiveEligibilityService
 * Evaluates if a delivery/customer qualifies for an incentive based on eligibilityRules
 */
@Injectable()
export class IncentiveEligibilityService {
  private readonly logger = new Logger(IncentiveEligibilityService.name);

  evaluateEligibility(
    campaign: CampaignEntity,
    context: EligibilityContext,
  ): EligibilityResult {
    const campaignDomain = campaign.toDomain();

    if (campaignDomain.status !== CampaignStatus.ACTIVE) {
      return {
        eligible: false,
        reason: `Campaign is not active (status: ${campaignDomain.status})`,
      };
    }

    const now = context.timestamp;
    if (now < campaignDomain.validFrom || now > campaignDomain.validUntil) {
      return {
        eligible: false,
        reason: 'Campaign is outside valid date range',
      };
    }

    if (campaignDomain.budgetUsed >= campaignDomain.budgetTotal) {
      return {
        eligible: false,
        reason: 'Campaign budget is exhausted',
      };
    }

    if (
      campaignDomain.usageLimit !== null &&
      campaignDomain.usageCount >= campaignDomain.usageLimit
    ) {
      return {
        eligible: false,
        reason: 'Campaign usage limit reached',
      };
    }

    const rules = campaignDomain.eligibilityRules;
    if (rules) {
      const rulesResult = this.evaluateRules(rules, context, campaignDomain.incentiveType);
      if (!rulesResult.eligible) {
        return rulesResult;
      }
    }

    return {
      eligible: true,
      campaign,
    };
  }

  private evaluateRules(
    rules: Record<string, unknown>,
    context: EligibilityContext,
    _incentiveType: IncentiveType,
  ): EligibilityResult {
    if (rules.minOrderAmount !== undefined) {
      const minAmount = rules.minOrderAmount as number;
      if (context.orderAmount !== undefined && context.orderAmount < minAmount) {
        return {
          eligible: false,
          reason: `Order amount ${context.orderAmount} is below minimum ${minAmount}`,
        };
      }
    }

    if (rules.maxOrderAmount !== undefined) {
      const maxAmount = rules.maxOrderAmount as number;
      if (context.orderAmount !== undefined && context.orderAmount > maxAmount) {
        return {
          eligible: false,
          reason: `Order amount ${context.orderAmount} exceeds maximum ${maxAmount}`,
        };
      }
    }

    if (rules.firstOrderOnly === true) {
      if (context.isFirstOrder !== true) {
        return {
          eligible: false,
          reason: 'Campaign is for first orders only',
        };
      }
    }

    if (rules.requiredReferralCode !== undefined) {
      const requiredCode = rules.requiredReferralCode as string;
      if (context.referralCode !== requiredCode) {
        return {
          eligible: false,
          reason: 'Invalid or missing referral code',
        };
      }
    }

    if (rules.allowedBusinessIds !== undefined) {
      const allowedIds = rules.allowedBusinessIds as string[];
      if (context.businessId && !allowedIds.includes(context.businessId)) {
        return {
          eligible: false,
          reason: 'Business is not eligible for this campaign',
        };
      }
    }

    if (rules.excludedBusinessIds !== undefined) {
      const excludedIds = rules.excludedBusinessIds as string[];
      if (context.businessId && excludedIds.includes(context.businessId)) {
        return {
          eligible: false,
          reason: 'Business is excluded from this campaign',
        };
      }
    }

    if (rules.dayOfWeek !== undefined) {
      const allowedDays = rules.dayOfWeek as number[];
      const currentDay = context.timestamp.getDay();
      if (!allowedDays.includes(currentDay)) {
        return {
          eligible: false,
          reason: `Campaign not valid on day ${currentDay}`,
        };
      }
    }

    if (rules.timeRange !== undefined) {
      const timeRange = rules.timeRange as { start: string; end: string };
      const currentTime = context.timestamp.toTimeString().slice(0, 5);
      if (currentTime < timeRange.start || currentTime > timeRange.end) {
        return {
          eligible: false,
          reason: `Campaign not valid at time ${currentTime}`,
        };
      }
    }

    this.logger.debug(`All eligibility rules passed for account ${context.accountId}`);

    return { eligible: true };
  }
}
