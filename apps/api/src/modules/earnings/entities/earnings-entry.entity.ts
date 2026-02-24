import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, Check } from 'typeorm';

/**
 * Commission type for earnings calculation
 */
export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
  TIERED = 'TIERED',
}

/**
 * Reference type for earnings source
 */
export enum EarningsReferenceType {
  DELIVERY = 'DELIVERY',
  TRIP = 'TRIP',
  JOB = 'JOB',
  INCENTIVE = 'INCENTIVE',
  ADJUSTMENT = 'ADJUSTMENT',
  BONUS = 'BONUS',
}

/**
 * EarningsEntry Entity
 *
 * Immutable per-workspace earnings records enabling:
 * - Multi-workspace earnings tracking per rider
 * - Per-workspace commission calculation
 * - Separate payouts per workspace
 * - Full audit trail
 *
 * Key characteristics:
 * - Immutable: No updates allowed, corrections via reversal entries
 * - Workspace-scoped: Every entry belongs to a workspace
 * - Partitioned: By periodDate for query performance
 * - Compliant: Full audit trail for accounting
 */
@Entity('earnings_entries')
@Index(['riderId', 'periodDate'])
@Index(['workspaceId', 'periodDate'])
@Index(['riderId', 'workspaceId'])
@Index(['jobId'])
@Index(['periodDate'])
@Check('gross_amount >= 0')
@Check('net_earnings >= 0')
export class EarningsEntryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  riderId!: string;

  /**
   * Workspace ID - CRITICAL for financial isolation
   * All earnings are scoped to a workspace for:
   * - Separate commission calculations
   * - Individual payout schedules
   * - Isolated financial reporting
   */
  @Column('uuid')
  workspaceId!: string;

  @Column('uuid')
  jobId!: string;

  /**
   * Gross amount earned from the job/service
   * This is the total amount before any deductions
   */
  @Column('decimal', { precision: 18, scale: 2 })
  grossAmount!: string;

  /**
   * Platform fee retained by ZanaFleet
   */
  @Column('decimal', { precision: 18, scale: 2 })
  platformFee!: string;

  /**
   * SACCO/Partner commission (for SACCO workspaces)
   */
  @Column('decimal', { precision: 18, scale: 2 })
  saccoCommission!: string;

  /**
   * Net earnings after all deductions (paid to rider)
   */
  @Column('decimal', { precision: 18, scale: 2 })
  netEarnings!: string;

  /**
   * Commission rate used for calculation
   */
  @Column('decimal', { precision: 5, scale: 4 })
  commissionRate!: string;

  /**
   * Type of commission calculation used
   */
  @Column('enum', { enum: CommissionType })
  commissionType!: CommissionType;

  @Column('varchar', { length: 3 })
  currency!: string;

  /**
   * Type of reference (delivery, trip, job, etc.)
   */
  @Column('enum', { enum: EarningsReferenceType })
  referenceType!: EarningsReferenceType;

  @Column('uuid')
  referenceId!: string;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /**
   * Period date for partitioning - first day of the month
   */
  @Column('date')
  periodDate!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    id: string;
    riderId: string;
    workspaceId: string;
    jobId: string;
    grossAmount: number;
    platformFee: number;
    saccoCommission: number;
    netEarnings: number;
    commissionRate: number;
    commissionType: CommissionType;
    currency: string;
    referenceType: EarningsReferenceType;
    referenceId: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    periodDate: Date;
  } {
    return {
      id: this.id,
      riderId: this.riderId,
      workspaceId: this.workspaceId,
      jobId: this.jobId,
      grossAmount: parseFloat(this.grossAmount),
      platformFee: parseFloat(this.platformFee),
      saccoCommission: parseFloat(this.saccoCommission),
      netEarnings: parseFloat(this.netEarnings),
      commissionRate: parseFloat(this.commissionRate),
      commissionType: this.commissionType,
      currency: this.currency,
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      metadata: this.metadata,
      createdAt: this.createdAt,
      periodDate: this.periodDate,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    id: string;
    riderId: string;
    workspaceId: string;
    jobId: string;
    grossAmount: number;
    platformFee: number;
    saccoCommission: number;
    netEarnings: number;
    commissionRate: number;
    commissionType: CommissionType;
    currency: string;
    referenceType: EarningsReferenceType;
    referenceId: string;
    metadata?: Record<string, unknown> | null;
    periodDate: Date;
  }): EarningsEntryEntity {
    const entity = new EarningsEntryEntity();
    entity.id = data.id;
    entity.riderId = data.riderId;
    entity.workspaceId = data.workspaceId;
    entity.jobId = data.jobId;
    entity.grossAmount = data.grossAmount.toFixed(2);
    entity.platformFee = data.platformFee.toFixed(2);
    entity.saccoCommission = data.saccoCommission.toFixed(2);
    entity.netEarnings = data.netEarnings.toFixed(2);
    entity.commissionRate = data.commissionRate.toFixed(4);
    entity.commissionType = data.commissionType;
    entity.currency = data.currency;
    entity.referenceType = data.referenceType;
    entity.referenceId = data.referenceId;
    entity.metadata = data.metadata ?? null;
    entity.periodDate = data.periodDate;
    return entity;
  }
}
