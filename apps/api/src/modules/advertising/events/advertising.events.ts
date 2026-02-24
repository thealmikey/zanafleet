import { IEvent } from '@nestjs/cqrs';

/**
 * AdCampaignActivatedEvent
 *
 * Published when an ad campaign is activated
 */
export class AdCampaignActivatedEvent implements IEvent {
  constructor(
    public readonly campaignId: string,
    public readonly workspaceId: string,
    public readonly adType: string,
    public readonly budget: string,
  ) {}
}

/**
 * AdCampaignPausedEvent
 *
 * Published when an ad campaign is paused
 */
export class AdCampaignPausedEvent implements IEvent {
  constructor(
    public readonly campaignId: string,
    public readonly workspaceId: string,
    public readonly reason?: string,
  ) {}
}

/**
 * AdCampaignCompletedEvent
 *
 * Published when an ad campaign is completed (budget exhausted or end date reached)
 */
export class AdCampaignCompletedEvent implements IEvent {
  constructor(
    public readonly campaignId: string,
    public readonly workspaceId: string,
    public readonly totalSpent: string,
    public readonly totalImpressions: number,
    public readonly totalClicks: number,
  ) {}
}

/**
 * AdImpressionRecordedEvent
 *
 * Published when an ad is displayed
 */
export class AdImpressionRecordedEvent implements IEvent {
  constructor(
    public readonly impressionId: string,
    public readonly campaignId: string,
    public readonly workspaceId: string,
    public readonly userId: string | null,
    public readonly placement: string,
  ) {}
}

/**
 * AdClickedEvent
 *
 * Published when a user clicks on an ad
 */
export class AdClickedEvent implements IEvent {
  constructor(
    public readonly clickId: string,
    public readonly impressionId: string,
    public readonly campaignId: string,
    public readonly workspaceId: string,
    public readonly userId: string | null,
  ) {}
}

/**
 * VisibilityTokenPurchasedEvent
 *
 * Published when a visibility token is purchased
 */
export class VisibilityTokenPurchasedEvent implements IEvent {
  constructor(
    public readonly tokenId: string,
    public readonly workspaceId: string,
    public readonly purchasedById: string,
    public readonly tokenType: string,
    public readonly targetType: string,
    public readonly targetId: string,
    public readonly price: string,
    public readonly durationDays: number,
  ) {}
}

/**
 * VisibilityTokenActivatedEvent
 *
 * Published when a visibility token becomes active
 */
export class VisibilityTokenActivatedEvent implements IEvent {
  constructor(
    public readonly tokenId: string,
    public readonly workspaceId: string,
    public readonly targetType: string,
    public readonly targetId: string,
    public readonly boostScore: string,
    public readonly expiresAt: Date,
  ) {}
}

/**
 * VisibilityTokenExpiredEvent
 *
 * Published when a visibility token expires
 */
export class VisibilityTokenExpiredEvent implements IEvent {
  constructor(
    public readonly tokenId: string,
    public readonly workspaceId: string,
    public readonly targetType: string,
    public readonly targetId: string,
  ) {}
}
