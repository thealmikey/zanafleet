import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LedgerEntryType, LedgerReferenceType } from '../dto/ledger.enums';
import { LedgerEntryEntity } from '../entities/ledger-entry.entity';

export interface AccountBalance {
  accountId: string;
  balance: number;
  currency: string;
}

export interface LedgerEntryRecord {
  ledgerEntryId: string;
  accountId: string;
  entryType: LedgerEntryType;
  category: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  referenceType: LedgerReferenceType;
  referenceId: string;
  description: string | null;
  createdAt: Date;
}

/**
 * LedgerService
 * Query service for ledger operations
 * Provides balance lookups, entry history, and double-entry verification
 */
@Injectable()
export class LedgerService {
  constructor(
    @InjectRepository(LedgerEntryEntity)
    private readonly ledgerEntryRepository: Repository<LedgerEntryEntity>,
  ) {}

  async getBalance(accountId: string): Promise<AccountBalance | null> {
    const lastEntry = await this.ledgerEntryRepository.findOne({
      where: { accountId },
      order: { createdAt: 'DESC' },
    });

    if (!lastEntry) {
      return null;
    }

    return {
      accountId,
      balance: parseFloat(lastEntry.balanceAfter),
      currency: lastEntry.currency,
    };
  }

  async getEntriesByAccount(
    accountId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<LedgerEntryRecord[]> {
    const entries = await this.ledgerEntryRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });

    return entries.map((e) => ({
      ledgerEntryId: e.id,
      accountId: e.accountId,
      entryType: e.entryType,
      category: e.category,
      amount: parseFloat(e.amount),
      currency: e.currency,
      balanceAfter: parseFloat(e.balanceAfter),
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      description: e.description,
      createdAt: e.createdAt,
    }));
  }

  async getEntriesByReference(
    referenceType: LedgerReferenceType,
    referenceId: string,
  ): Promise<LedgerEntryRecord[]> {
    const entries = await this.ledgerEntryRepository.find({
      where: { referenceType, referenceId },
      order: { createdAt: 'ASC' },
    });

    return entries.map((e) => ({
      ledgerEntryId: e.id,
      accountId: e.accountId,
      entryType: e.entryType,
      category: e.category,
      amount: parseFloat(e.amount),
      currency: e.currency,
      balanceAfter: parseFloat(e.balanceAfter),
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      description: e.description,
      createdAt: e.createdAt,
    }));
  }

  async verifyDoubleEntryBalance(): Promise<{
    isBalanced: boolean;
    totalDebit: number;
    totalCredit: number;
  }> {
    const result = await this.ledgerEntryRepository
      .createQueryBuilder('entry')
      .select('entry.entryType', 'entryType')
      .addSelect('SUM(CAST(entry.amount AS DECIMAL))', 'total')
      .groupBy('entry.entryType')
      .getRawMany();

    const totals = result.reduce(
      (acc, row) => {
        if (row.entryType === LedgerEntryType.DEBIT) {
          acc.totalDebit = parseFloat(row.total) || 0;
        } else {
          acc.totalCredit = parseFloat(row.total) || 0;
        }
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 },
    );

    return {
      isBalanced: Math.abs(totals.totalDebit - totals.totalCredit) < 0.01,
      ...totals,
    };
  }
}
