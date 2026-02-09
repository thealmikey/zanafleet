import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { PolicyModule } from '../policy/policy.module';

import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import { RecordLedgerEntryCommandHandler } from './handlers/record-ledger-entry.handler';
import { LedgerService } from './services/ledger.service';
import { RevenueDistributionEngine } from './services/revenue-distribution.engine';

const CommandHandlers = [RecordLedgerEntryCommandHandler];

@Module({
  imports: [
    TypeOrmModule.forFeature([LedgerEntryEntity]),
    CqrsModule,
    EventBusModule,
    forwardRef(() => PolicyModule),
  ],
  providers: [...CommandHandlers, LedgerService, RevenueDistributionEngine],
  exports: [TypeOrmModule, LedgerService, RevenueDistributionEngine],
})
export class LedgerModule {}
