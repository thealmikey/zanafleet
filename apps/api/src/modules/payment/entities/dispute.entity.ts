import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { DisputeStatus, DisputeReason, DisputeResolutionType } from '../dto/payment.enums';

/**
 * DisputeEntity
 * Tracks disputes linked to deliveries and payments.
 *
 * Key characteristics:
 * - Supports state machine: OPEN -> UNDER_REVIEW -> RESOLVED/ESCALATED
 * - Links to delivery and optionally to payment intent
 * - Tracks resolution details and audit trail
 */
@Entity('disputes')
@Index(['deliveryId'])
@Index(['paymentIntentId'])
@Index(['status'])
@Index(['createdAt'])
@Index(['openedBy'])
export class DisputeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  deliveryId!: string;

  @Column('uuid', { nullable: true })
  paymentIntentId!: string | null;

  @Column('enum', { enum: DisputeStatus })
  status!: DisputeStatus;

  @Column('enum', { enum: DisputeReason })
  reason!: DisputeReason;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('decimal', { precision: 18, scale: 2 })
  disputedAmount!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('uuid')
  openedBy!: string;

  @Column('uuid', { nullable: true })
  assignedTo!: string | null;

  @Column('enum', { enum: DisputeResolutionType, nullable: true })
  resolutionType!: DisputeResolutionType | null;

  @Column('text', { nullable: true })
  resolutionNotes!: string | null;

  @Column('uuid', { nullable: true })
  resolvedBy!: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resolvedAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  escalatedAt!: Date | null;

  @Column('text', { nullable: true })
  escalationReason!: string | null;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    disputeId: string;
    deliveryId: string;
    paymentIntentId: string | null;
    status: DisputeStatus;
    reason: DisputeReason;
    description: string | null;
    disputedAmount: number;
    currency: string;
    openedBy: string;
    assignedTo: string | null;
    resolutionType: DisputeResolutionType | null;
    resolutionNotes: string | null;
    resolvedBy: string | null;
    resolvedAt: Date | null;
    escalatedAt: Date | null;
    escalationReason: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      disputeId: this.id,
      deliveryId: this.deliveryId,
      paymentIntentId: this.paymentIntentId,
      status: this.status,
      reason: this.reason,
      description: this.description,
      disputedAmount: parseFloat(this.disputedAmount),
      currency: this.currency,
      openedBy: this.openedBy,
      assignedTo: this.assignedTo,
      resolutionType: this.resolutionType,
      resolutionNotes: this.resolutionNotes,
      resolvedBy: this.resolvedBy,
      resolvedAt: this.resolvedAt,
      escalatedAt: this.escalatedAt,
      escalationReason: this.escalationReason,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    disputeId: string;
    deliveryId: string;
    paymentIntentId?: string | null;
    status: DisputeStatus;
    reason: DisputeReason;
    description?: string | null;
    disputedAmount: number;
    currency: string;
    openedBy: string;
    assignedTo?: string | null;
    resolutionType?: DisputeResolutionType | null;
    resolutionNotes?: string | null;
    resolvedBy?: string | null;
    resolvedAt?: Date | null;
    escalatedAt?: Date | null;
    escalationReason?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): DisputeEntity {
    const entity = new DisputeEntity();
    entity.id = data.disputeId;
    entity.deliveryId = data.deliveryId;
    entity.paymentIntentId = data.paymentIntentId ?? null;
    entity.status = data.status;
    entity.reason = data.reason;
    entity.description = data.description ?? null;
    entity.disputedAmount = data.disputedAmount.toFixed(2);
    entity.currency = data.currency;
    entity.openedBy = data.openedBy;
    entity.assignedTo = data.assignedTo ?? null;
    entity.resolutionType = data.resolutionType ?? null;
    entity.resolutionNotes = data.resolutionNotes ?? null;
    entity.resolvedBy = data.resolvedBy ?? null;
    entity.resolvedAt = data.resolvedAt ?? null;
    entity.escalatedAt = data.escalatedAt ?? null;
    entity.escalationReason = data.escalationReason ?? null;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
