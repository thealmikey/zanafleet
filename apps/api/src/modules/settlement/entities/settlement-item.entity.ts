import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * SettlementItem Entity
 * Represents an individual earning included in a settlement batch
 *
 * Key characteristics:
 * - Immutable: No @UpdateDateColumn - items cannot be modified after creation
 * - Links to delivery for audit trail
 * - References ledger entry for financial reconciliation
 */
@Entity('settlement_items')
@Index(['batchId'])
@Index(['deliveryId'])
@Index(['ledgerEntryId'])
export class SettlementItemEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  batchId!: string;

  @Column('uuid')
  deliveryId!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  earningAmount!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  commissionAmount!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  netAmount!: string;

  @Column('uuid', { nullable: true })
  ledgerEntryId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  toDomain(): {
    itemId: string;
    batchId: string;
    deliveryId: string;
    earningAmount: number;
    commissionAmount: number;
    netAmount: number;
    ledgerEntryId: string | null;
    createdAt: Date;
  } {
    return {
      itemId: this.id,
      batchId: this.batchId,
      deliveryId: this.deliveryId,
      earningAmount: parseFloat(this.earningAmount),
      commissionAmount: parseFloat(this.commissionAmount),
      netAmount: parseFloat(this.netAmount),
      ledgerEntryId: this.ledgerEntryId,
      createdAt: this.createdAt,
    };
  }

  static fromDomain(data: {
    itemId: string;
    batchId: string;
    deliveryId: string;
    earningAmount: number;
    commissionAmount: number;
    netAmount: number;
    ledgerEntryId?: string | null;
    createdAt: Date;
  }): SettlementItemEntity {
    const entity = new SettlementItemEntity();
    entity.id = data.itemId;
    entity.batchId = data.batchId;
    entity.deliveryId = data.deliveryId;
    entity.earningAmount = data.earningAmount.toFixed(2);
    entity.commissionAmount = data.commissionAmount.toFixed(2);
    entity.netAmount = data.netAmount.toFixed(2);
    entity.ledgerEntryId = data.ledgerEntryId ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
