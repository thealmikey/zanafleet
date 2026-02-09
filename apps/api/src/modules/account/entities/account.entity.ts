import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { AccountType, AccountStatus } from '../dto/account.enums';

/**
 * Account Entity
 * Represents the Postgres persistence model for accounts
 *
 * TypeORM entity with best practices:
 * - UUID primary key for distributed systems
 * - Indexed columns for common queries
 * - Timestamps for audit trail
 * - Enum types for accountType and status fields
 * - JSONB for flexible metadata storage
 */
@Entity('accounts')
@Index(['externalId'])
@Index(['accountType'])
@Index(['externalId', 'accountType'])
export class AccountEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  externalId!: string;

  @Column('enum', { enum: AccountType })
  accountType!: AccountType;

  @Column('enum', { enum: AccountStatus, default: AccountStatus.ACTIVE })
  status!: AccountStatus;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain object
   */
  toDomain(): {
    accountId: string;
    externalId: string;
    accountType: AccountType;
    status: AccountStatus;
    currency: string;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      accountId: this.id,
      externalId: this.externalId,
      accountType: this.accountType,
      status: this.status,
      currency: this.currency,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    accountId: string;
    externalId: string;
    accountType: AccountType;
    status: AccountStatus;
    currency: string;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): AccountEntity {
    const entity = new AccountEntity();
    entity.id = data.accountId;
    entity.externalId = data.externalId;
    entity.accountType = data.accountType;
    entity.status = data.status;
    entity.currency = data.currency;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
