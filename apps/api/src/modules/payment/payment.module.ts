import { Module, Type, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { AccountModule } from '../account/account.module';
import { LedgerModule } from '../ledger/ledger.module';

import { PaymentWebhookController } from './controllers/payment-webhook.controller';
import { PaymentController } from './controllers/payment.controller';
import { PaymentFlowOrchestrator } from './coordinators/payment-flow.orchestrator';
import { RefundDisputeCoordinator } from './coordinators/refund-dispute.coordinator';
import { DisputeEntity } from './entities/dispute.entity';
import { PaymentIntentEntity } from './entities/payment-intent.entity';
import { PaymentTransactionEntity } from './entities/payment-transaction.entity';
import { RefundEntity } from './entities/refund.entity';
import { CreatePaymentIntentCommandHandler } from './handlers/create-payment-intent.handler';
import { ProcessPaymentCommandHandler } from './handlers/process-payment.handler';
import { NoOpPaymentProvider } from './providers/noop-payment.provider';
import { PaymentProviderRegistry } from './providers/payment-provider-registry.service';
import { FraudCheckService } from './services/fraud-check.service';

const CommandHandlers = [CreatePaymentIntentCommandHandler, ProcessPaymentCommandHandler];

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
    console.log('[DEBUG] PaymentModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([
    PaymentIntentEntity,
    PaymentTransactionEntity,
    DisputeEntity,
    RefundEntity,
  ])];
}

/**
 * Get exports - conditionally based on mode
 */
function getExports(): (Type<unknown> | string)[] {
  const exports: (Type<unknown> | string)[] = [
    PaymentProviderRegistry,
    NoOpPaymentProvider,
    FraudCheckService,
    PaymentFlowOrchestrator,
    RefundDisputeCoordinator,
  ];
  
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
    LedgerModule,
    AccountModule,
  ],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [
    PaymentProviderRegistry,
    NoOpPaymentProvider,
    FraudCheckService,
    PaymentFlowOrchestrator,
    RefundDisputeCoordinator,
    ...createTypeOrmFallbackProviders(
      PaymentIntentEntity,
      PaymentTransactionEntity,
      DisputeEntity,
      RefundEntity,
    ),
    ...createDataSourceFallbackProvider(),
    ...CommandHandlers,
  ],
  exports: getExports(),
})
export class PaymentModule {}
