import { Neo4jModule } from '@api/core/neo4j';
import { Module, forwardRef, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { ChargeEntity } from '../billing/entities/charge.entity';
import { InvoiceEntity } from '../billing/entities/invoice.entity';
import { BusinessEntity } from '../business/entities/business.entity';
import { DeliveryModule } from '../delivery/delivery.module';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { LocationIntelligenceModule } from '../location-intelligence/location-intelligence.module';
import { OrderEntity } from '../order/entities/order.entity';
import { OrderModule } from '../order/order.module';
import { DisputeEntity } from '../payment/entities/dispute.entity';
import { PaymentIntentEntity } from '../payment/entities/payment-intent.entity';
import { RefundEntity } from '../payment/entities/refund.entity';
import { PolicyEntity } from '../policy/entities/policy.entity';
import { RiderEntity } from '../rider/entities/rider.entity';
import { SaccoEntity } from '../sacco/entities/sacco.entity';
import { SettlementBatchEntity } from '../settlement/entities/settlement-batch.entity';

import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminHierarchyController } from './controllers/admin-hierarchy.controller';
import { BusinessDashboardController } from './controllers/business-dashboard.controller';
import { BusinessOwnerDashboardController } from './controllers/business-owner-dashboard.controller';
import { OperatorDashboardController } from './controllers/operator-dashboard.controller';
import { RiderDashboardController } from './controllers/rider-dashboard.controller';
import { SupportDashboardController } from './controllers/support-dashboard.controller';
import { AdminScopeService } from './services/admin-scope.service';
import { BusinessOwnerDashboardService } from './services/business-owner-dashboard.service';

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
 * DashboardModule
 *
 * Provides role-specific dashboard endpoints for Admin, Rider, Business,
 * Support, and Operator roles. Each controller is a thin facade that
 * composes read methods from existing services and repositories.
 *
 * Capabilities required:
 * - dashboard.admin.read
 * - dashboard.rider.read
 * - dashboard.business.read
 * - dashboard.support.read
 * - dashboard.operator.read
 * - admin.hierarchy.read
 */
@Module({
  imports: [
    LocationIntelligenceModule,
    Neo4jModule,
    CqrsModule,
    forwardRef(() => DeliveryModule),
    forwardRef(() => OrderModule),
  ],
  controllers: [
    AdminDashboardController,
    AdminHierarchyController,
    RiderDashboardController,
    BusinessDashboardController,
    BusinessOwnerDashboardController,
    SupportDashboardController,
    OperatorDashboardController,
  ],
  providers: [
    AdminScopeService,
    BusinessOwnerDashboardService,
    // Sandbox mode fallbacks
    ...createTypeOrmFallbackProviders(
      DeliveryEntity,
      OrderEntity,
      InvoiceEntity,
      ChargeEntity,
      SettlementBatchEntity,
      PolicyEntity,
      DisputeEntity,
      RefundEntity,
      PaymentIntentEntity,
      BusinessEntity,
      SaccoEntity,
      RiderEntity,
    ),
  ],
  exports: [AdminScopeService],
})
export class DashboardModule {}
