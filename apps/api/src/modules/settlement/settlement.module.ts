import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { JobQueueModule } from '../../core/job-queue/job-queue.module';
import { AccountModule } from '../account/account.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentModule } from '../payment/payment.module';

import { SettlementsController } from './controllers/settlements.controller';
import { PayoutOrchestrator } from './coordinators/payout.orchestrator';
import { SettlementBatchEntity } from './entities/settlement-batch.entity';
import { SettlementItemEntity } from './entities/settlement-item.entity';
import { CreateSettlementBatchCommandHandler } from './handlers/create-settlement-batch.handler';
import { ProcessPayoutCommandHandler } from './handlers/process-payout.handler';
import { PayoutRiskService } from './services/payout-risk.service';
import { SettlementSchedulerService } from './services/settlement-scheduler.service';

const CommandHandlers = [CreateSettlementBatchCommandHandler, ProcessPayoutCommandHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([SettlementBatchEntity, SettlementItemEntity]),
    CqrsModule,
    EventBusModule,
    JobQueueModule,
    AccountModule,
    LedgerModule,
    PaymentModule,
  ],
  controllers: [SettlementsController],
  providers: [
    SettlementSchedulerService,
    PayoutRiskService,
    PayoutOrchestrator,
    ...CommandHandlers,
  ],
  exports: [TypeOrmModule, SettlementSchedulerService, PayoutRiskService, PayoutOrchestrator],
})
export class SettlementModule {}
