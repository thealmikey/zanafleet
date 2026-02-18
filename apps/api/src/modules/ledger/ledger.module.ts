import { Module, forwardRef, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { PolicyModule } from '../policy/policy.module';

import { LedgerEntryEntity } from './entities/ledger-entry.entity';
import { RecordLedgerEntryCommandHandler } from './handlers/record-ledger-entry.handler';
import { LedgerService } from './services/ledger.service';
import { RevenueDistributionEngine } from './services/revenue-distribution.engine';

const CommandHandlers = [RecordLedgerEntryCommandHandler];

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] LedgerModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([LedgerEntryEntity])];
}

/**
 * Get exports - conditionally based on mode
 */
function getExports(): (Type<unknown> | string)[] {
  const exports: (Type<unknown> | string)[] = [LedgerService, RevenueDistributionEngine];
  
  // Only export TypeOrmModule when NOT in sandbox mode
  if (!isSandBoxMode) {
    exports.push(TypeOrmModule);
  }
  
  return exports;
}

@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    EventBusModule,
    forwardRef(() => PolicyModule),
  ],
  providers: [...CommandHandlers, LedgerService, RevenueDistributionEngine],
  exports: getExports(),
})
export class LedgerModule {}
