import { Module, forwardRef, Type, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

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
 * Creates a mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  return {
    save: async (entity: T): Promise<T> => entity,
    find: async (): Promise<T[]> => [],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merge: (entity: T, ...updates: any[]): T => ({ ...entity, ...Object.assign({}, ...updates) }),
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
  };
}

/**
 * Creates fallback providers for TypeORM entities in sandbox mode
 */
function createTypeOrmFallbackProviders(...entities: (new () => unknown)[]): Provider[] {
  if (!isSandBoxMode) return [];
  return entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }));
}

/**
 * Creates a mock DataSource for sandbox mode
 */
function createMockDataSource(): Record<string, unknown> {
  return {
    createQueryBuilder: () => null,
    manager: { save: async (entity: unknown): Promise<unknown> => entity },
    getRepository: () => createMockRepository(),
    transaction: async (cb: () => Promise<unknown>) => cb(),
  };
}

/**
 * Creates a DataSource fallback provider for sandbox mode
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
  providers: [
    ...CommandHandlers, 
    LedgerService, 
    RevenueDistributionEngine,
    ...createTypeOrmFallbackProviders(LedgerEntryEntity),
    ...createDataSourceFallbackProvider(),
  ],
  exports: getExports(),
})
export class LedgerModule {}
