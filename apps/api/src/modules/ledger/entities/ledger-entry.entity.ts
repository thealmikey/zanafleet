import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../dto/ledger.enums';

/**
 * LedgerEntry Entity
 * Represents an immutable ledger entry for double-entry bookkeeping
 *
 * Key characteristics:
 * - Immutable: No @UpdateDateColumn - entries can only be reversed via correction entries
 * - Double-entry: Each financial operation creates balanced debit/credit pairs
 * - Unique constraint prevents double-posting for same reference
 * - balanceAfter tracks running balance for each account
 */
@Entity('ledger_entries')
@Index(['accountId'])
@Index(['referenceType', 'referenceId'])
@Index(['referenceType', 'referenceId', 'entryType', 'accountId'], { unique: true })
@Index(['createdAt'])
export class LedgerEntryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  accountId!: string;

  @Column('enum', { enum: LedgerEntryType })
  entryType!: LedgerEntryType;

  @Column('enum', { enum: LedgerCategory })
  category!: LedgerCategory;

  @Column('decimal', { precision: 18, scale: 2 })
  amount!: string;

  @Column('varchar', { length: 3 })
  currency!: string;

  @Column('decimal', { precision: 18, scale: 2 })
  balanceAfter!: string;

  @Column('enum', { enum: LedgerReferenceType })
  referenceType!: LedgerReferenceType;

  @Column('uuid')
  referenceId!: string;

  @Column('varchar', { length: 500, nullable: true })
  description!: string | null;

  @Column('simple-json', { nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  toDomain(): {
    ledgerEntryId: string;
    accountId: string;
    entryType: LedgerEntryType;
    category: LedgerCategory;
    amount: number;
    currency: string;
    balanceAfter: number;
    referenceType: LedgerReferenceType;
    referenceId: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
  } {
    return {
      ledgerEntryId: this.id,
      accountId: this.accountId,
      entryType: this.entryType,
      category: this.category,
      amount: parseFloat(this.amount),
      currency: this.currency,
      balanceAfter: parseFloat(this.balanceAfter),
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      description: this.description,
      metadata: this.metadata,
      createdAt: this.createdAt,
    };
  }

  static fromDomain(data: {
    ledgerEntryId: string;
    accountId: string;
    entryType: LedgerEntryType;
    category: LedgerCategory;
    amount: number;
    currency: string;
    balanceAfter: number;
    referenceType: LedgerReferenceType;
    referenceId: string;
    description?: string | null;
    metadata?: Record<string, unknown> | null;
    createdAt: Date;
  }): LedgerEntryEntity {
    const entity = new LedgerEntryEntity();
    entity.id = data.ledgerEntryId;
    entity.accountId = data.accountId;
    entity.entryType = data.entryType;
    entity.category = data.category;
    entity.amount = data.amount.toFixed(2);
    entity.currency = data.currency;
    entity.balanceAfter = data.balanceAfter.toFixed(2);
    entity.referenceType = data.referenceType;
    entity.referenceId = data.referenceId;
    entity.description = data.description ?? null;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt;
    return entity;
  }
}
