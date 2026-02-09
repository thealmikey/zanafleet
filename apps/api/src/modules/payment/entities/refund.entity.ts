import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { RefundStatus, RefundType, DisputeReason } from '../dto/payment.enums';

/**
 * RefundEntity
 * Tracks refunds linked to payments and optionally disputes.
 *
 * Key characteristics:
 * - Supports full and partial refunds
 * - Links to payment intent and optionally to dispute
 * - Tracks approval workflow and ledger compensation
 */
@Entity('refunds')
@Index(['paymentIntentId'])
@Index(['disputeId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['approvedBy'])
export class RefundEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  paymentIntentId!: string;

  @Column('uuid', { nullable: true })
  disputeId!: string | null;

  @Column('uuid', { nullable: true })
  deliveryId!: string | null;

  @Column('enum', { enum: RefundStatus })
  status!: RefundStatus;

  @Column('enum', { enum: RefundType })
  refundType!: RefundType;

  @Column('decimal', { precision: 18, scale: 2 })
  originalAmount!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  refundAmount!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('enum', { enum: DisputeReason })
  reason!: DisputeReason;

  @Column('text', { nullable: true })
  reasonDetails!: string | null;

  @Column('uuid')
  requestedBy!: string;

  @Column('uuid', { nullable: true })
  approvedBy!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approvedAt!: Date | null;

  @Column('varchar', { length: 255, nullable: true })
  providerRefundId!: string | null;

  @Column('uuid', { nullable: true })
  ledgerReversalId!: string | null;

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
    refundId: string;
    paymentIntentId: string;
    disputeId: string | null;
    deliveryId: string | null;
    status: RefundStatus;
    refundType: RefundType;
    originalAmount: number;
    refundAmount: number;
    currency: string;
    reason: DisputeReason;
    reasonDetails: string | null;
    requestedBy: string;
    approvedBy: string | null;
    approvedAt: Date | null;
    providerRefundId: string | null;
    ledgerReversalId: string | null;
    processedAt: Date | null;
    failureReason: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      refundId: this.id,
      paymentIntentId: this.paymentIntentId,
      disputeId: this.disputeId,
      deliveryId: this.deliveryId,
      status: this.status,
      refundType: this.refundType,
      originalAmount: parseFloat(this.originalAmount),
      refundAmount: parseFloat(this.refundAmount),
      currency: this.currency,
      reason: this.reason,
      reasonDetails: this.reasonDetails,
      requestedBy: this.requestedBy,
      approvedBy: this.approvedBy,
      approvedAt: this.approvedAt,
      providerRefundId: this.providerRefundId,
      ledgerReversalId: this.ledgerReversalId,
      processedAt: this.processedAt,
      failureReason: this.failureReason,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    refundId: string;
    paymentIntentId: string;
    disputeId?: string | null;
    deliveryId?: string | null;
    status: RefundStatus;
    refundType: RefundType;
    originalAmount: number;
    refundAmount: number;
    currency: string;
    reason: DisputeReason;
    reasonDetails?: string | null;
    requestedBy: string;
    approvedBy?: string | null;
    approvedAt?: Date | null;
    providerRefundId?: string | null;
    ledgerReversalId?: string | null;
    processedAt?: Date | null;
    failureReason?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): RefundEntity {
    const entity = new RefundEntity();
    entity.id = data.refundId;
    entity.paymentIntentId = data.paymentIntentId;
    entity.disputeId = data.disputeId ?? null;
    entity.deliveryId = data.deliveryId ?? null;
    entity.status = data.status;
    entity.refundType = data.refundType;
    entity.originalAmount = data.originalAmount.toFixed(2);
    entity.refundAmount = data.refundAmount.toFixed(2);
    entity.currency = data.currency;
    entity.reason = data.reason;
    entity.reasonDetails = data.reasonDetails ?? null;
    entity.requestedBy = data.requestedBy;
    entity.approvedBy = data.approvedBy ?? null;
    entity.approvedAt = data.approvedAt ?? null;
    entity.providerRefundId = data.providerRefundId ?? null;
    entity.ledgerReversalId = data.ledgerReversalId ?? null;
    entity.processedAt = data.processedAt ?? null;
    entity.failureReason = data.failureReason ?? null;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
