import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountModule } from '../account/account.module';
import { LedgerModule } from '../ledger/ledger.module';
import { PaymentModule } from '../payment/payment.module';
import { SettlementBatchEntity } from './entities/settlement-batch.entity';
import { SettlementItemEntity } from './entities/settlement-item.entity';
import { CreateSettlementBatchCommandHandler } from './handlers/create-settlement-batch.handler';
import { ProcessPayoutCommandHandler } from './handlers/process-payout.handler';
import { SettlementSchedulerService } from './services/settlement-scheduler.service';
import { PayoutRiskService } from './services/payout-risk.service';

const CommandHandlers = [CreateSettlementBatchCommandHandler, ProcessPayoutCommandHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([SettlementBatchEntity, SettlementItemEntity]),
    CqrsModule,
    AccountModule,
    LedgerModule,
    PaymentModule,
  ],
  providers: [SettlementSchedulerService, PayoutRiskService, ...CommandHandlers],
  exports: [TypeOrmModule, SettlementSchedulerService, PayoutRiskService],
})
export class SettlementModule {}
