import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

import { PaymentStatus } from '../providers/dto/payment-provider.types';

/**
 * PaymentTransaction Entity
 * Records each provider execution attempt for a payment intent
 *
 * Key characteristics:
 * - Immutable: No @UpdateDateColumn - transactions are append-only
 * - Tracks provider-specific details like fees and raw responses
 * - Links to PaymentIntent for audit trail
 */
@Entity('payment_transactions')
@Index(['paymentIntentId'])
@Index(['providerId'])
@Index(['providerTransactionId'])
@Index(['createdAt'])
export class PaymentTransactionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  paymentIntentId!: string;

  @Column('varchar', { length: 50 })
  providerId!: string;

  @Column('varchar', { length: 255, nullable: true })
  providerTransactionId!: string | null;

  @Column('varchar', { length: 20 })
  status!: PaymentStatus;

  @Column('decimal', { precision: 18, scale: 2 })
  amount!: string;

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  providerFee!: string | null;

  @Column('varchar', { length: 50, nullable: true })
  errorCode!: string | null;

  @Column('text', { nullable: true })
  errorMessage!: string | null;

  @Column('jsonb', { nullable: true })
  rawResponse!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  toDomain(): {
    transactionId: string;
    paymentIntentId: string;
    providerId: string;
    providerTransactionId: string | null;
    status: PaymentStatus;
    amount: number;
    providerFee: number | null;
    errorCode: string | null;
    errorMessage: string | null;
    rawResponse: Record<string, unknown> | null;
    createdAt: Date;
  } {
    return {
      transactionId: this.id,
      paymentIntentId: this.paymentIntentId,
      providerId: this.providerId,
      providerTransactionId: this.providerTransactionId,
      status: this.status ,
      amount: parseFloat(this.amount),
      providerFee: this.providerFee ? parseFloat(this.providerFee) : null,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      rawResponse: this.rawResponse,
      createdAt: this.createdAt,
    };
  }

  static fromDomain(data: {
    transactionId: string;
    paymentIntentId: string;
    providerId: string;
    providerTransactionId?: string | null;
    status: PaymentStatus;
    amount: number;
    providerFee?: number | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    rawResponse?: Record<string, unknown> | null;
    createdAt: Date;
  }): PaymentTransactionEntity {
    const entity = new PaymentTransactionEntity();
    entity.id = data.transactionId;
    entity.paymentIntentId = data.paymentIntentId;
    entity.providerId = data.providerId;
    entity.providerTransactionId = data.providerTransactionId ?? null;
    entity.status = data.status;
    entity.amount = data.amount.toFixed(2);
    entity.providerFee = data.providerFee != null ? data.providerFee.toFixed(2) : null;
    entity.errorCode = data.errorCode ?? null;
    entity.errorMessage = data.errorMessage ?? null;
    entity.rawResponse = data.rawResponse ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
