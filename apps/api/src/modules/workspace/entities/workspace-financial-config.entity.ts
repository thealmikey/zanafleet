import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { CommissionType } from '@api/modules/earnings/entities/earnings-entry.entity';

/**
 * Payout schedule options
 */
export enum PayoutSchedule {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

/**
 * Payout method options
 */
export enum PayoutMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
}

/**
 * WorkspaceFinancialConfig Entity
 *
 * Per-workspace financial settings enabling:
 * - Different commission rates per workspace
 * - Different payout schedules per workspace
 * - Workspace-specific risk controls
 * - Stripe Connect configuration
 *
 * This enables the multi-workspace earnings model where:
 * - A rider can work for multiple SACCOs/businesses
 * - Each workspace has its own commission structure
 * - Payouts can be separate per workspace or aggregated
 */
@Entity('workspace_financial_configs')
@Index(['workspaceId'], { unique: true })
export class WorkspaceFinancialConfigEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  workspaceId!: string;

  /**
   * Platform commission rate (ZanaFleet's cut)
   * Default: 10% (0.10)
   */
  @Column('decimal', { precision: 5, scale: 4 })
  platformCommissionRate!: string;

  @Column('enum', { enum: CommissionType })
  platformCommissionType!: CommissionType;

  /**
   * SACCO/Partner commission rate (for SACCO workspaces)
   * This is the commission retained by the partner
   */
  @Column('decimal', { precision: 5, scale: 4, nullable: true })
  saccoCommissionRate!: string | null;

  @Column('enum', { enum: CommissionType, nullable: true })
  saccoCommissionType!: CommissionType | null;

  /**
   * When to process payouts for this workspace
   */
  @Column('enum', { enum: PayoutSchedule })
  payoutSchedule!: PayoutSchedule;

  /**
   * Day of week for weekly payouts (0 = Sunday, 6 = Saturday)
   */
  @Column('int', { nullable: true })
  payoutDayOfWeek!: number | null;

  /**
   * Day of month for monthly payouts (1-28)
   */
  @Column('int', { nullable: true })
  payoutDayOfMonth!: number | null;

  /**
   * Minimum amount required before payout is triggered
   */
  @Column('decimal', { precision: 18, scale: 2 })
  minimumPayoutThreshold!: string;

  @Column('enum', { enum: PayoutMethod })
  payoutMethod!: PayoutMethod;

  /**
   * Stripe Connect account ID for this workspace
   * Used for marketplace-style payouts via Stripe
   */
  @Column('varchar', { length: 50, nullable: true })
  stripeConnectAccountId!: string | null;

  @Column('boolean')
  stripeConnectEnabled!: boolean;

  /**
   * Enable risk checks before payout
   */
  @Column('boolean')
  riskCheckEnabled!: boolean;

  /**
   * Maximum payout amount per transaction
   */
  @Column('decimal', { precision: 18, scale: 2 })
  maxPayoutAmount!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    id: string;
    workspaceId: string;
    platformCommissionRate: number;
    platformCommissionType: CommissionType;
    saccoCommissionRate: number | null;
    saccoCommissionType: CommissionType | null;
    payoutSchedule: PayoutSchedule;
    payoutDayOfWeek: number | null;
    payoutDayOfMonth: number | null;
    minimumPayoutThreshold: number;
    payoutMethod: PayoutMethod;
    stripeConnectAccountId: string | null;
    stripeConnectEnabled: boolean;
    riskCheckEnabled: boolean;
    maxPayoutAmount: number;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      workspaceId: this.workspaceId,
      platformCommissionRate: parseFloat(this.platformCommissionRate),
      platformCommissionType: this.platformCommissionType,
      saccoCommissionRate: this.saccoCommissionRate ? parseFloat(this.saccoCommissionRate) : null,
      saccoCommissionType: this.saccoCommissionType,
      payoutSchedule: this.payoutSchedule,
      payoutDayOfWeek: this.payoutDayOfWeek,
      payoutDayOfMonth: this.payoutDayOfMonth,
      minimumPayoutThreshold: parseFloat(this.minimumPayoutThreshold),
      payoutMethod: this.payoutMethod,
      stripeConnectAccountId: this.stripeConnectAccountId,
      stripeConnectEnabled: this.stripeConnectEnabled,
      riskCheckEnabled: this.riskCheckEnabled,
      maxPayoutAmount: parseFloat(this.maxPayoutAmount),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    id: string;
    workspaceId: string;
    platformCommissionRate: number;
    platformCommissionType: CommissionType;
    saccoCommissionRate?: number | null;
    saccoCommissionType?: CommissionType | null;
    payoutSchedule: PayoutSchedule;
    payoutDayOfWeek?: number | null;
    payoutDayOfMonth?: number | null;
    minimumPayoutThreshold: number;
    payoutMethod: PayoutMethod;
    stripeConnectAccountId?: string | null;
    stripeConnectEnabled?: boolean;
    riskCheckEnabled?: boolean;
    maxPayoutAmount: number;
  }): WorkspaceFinancialConfigEntity {
    const entity = new WorkspaceFinancialConfigEntity();
    entity.id = data.id;
    entity.workspaceId = data.workspaceId;
    entity.platformCommissionRate = data.platformCommissionRate.toFixed(4);
    entity.platformCommissionType = data.platformCommissionType;
    entity.saccoCommissionRate = data.saccoCommissionRate?.toFixed(4) ?? null;
    entity.saccoCommissionType = data.saccoCommissionType ?? null;
    entity.payoutSchedule = data.payoutSchedule;
    entity.payoutDayOfWeek = data.payoutDayOfWeek ?? null;
    entity.payoutDayOfMonth = data.payoutDayOfMonth ?? null;
    entity.minimumPayoutThreshold = data.minimumPayoutThreshold.toFixed(2);
    entity.payoutMethod = data.payoutMethod;
    entity.stripeConnectAccountId = data.stripeConnectAccountId ?? null;
    entity.stripeConnectEnabled = data.stripeConnectEnabled ?? false;
    entity.riskCheckEnabled = data.riskCheckEnabled ?? true;
    entity.maxPayoutAmount = data.maxPayoutAmount.toFixed(2);
    return entity;
  }
}
