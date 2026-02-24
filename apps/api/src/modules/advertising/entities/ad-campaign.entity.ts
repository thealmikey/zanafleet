import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AdCampaignStatus, AdPlacement, AdType, PricingModel } from '../dto/advertising.enums';
import { AdClick } from './ad-click.entity';
import { AdImpression } from './ad-impression.entity';

/**
 * AdCampaign Entity
 *
 * Represents an advertising campaign created by a business/organization.
 * Supports multiple ad types and pricing models.
 */
@Entity('ad_campaigns')
export class AdCampaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('uuid')
  createdById!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: AdType,
    default: AdType.SPONSORED_LISTING,
  })
  adType!: AdType;

  @Column({
    type: 'enum',
    enum: AdPlacement,
    default: AdPlacement.SEARCH_RESULTS,
  })
  placement!: AdPlacement;

  @Column({
    type: 'enum',
    enum: PricingModel,
    default: PricingModel.CPC,
  })
  pricingModel!: PricingModel;

  @Column('decimal', { precision: 18, scale: 2 })
  budget!: string;

  @Column('decimal', { precision: 18, scale: 2, default: '0' })
  spent!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  dailyBudget!: string;

  @Column('int', { default: 0 })
  dailyImpressions!: number;

  @Column('int', { default: 0 })
  totalImpressions!: number;

  @Column('int', { default: 0 })
  totalClicks!: number;

  @Column('decimal', { precision: 5, scale: 2 })
  bidAmount!: string;

  @Column({
    type: 'enum',
    enum: AdCampaignStatus,
    default: AdCampaignStatus.DRAFT,
  })
  status!: AdCampaignStatus;

  @Column({ type: 'timestamp', nullable: true })
  startDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate!: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  targeting!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  creativeUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  clickThroughUrl!: string | null;

  @Column('uuid', { nullable: true })
  paymentIntentId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToMany(() => AdImpression, (impression) => impression.campaign)
  impressions!: AdImpression[];

  @OneToMany(() => AdClick, (click) => click.campaign)
  clicks!: AdClick[];

  /**
   * Check if campaign is within its active date range
   */
  isActive(): boolean {
    if (this.status !== AdCampaignStatus.ACTIVE) return false;

    const now = new Date();
    if (this.startDate && now < this.startDate) return false;
    if (this.endDate && now > this.endDate) return false;

    return true;
  }

  /**
   * Check if campaign has remaining budget
   */
  hasBudget(): boolean {
    return parseFloat(this.spent) < parseFloat(this.budget);
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): number {
    return parseFloat(this.budget) - parseFloat(this.spent);
  }
}
