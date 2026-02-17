import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

import { ChargeType } from '../dto/billing.enums';

/**
 * Charge Entity
 * Represents an individual line item on an invoice
 *
 * Key characteristics:
 * - Immutable: No @UpdateDateColumn - charges cannot be modified after creation
 * - Amount = quantity * unitPrice (computed by caller)
 * - Negative amounts allowed for DISCOUNT and SUBSIDY types
 */
@Entity('charges')
@Index(['invoiceId'])
@Index(['chargeType'])
export class ChargeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  invoiceId!: string;

  @Column('enum', { enum: ChargeType })
  chargeType!: ChargeType;

  @Column('varchar', { length: 255, nullable: true })
  description!: string | null;

  @Column('decimal', { precision: 18, scale: 2 })
  amount!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('decimal', { precision: 10, scale: 4, default: 1 })
  quantity!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  unitPrice!: string;

  @Column('simple-json', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  toDomain(): {
    chargeId: string;
    invoiceId: string;
    chargeType: ChargeType;
    description: string | null;
    amount: number;
    currency: string;
    quantity: number;
    unitPrice: number;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  } {
    return {
      chargeId: this.id,
      invoiceId: this.invoiceId,
      chargeType: this.chargeType,
      description: this.description,
      amount: parseFloat(this.amount),
      currency: this.currency,
      quantity: parseFloat(this.quantity),
      unitPrice: parseFloat(this.unitPrice),
      metadata: this.metadata,
      createdAt: this.createdAt,
    };
  }

  static fromDomain(data: {
    chargeId: string;
    invoiceId: string;
    chargeType: ChargeType;
    description?: string | null;
    amount: number;
    currency: string;
    quantity?: number;
    unitPrice: number;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): ChargeEntity {
    const entity = new ChargeEntity();
    entity.id = data.chargeId;
    entity.invoiceId = data.invoiceId;
    entity.chargeType = data.chargeType;
    entity.description = data.description ?? null;
    entity.amount = data.amount.toFixed(2);
    entity.currency = data.currency;
    entity.quantity = (data.quantity ?? 1).toFixed(4);
    entity.unitPrice = data.unitPrice.toFixed(2);
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
