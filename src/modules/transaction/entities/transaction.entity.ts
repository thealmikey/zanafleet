import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { TransactionType, TransactionStatus } from '../dto/transaction.enums';

/**
 * Transaction Entity
 * Represents the Postgres persistence model for transactions
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum types for type and status fields
 * - Decimal precision for amount
 */
@Entity('transactions')
@Index(['sourceWalletId'])
@Index(['destinationWalletId'])
@Index(['status'])
@Index(['createdAt'])
export class TransactionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  sourceWalletId!: string;

  @Column('uuid')
  destinationWalletId!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  amount!: string;

  @Column('enum', { enum: TransactionType })
  type!: TransactionType;

  @Column('enum', { enum: TransactionStatus })
  status!: TransactionStatus;

  @Column('uuid', { nullable: true })
  linkedEventId!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    transactionId: string;
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    linkedEventId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      transactionId: this.id,
      sourceWalletId: this.sourceWalletId,
      destinationWalletId: this.destinationWalletId,
      amount: parseFloat(this.amount),
      type: this.type,
      status: this.status,
      linkedEventId: this.linkedEventId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    transactionId: string;
    sourceWalletId: string;
    destinationWalletId: string;
    amount: number;
    type: TransactionType;
    status: TransactionStatus;
    linkedEventId?: string | null;
    createdAt: Date;
    updatedAt?: Date;
  }): TransactionEntity {
    const entity = new TransactionEntity();
    entity.id = data.transactionId;
    entity.sourceWalletId = data.sourceWalletId;
    entity.destinationWalletId = data.destinationWalletId;
    entity.amount = data.amount.toFixed(2);
    entity.type = data.type;
    entity.status = data.status;
    entity.linkedEventId = data.linkedEventId ?? null;
    entity.createdAt = data.createdAt;
    entity.updatedAt = data.updatedAt ?? data.createdAt;
    return entity;
  }
}
