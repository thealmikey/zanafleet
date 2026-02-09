import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { IncentiveType, CampaignStatus, FundingSource } from '../dto/incentive.enums';

/**
 * Campaign Entity
 * Represents a promotional campaign that provides incentives to users
 *
 * Key characteristics:
 * - Tracks budget usage and limits
 * - Supports different funding sources (platform, sponsors)
 * - eligibilityRules as JSONB allows flexible rule definitions
 */
@Entity('campaigns')
@Index(['status'])
@Index(['fundingSource'])
@Index(['sponsorAccountId'])
@Index(['validFrom', 'validUntil'])
export class CampaignEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('enum', { enum: IncentiveType })
  incentiveType!: IncentiveType;

  @Column('enum', { enum: CampaignStatus })
  status!: CampaignStatus;

  @Column('enum', { enum: FundingSource })
  fundingSource!: FundingSource;

  @Column('uuid', { nullable: true })
  sponsorAccountId!: string | null;

  @Column('decimal', { precision: 18, scale: 2 })
  discountValue!: string;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  maxDiscountAmount!: string | null;

  @Column('decimal', { precision: 18, scale: 2 })
  budgetTotal!: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  budgetUsed!: string;

  @Column('int', { nullable: true })
  usageLimit!: number | null;

  @Column('int', { default: 0 })
  usageCount!: number;

  @Column('jsonb', { nullable: true })
  eligibilityRules!: Record<string, unknown> | null;

  @Column({ type: 'timestamp with time zone' })
  validFrom!: Date;

  @Column({ type: 'timestamp with time zone' })
  validUntil!: Date;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    campaignId: string;
    name: string;
    description: string | null;
    incentiveType: IncentiveType;
    status: CampaignStatus;
    fundingSource: FundingSource;
    sponsorAccountId: string | null;
    discountValue: number;
    maxDiscountAmount: number | null;
    budgetTotal: number;
    budgetUsed: number;
    usageLimit: number | null;
    usageCount: number;
    eligibilityRules: Record<string, unknown> | null;
    validFrom: Date;
    validUntil: Date;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      campaignId: this.id,
      name: this.name,
      description: this.description,
      incentiveType: this.incentiveType,
      status: this.status,
      fundingSource: this.fundingSource,
      sponsorAccountId: this.sponsorAccountId,
      discountValue: parseFloat(this.discountValue),
      maxDiscountAmount: this.maxDiscountAmount ? parseFloat(this.maxDiscountAmount) : null,
      budgetTotal: parseFloat(this.budgetTotal),
      budgetUsed: parseFloat(this.budgetUsed),
      usageLimit: this.usageLimit,
      usageCount: this.usageCount,
      eligibilityRules: this.eligibilityRules,
      validFrom: this.validFrom,
      validUntil: this.validUntil,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    campaignId: string;
    name: string;
    description?: string | null;
    incentiveType: IncentiveType;
    status: CampaignStatus;
    fundingSource: FundingSource;
    sponsorAccountId?: string | null;
    discountValue: number;
    maxDiscountAmount?: number | null;
    budgetTotal: number;
    budgetUsed?: number;
    usageLimit?: number | null;
    usageCount?: number;
    eligibilityRules?: Record<string, unknown> | null;
    validFrom: Date;
    validUntil: Date;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): CampaignEntity {
    const entity = new CampaignEntity();
    entity.id = data.campaignId;
    entity.name = data.name;
    entity.description = data.description ?? null;
    entity.incentiveType = data.incentiveType;
    entity.status = data.status;
    entity.fundingSource = data.fundingSource;
    entity.sponsorAccountId = data.sponsorAccountId ?? null;
    entity.discountValue = data.discountValue.toFixed(2);
    entity.maxDiscountAmount = data.maxDiscountAmount != null ? data.maxDiscountAmount.toFixed(2) : null;
    entity.budgetTotal = data.budgetTotal.toFixed(2);
    entity.budgetUsed = (data.budgetUsed ?? 0).toFixed(2);
    entity.usageLimit = data.usageLimit ?? null;
    entity.usageCount = data.usageCount ?? 0;
    entity.eligibilityRules = data.eligibilityRules ?? null;
    entity.validFrom = data.validFrom;
    entity.validUntil = data.validUntil;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
