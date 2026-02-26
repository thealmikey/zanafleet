import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import { RecordLedgerEntryCommandHandler } from './handlers/record-ledger-entry.handler';
import { LedgerService } from './services/ledger.service';

const CommandHandlers = [RecordLedgerEntryCommandHandler];

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntryEntity]), CqrsModule],
  providers: [...CommandHandlers, LedgerService],
  exports: [LedgerService, TypeOrmModule],
})
export class LedgerModule {}
