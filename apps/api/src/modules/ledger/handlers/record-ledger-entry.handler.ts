import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { RecordLedgerEntryCommand } from '../commands/record-ledger-entry.command';
import { LedgerEntryType } from '../dto/ledger.enums';
import { LedgerEntryEntity } from '../entities/ledger-entry.entity';
import { LedgerEntryRecordedEventV1, LedgerEntryData } from '../events/ledger-entry-recorded.event';

/**
 * RecordLedgerEntryCommandHandler
 * Handles the atomic recording of balanced ledger entries
 * Ensures double-entry bookkeeping: all entries succeed or fail together
 */
@Injectable()
@CommandHandler(RecordLedgerEntryCommand)
export class RecordLedgerEntryCommandHandler implements ICommandHandler<RecordLedgerEntryCommand> {
  private readonly logger = new Logger(RecordLedgerEntryCommandHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService
  ) {}

  async execute(command: RecordLedgerEntryCommand): Promise<string[]> {
    const now = new Date();
    const entryIds: string[] = [];
    const entryData: LedgerEntryData[] = [];

    await this.dataSource.transaction(async (manager) => {
      const ledgerRepo = manager.getRepository(LedgerEntryEntity);

      // Acquire advisory locks for all accounts in sorted order to prevent deadlocks
      const uniqueAccountIds = [...new Set(command.entries.map((e) => e.accountId))].sort();

      for (const accountId of uniqueAccountIds) {
        await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [accountId]);
      }

      for (const entry of command.entries) {
        const lastEntry = await ledgerRepo
          .createQueryBuilder('entry')
          .where('entry.accountId = :accountId', { accountId: entry.accountId })
          .orderBy('entry.createdAt', 'DESC')
          .getOne();

        const currentBalance = lastEntry ? parseFloat(lastEntry.balanceAfter) : 0;
        const balanceChange =
          entry.entryType === LedgerEntryType.CREDIT ? entry.amount : -entry.amount;
        const newBalance = currentBalance + balanceChange;

        const entryId = uuidv4();
        entryIds.push(entryId);

        const entity = LedgerEntryEntity.fromDomain({
          ledgerEntryId: entryId,
          accountId: entry.accountId,
          entryType: entry.entryType,
          category: entry.category,
          amount: entry.amount,
          currency: entry.currency,
          balanceAfter: newBalance,
          referenceType: command.referenceType,
          referenceId: command.referenceId,
          description: entry.description,
          metadata: entry.metadata,
          createdAt: now,
        });

        await ledgerRepo.save(entity);

        entryData.push({
          ledgerEntryId: entryId,
          accountId: entry.accountId,
          entryType: entry.entryType,
          category: entry.category,
          amount: entry.amount,
          currency: entry.currency,
          balanceAfter: newBalance,
        });
      }
    });

    const totalAmount = command.entries
      .filter((e) => e.entryType === LedgerEntryType.DEBIT)
      .reduce((sum, e) => sum + e.amount, 0);

    const event = new LedgerEntryRecordedEventV1({
      eventId: uuidv4(),
      referenceType: command.referenceType,
      referenceId: command.referenceId,
      entries: entryData,
      totalAmount,
      currency: command.entries[0].currency,
      correlationId: command.correlationId,
    });

    this.eventBus.publish(event);

    if (this.eventBusService) {
      this.eventBusService.publish(NatsSubjects.Ledger.ENTRY_RECORDED_V1, event).catch((error) => {
        this.logger.error(`Failed to publish LedgerEntryRecordedEvent to NATS: ${error.message}`);
      });
    }

    this.logger.log(
      `Recorded ${entryIds.length} ledger entries for reference: ${command.referenceType}/${command.referenceId}`
    );

    return entryIds;
  }
}
