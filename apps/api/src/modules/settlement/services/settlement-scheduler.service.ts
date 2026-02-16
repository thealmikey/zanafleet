import { AccountEntity, AccountType } from '@api/modules/account';
import { LedgerService } from '@api/modules/ledger';
import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';


import { CreateSettlementBatchCommand } from '../commands/create-settlement-batch.command';
import { ProcessPayoutCommand } from '../commands/process-payout.command';
import { PayoutMethod } from '../dto/settlement.enums';

export interface SchedulerConfig {
  minimumPayoutThreshold: number;
  defaultCommissionRate: number;
  defaultPayoutMethod: PayoutMethod;
  defaultProviderId: string;
}

/**
 * SettlementSchedulerService
 * Cron job to automatically create settlement batches for riders above threshold
 */
@Injectable()
export class SettlementSchedulerService {
  private readonly logger = new Logger(SettlementSchedulerService.name);

  private readonly config: SchedulerConfig = {
    minimumPayoutThreshold: 100,
    defaultCommissionRate: 0.15,
    defaultPayoutMethod: PayoutMethod.MOBILE_MONEY,
    defaultProviderId: 'noop',
  };

  constructor(
    private readonly commandBus: CommandBus,
    @InjectRepository(AccountEntity)
    private readonly accountRepository: Repository<AccountEntity>,
    private readonly ledgerService: LedgerService,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async processWeeklySettlements(): Promise<void> {
    this.logger.log('Starting weekly settlement processing...');

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - 7);

    try {
      await this.processSettlementsForPeriod(periodStart, periodEnd);
    } catch (error) {
      this.logger.error(
        `Failed to process weekly settlements: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async processSettlementsForPeriod(periodStart: Date, periodEnd: Date): Promise<void> {
    const riderAccounts = await this.accountRepository.find({
      where: { accountType: AccountType.RIDER },
    });

    this.logger.log(`Found ${riderAccounts.length} rider accounts to process`);

    for (const account of riderAccounts) {
      try {
        await this.processRiderSettlement(account.id, periodStart, periodEnd);
      } catch (error) {
        this.logger.error(
          `Failed to process settlement for rider ${account.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  async processRiderSettlement(
    riderAccountId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<void> {
    const balance = await this.ledgerService.getBalance(riderAccountId);

    if (!balance || balance.balance < this.config.minimumPayoutThreshold) {
      this.logger.debug(
        `Rider ${riderAccountId} balance (${balance?.balance ?? 0}) below threshold, skipping`,
      );
      return;
    }

    const batchResult: { batchId: string; itemCount: number; netPayout: number } = await this.commandBus.execute(
      new CreateSettlementBatchCommand({
        riderAccountId,
        periodStart,
        periodEnd,
        payoutMethod: this.config.defaultPayoutMethod,
        commissionRate: this.config.defaultCommissionRate,
      }),
    );

    if (batchResult.itemCount === 0) {
      this.logger.debug(`No earnings found for rider ${riderAccountId}, skipping payout`);
      return;
    }

    await this.commandBus.execute(
      new ProcessPayoutCommand({
        batchId: batchResult.batchId,
        providerId: this.config.defaultProviderId,
      }),
    );

    this.logger.log(
      `Processed settlement for rider ${riderAccountId}: ${batchResult.netPayout} ${balance?.currency ?? 'USD'}`,
    );
  }

  updateConfig(config: Partial<SchedulerConfig>): void {
    Object.assign(this.config, config);
    this.logger.log(`Scheduler config updated: ${JSON.stringify(this.config)}`);
  }

  getConfig(): SchedulerConfig {
    return { ...this.config };
  }
}
