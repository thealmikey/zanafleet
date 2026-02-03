import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

import { WalletType, OwnerType } from '../dto/wallet.enums';

/**
 * Wallet Entity
 * Represents the Postgres persistence model for wallets
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum types for walletType and ownerType fields
 * - Decimal precision for balance
 */
@Entity('wallets')
@Index(['ownerId'])
@Index(['type'])
@Index(['ownerId', 'type'])
export class WalletEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  ownerId!: string;

  @Column('enum', { enum: OwnerType })
  ownerType!: OwnerType;

  @Column('enum', { enum: WalletType })
  type!: WalletType;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('decimal', { precision: 18, scale: 2, default: 0 })
  balance!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    walletId: string;
    ownerId: string;
    ownerType: OwnerType;
    type: WalletType;
    currency: string;
    balance: number;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      walletId: this.id,
      ownerId: this.ownerId,
      ownerType: this.ownerType,
      type: this.type,
      currency: this.currency,
      balance: parseFloat(this.balance),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    walletId: string;
    ownerId: string;
    ownerType: OwnerType;
    type: WalletType;
    currency: string;
    balance: number;
    createdAt: Date;
  }): WalletEntity {
    const entity = new WalletEntity();
    entity.id = data.walletId;
    entity.ownerId = data.ownerId;
    entity.ownerType = data.ownerType;
    entity.type = data.type;
    entity.currency = data.currency;
    entity.balance = data.balance.toFixed(2);
    entity.createdAt = data.createdAt;
    return entity;
  }
}
