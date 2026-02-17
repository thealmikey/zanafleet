import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

import { InvoiceStatus } from '../dto/billing.enums';

/**
 * Invoice Entity
 * Aggregates charges into a payable amount
 *
 * Key characteristics:
 * - grandTotal = subtotal - totalDiscounts + totalTax
 * - Links to delivery/order for context
 * - Triggers PaymentIntent creation when issued
 */
@Entity('invoices')
@Index(['payerAccountId'])
@Index(['payeeAccountId'])
@Index(['deliveryId'])
@Index(['orderId'])
@Index(['status'])
@Index(['createdAt'])
export class InvoiceEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  payerAccountId!: string;

  @Column('uuid')
  payeeAccountId!: string;

  @Column('uuid', { nullable: true })
  deliveryId!: string | null;

  @Column('uuid', { nullable: true })
  orderId!: string | null;

  @Column('enum', { enum: InvoiceStatus })
  status!: InvoiceStatus;

  @Column('decimal', { precision: 18, scale: 2 })
  subtotal!: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  totalDiscounts!: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  totalTax!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  grandTotal!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  dueDate!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt!: Date | null;

  @Column('simple-json', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    deliveryId: string | null;
    orderId: string | null;
    status: InvoiceStatus;
    subtotal: number;
    totalDiscounts: number;
    totalTax: number;
    grandTotal: number;
    currency: string;
    dueDate: Date | null;
    paidAt: Date | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      invoiceId: this.id,
      payerAccountId: this.payerAccountId,
      payeeAccountId: this.payeeAccountId,
      deliveryId: this.deliveryId,
      orderId: this.orderId,
      status: this.status,
      subtotal: parseFloat(this.subtotal),
      totalDiscounts: parseFloat(this.totalDiscounts),
      totalTax: parseFloat(this.totalTax),
      grandTotal: parseFloat(this.grandTotal),
      currency: this.currency,
      dueDate: this.dueDate,
      paidAt: this.paidAt,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    invoiceId: string;
    payerAccountId: string;
    payeeAccountId: string;
    deliveryId?: string | null;
    orderId?: string | null;
    status: InvoiceStatus;
    subtotal: number;
    totalDiscounts?: number;
    totalTax?: number;
    grandTotal: number;
    currency: string;
    dueDate?: Date | null;
    paidAt?: Date | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): InvoiceEntity {
    const entity = new InvoiceEntity();
    entity.id = data.invoiceId;
    entity.payerAccountId = data.payerAccountId;
    entity.payeeAccountId = data.payeeAccountId;
    entity.deliveryId = data.deliveryId ?? null;
    entity.orderId = data.orderId ?? null;
    entity.status = data.status;
    entity.subtotal = data.subtotal.toFixed(2);
    entity.totalDiscounts = (data.totalDiscounts ?? 0).toFixed(2);
    entity.totalTax = (data.totalTax ?? 0).toFixed(2);
    entity.grandTotal = data.grandTotal.toFixed(2);
    entity.currency = data.currency;
    entity.dueDate = data.dueDate ?? null;
    entity.paidAt = data.paidAt ?? null;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
