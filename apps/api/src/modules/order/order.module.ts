import { EventBusModule } from '@api/core/event-bus';
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

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
  providers: [CreateOrderCommandHandler, CustomerOrderOrchestrator, ActivitySeederService],
  exports: isSandBoxMode 
    ? [CreateOrderCommandHandler, CustomerOrderOrchestrator]
    : [CreateOrderCommandHandler, CustomerOrderOrchestrator],
})
export class OrderModule { }
