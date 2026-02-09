import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { SettlementStatus, PayoutMethod } from '../dto/settlement.enums';

/**
 * SettlementBatch Entity
 * Groups multiple rider earnings into a single payout operation
 *
 * Key characteristics:
 * - Aggregates earnings for a specific period
 * - Tracks commission deduction and net payout
 * - Links to payment provider for B2C disbursement
 */
@Entity('settlement_batches')
@Index(['riderAccountId'])
@Index(['status'])
@Index(['periodStart', 'periodEnd'])
@Index(['createdAt'])
export class SettlementBatchEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  riderAccountId!: string;

  @Column('enum', { enum: SettlementStatus })
  status!: SettlementStatus;

  @Column('decimal', { precision: 18, scale: 2 })
  totalEarnings!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  platformCommission!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  netPayout!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('enum', { enum: PayoutMethod })
  payoutMethod!: PayoutMethod;

  @Column('varchar', { length: 255, nullable: true })
  payoutReference!: string | null;

  @Column({ type: 'timestamp with time zone' })
  periodStart!: Date;

  @Column({ type: 'timestamp with time zone' })
  periodEnd!: Date;

  @Column('int')
  itemCount!: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processedAt!: Date | null;

  @Column('text', { nullable: true })
  failureReason!: string | null;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    batchId: string;
    riderAccountId: string;
    status: SettlementStatus;
    totalEarnings: number;
    platformCommission: number;
    netPayout: number;
    currency: string;
    payoutMethod: PayoutMethod;
    payoutReference: string | null;
    periodStart: Date;
    periodEnd: Date;
    itemCount: number;
    processedAt: Date | null;
    failureReason: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      batchId: this.id,
      riderAccountId: this.riderAccountId,
      status: this.status,
      totalEarnings: parseFloat(this.totalEarnings),
      platformCommission: parseFloat(this.platformCommission),
      netPayout: parseFloat(this.netPayout),
      currency: this.currency,
      payoutMethod: this.payoutMethod,
      payoutReference: this.payoutReference,
      periodStart: this.periodStart,
      periodEnd: this.periodEnd,
      itemCount: this.itemCount,
      processedAt: this.processedAt,
      failureReason: this.failureReason,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    batchId: string;
    riderAccountId: string;
    status: SettlementStatus;
    totalEarnings: number;
    platformCommission: number;
    netPayout: number;
    currency: string;
    payoutMethod: PayoutMethod;
    payoutReference?: string | null;
    periodStart: Date;
    periodEnd: Date;
    itemCount: number;
    processedAt?: Date | null;
    failureReason?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): SettlementBatchEntity {
    const entity = new SettlementBatchEntity();
    entity.id = data.batchId;
    entity.riderAccountId = data.riderAccountId;
    entity.status = data.status;
    entity.totalEarnings = data.totalEarnings.toFixed(2);
    entity.platformCommission = data.platformCommission.toFixed(2);
    entity.netPayout = data.netPayout.toFixed(2);
    entity.currency = data.currency;
    entity.payoutMethod = data.payoutMethod;
    entity.payoutReference = data.payoutReference ?? null;
    entity.periodStart = data.periodStart;
    entity.periodEnd = data.periodEnd;
    entity.itemCount = data.itemCount;
    entity.processedAt = data.processedAt ?? null;
    entity.failureReason = data.failureReason ?? null;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
