import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { PaymentIntentStatus, PaymentFlowType, PaymentMethod } from '../dto/payment.enums';

/**
 * PaymentIntent Entity
 * Represents the intention to collect money - bridges billing to payment
 *
 * Key characteristics:
 * - idempotencyKey ensures duplicate requests return existing intent
 * - Links payer and payee accounts for ledger entries
 * - Tracks payment method and provider for execution
 */
@Entity('payment_intents')
@Index(['payerAccountId'])
@Index(['payeeAccountId'])
@Index(['idempotencyKey'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
export class PaymentIntentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  payerAccountId!: string;

  @Column('uuid')
  payeeAccountId!: string;

  @Column('enum', { enum: PaymentFlowType })
  flowType!: PaymentFlowType;

  @Column('decimal', { precision: 18, scale: 2 })
  amount!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('enum', { enum: PaymentIntentStatus })
  status!: PaymentIntentStatus;

  @Column('enum', { enum: PaymentMethod })
  paymentMethod!: PaymentMethod;

  @Column('varchar', { length: 50 })
  providerId!: string;

  @Column('uuid', { nullable: true })
  invoiceId!: string | null;

  @Column('varchar', { length: 128 })
  idempotencyKey!: string;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  toDomain(): {
    paymentIntentId: string;
    payerAccountId: string;
    payeeAccountId: string;
    flowType: PaymentFlowType;
    amount: number;
    currency: string;
    status: PaymentIntentStatus;
    paymentMethod: PaymentMethod;
    providerId: string;
    invoiceId: string | null;
    idempotencyKey: string;
    metadata: Record<string, unknown> | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      paymentIntentId: this.id,
      payerAccountId: this.payerAccountId,
      payeeAccountId: this.payeeAccountId,
      flowType: this.flowType,
      amount: parseFloat(this.amount),
      currency: this.currency,
      status: this.status,
      paymentMethod: this.paymentMethod,
      providerId: this.providerId,
      invoiceId: this.invoiceId,
      idempotencyKey: this.idempotencyKey,
      metadata: this.metadata,
      expiresAt: this.expiresAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static fromDomain(data: {
    paymentIntentId: string;
    payerAccountId: string;
    payeeAccountId: string;
    flowType: PaymentFlowType;
    amount: number;
    currency: string;
    status: PaymentIntentStatus;
    paymentMethod: PaymentMethod;
    providerId: string;
    invoiceId?: string | null;
    idempotencyKey: string;
    metadata?: Record<string, unknown> | null;
    expiresAt?: Date | null;
    createdAt: Date;
  }): PaymentIntentEntity {
    const entity = new PaymentIntentEntity();
    entity.id = data.paymentIntentId;
    entity.payerAccountId = data.payerAccountId;
    entity.payeeAccountId = data.payeeAccountId;
    entity.flowType = data.flowType;
    entity.amount = data.amount.toFixed(2);
    entity.currency = data.currency;
    entity.status = data.status;
    entity.paymentMethod = data.paymentMethod;
    entity.providerId = data.providerId;
    entity.invoiceId = data.invoiceId ?? null;
    entity.idempotencyKey = data.idempotencyKey;
    entity.metadata = data.metadata ?? null;
    entity.expiresAt = data.expiresAt ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
