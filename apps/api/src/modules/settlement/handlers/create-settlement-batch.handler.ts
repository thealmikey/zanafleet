import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { LedgerEntryEntity, LedgerCategory } from '@api/modules/ledger';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { DataSource, Between } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { CreateSettlementBatchCommand } from '../commands/create-settlement-batch.command';
import { SettlementStatus } from '../dto/settlement.enums';
import { SettlementBatchEntity } from '../entities/settlement-batch.entity';
import { SettlementItemEntity } from '../entities/settlement-item.entity';
import { SettlementBatchCreatedEventV1 } from '../events/batch-created.event';

export interface SettlementBatchResult {
  batchId: string;
  itemCount: number;
  totalEarnings: number;
  platformCommission: number;
  netPayout: number;
}

/**
 * CreateSettlementBatchCommandHandler
 * Aggregates unsettled rider earnings and creates a settlement batch
 */
@Injectable()
@CommandHandler(CreateSettlementBatchCommand)
export class CreateSettlementBatchCommandHandler
  implements ICommandHandler<CreateSettlementBatchCommand>
{
  private readonly logger = new Logger(CreateSettlementBatchCommandHandler.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly eventBus: EventBus,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async execute(command: CreateSettlementBatchCommand): Promise<SettlementBatchResult> {
    const batchId = uuidv4();
    const now = new Date();

    const ledgerRepo = this.dataSource.getRepository(LedgerEntryEntity);

    const unsettledEarnings = await ledgerRepo.find({
      where: {
        accountId: command.riderAccountId,
        category: LedgerCategory.RIDER_EARNING,
        createdAt: Between(command.periodStart, command.periodEnd),
      },
      order: { createdAt: 'ASC' },
    });

    if (unsettledEarnings.length === 0) {
      this.logger.warn(
        `No unsettled earnings found for rider ${command.riderAccountId} in period`,
      );
      return {
        batchId,
        itemCount: 0,
        totalEarnings: 0,
        platformCommission: 0,
        netPayout: 0,
      };
    }

    let totalEarnings = 0;
    const currency = unsettledEarnings[0].currency;
    const itemEntities: SettlementItemEntity[] = [];

    for (const earning of unsettledEarnings) {
      const earningAmount = parseFloat(earning.amount);
      const commissionAmount = this.roundToTwoDecimals(earningAmount * command.commissionRate);
      const netAmount = this.roundToTwoDecimals(earningAmount - commissionAmount);

      totalEarnings += earningAmount;

      const deliveryId = earning.metadata?.deliveryId as string || earning.referenceId;

      itemEntities.push(
        SettlementItemEntity.fromDomain({
          itemId: uuidv4(),
          batchId,
          deliveryId,
          earningAmount,
          commissionAmount,
          netAmount,
          ledgerEntryId: earning.id,
          createdAt: now,
        }),
      );
    }

    const platformCommission = this.roundToTwoDecimals(totalEarnings * command.commissionRate);
    const netPayout = this.roundToTwoDecimals(totalEarnings - platformCommission);

    const batchEntity = SettlementBatchEntity.fromDomain({
      batchId,
      riderAccountId: command.riderAccountId,
      status: SettlementStatus.PENDING,
      totalEarnings,
      platformCommission,
      netPayout,
      currency,
      payoutMethod: command.payoutMethod,
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      itemCount: itemEntities.length,
      metadata: { commissionRate: command.commissionRate },
      createdAt: now,
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.save(SettlementBatchEntity, batchEntity);
      await manager.save(SettlementItemEntity, itemEntities);
    });

    const event = new SettlementBatchCreatedEventV1({
      eventId: uuidv4(),
      batchId,
      riderAccountId: command.riderAccountId,
      status: SettlementStatus.PENDING,
      totalEarnings,
      platformCommission,
      netPayout,
      currency,
      payoutMethod: command.payoutMethod,
      periodStart: command.periodStart,
      periodEnd: command.periodEnd,
      itemCount: itemEntities.length,
      correlationId: command.correlationId,
    });

    this.eventBus.publish(event);

    if (this.eventBusService) {
      this.eventBusService
        .publish(NatsSubjects.Settlement.BATCH_CREATED_V1, event)
        .catch((error: unknown) => {
          this.logger.error(
            `Failed to publish SettlementBatchCreatedEvent to NATS: ${(error as Error).message}`,
          );
        });
    }

    this.logger.log(
      `Settlement batch created: ${batchId} with ${itemEntities.length} items, netPayout: ${netPayout} ${currency}`,
    );

    return {
      batchId,
      itemCount: itemEntities.length,
      totalEarnings,
      platformCommission,
      netPayout,
    };
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
