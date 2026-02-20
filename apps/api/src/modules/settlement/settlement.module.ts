import { Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
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

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Creates mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  return {
    save: async (entity: T): Promise<T> => entity,
    find: async (): Promise<T[]> => [],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    merge: (entity: T, ...updates: Record<string, unknown>[]): T =>
      ({ ...entity, ...Object.assign({}, ...updates) }) as T,
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
  };
}

/**
 * Creates fallback providers for entities in sandbox mode
 */
function createTypeOrmFallbackProviders(...entities: (new () => unknown)[]): Provider[] {
  if (!isSandBoxMode) return [];
  return entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }));
}

/**
 * Creates mock DataSource for sandbox mode
 */
function createMockDataSource(): Record<string, unknown> {
  return {
    createQueryBuilder: () => null,
    manager: {
      save: async (entity: unknown): Promise<unknown> => entity,
      find: async (): Promise<unknown[]> => [],
      findOne: async (): Promise<unknown | null> => null,
    },
  };
}

/**
 * Creates DataSource fallback provider in sandbox mode
 */
function createDataSourceFallbackProvider(): Provider[] {
  if (!isSandBoxMode) return [];
  return [{ provide: DataSource, useValue: createMockDataSource() }];
}

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] SettlementModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([SettlementBatchEntity, SettlementItemEntity])];
}

const CommandHandlers = [CreateSettlementBatchCommandHandler, ProcessPayoutCommandHandler];

@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    EventBusModule,
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
    // Sandbox mode fallbacks
    ...createTypeOrmFallbackProviders(SettlementBatchEntity, SettlementItemEntity),
    ...createDataSourceFallbackProvider(),
  ],
  exports: isSandBoxMode 
    ? [SettlementSchedulerService, PayoutRiskService, PayoutOrchestrator]
    : [SettlementSchedulerService, PayoutRiskService, PayoutOrchestrator],
})
export class SettlementModule {}
