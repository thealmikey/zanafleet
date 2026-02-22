import { EventBusModule } from '@api/core/event-bus';
import { Module, forwardRef, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { BusinessEntity } from '../business/entities/business.entity';
import { CustomerModule } from '../customer/customer.module';
import { CustomerEntity } from '../customer/entities/customer.entity';
import { DeliveryModule } from '../delivery/delivery.module';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { PaymentModule } from '../payment/payment.module';

import { OrdersController } from './controllers/orders.controller';
import { CustomerOrderOrchestrator } from './coordinators/customer-order.orchestrator';
import { OrderEntity } from './entities/order.entity';
import { CreateOrderCommandHandler } from './handlers/create-order.handler';
import { ActivitySeederService } from './services/activity-seeder.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Creates mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  // In-memory store to track entities for querying
  const store: T[] = [];
  
  return {
    save: async (entity: T): Promise<T> => {
      store.push(entity);
      return entity;
    },
    find: async (): Promise<T[]> => [...store],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    merge: (entity: T, ...updates: Record<string, unknown>[]): T =>
      ({ ...entity, ...Object.assign({}, ...updates) }) as T,
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
    // Add missing TypeORM methods with proper signatures
    count: async (_options?: { where?: Record<string, unknown> }): Promise<number> => store.length,
    countBy: async (_criteria?: Record<string, unknown>): Promise<number> => store.length,
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
 * Conditionally get TypeORM entities based on sandbox mode
 * In sandbox mode, CustomerEntity is not available as TypeORM is disabled
 */
function getTypeOrmEntities() {
  if (isSandBoxMode) {
    console.log('[DEBUG] OrderModule: Skipping CustomerEntity in sandbox mode');
    return [OrderEntity, DeliveryEntity, BusinessEntity];
  }
  return [OrderEntity, DeliveryEntity, BusinessEntity, CustomerEntity];
}

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    return [];
  }
  return [TypeOrmModule.forFeature(getTypeOrmEntities())];
}

@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    EventBusModule.forFeature(),
    forwardRef(() => DeliveryModule),
    forwardRef(() => PaymentModule),
    CustomerModule,
  ],
  controllers: [OrdersController],
  providers: [
    CreateOrderCommandHandler,
    CustomerOrderOrchestrator,
    ActivitySeederService,
    // Sandbox mode fallbacks
    ...createTypeOrmFallbackProviders(OrderEntity, DeliveryEntity, BusinessEntity, CustomerEntity),
  ],
  exports: isSandBoxMode 
    ? [
        CreateOrderCommandHandler, 
        CustomerOrderOrchestrator,
        // Export fallback providers for DeliveryModule
        { provide: getRepositoryToken(OrderEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(DeliveryEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(BusinessEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(CustomerEntity), useValue: createMockRepository() },
      ]
    : [CreateOrderCommandHandler, CustomerOrderOrchestrator],
})
export class OrderModule { }
