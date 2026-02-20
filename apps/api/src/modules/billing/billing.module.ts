import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentModule } from '../payment/payment.module';

import { ChargeEntity } from './entities/charge.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { CreateInvoiceCommandHandler } from './handlers/create-invoice.handler';
import { IssueInvoiceCommandHandler } from './handlers/issue-invoice.handler';
import { PaymentCompletedListener } from './listeners/payment-completed.listener';
import { PolicyEvaluatedListener } from './listeners/policy-evaluated.listener';
import { BillingCalculatorService } from './services/billing-calculator.service';
import { PricingSignalService } from './services/pricing-signal.service';

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
function createMockDataSource(): unknown {
  const mockManager = {
    save: async <T>(entity: T): Promise<T> => entity,
    find: async <T>(): Promise<T[]> => [],
    findOne: async <T>(): Promise<T | null> => null,
    getRepository: <T>(entity: new () => T) => createMockRepository<T>(),
  };
  return {
    manager: mockManager,
    transaction: async <T>(runInTransaction: (manager: unknown) => Promise<T>): Promise<T> => {
      return runInTransaction(mockManager);
    },
  };
}

/**
 * Creates a fallback provider for DataSource in sandbox mode
 */
function createDataSourceFallbackProvider(): Provider[] {
  if (!isSandBoxMode) return [];
  return [{
    provide: DataSource,
    useValue: createMockDataSource(),
  }];
}

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] BillingModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([InvoiceEntity, ChargeEntity])];
}

const CommandHandlers = [CreateInvoiceCommandHandler, IssueInvoiceCommandHandler];
const EventHandlers = [PaymentCompletedListener, PolicyEvaluatedListener];

@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    PaymentModule,
  ],
  providers: [
    BillingCalculatorService,
    PricingSignalService,
    ...CommandHandlers,
    ...EventHandlers,
    ...createTypeOrmFallbackProviders(InvoiceEntity, ChargeEntity),
    ...createDataSourceFallbackProvider(),
  ],
  exports: [BillingCalculatorService, PricingSignalService],
})
export class BillingModule {}
