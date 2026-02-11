import { EventBusModule } from '@api/core/event-bus';
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeliveryModule } from '../delivery/delivery.module';
import { PaymentModule } from '../payment/payment.module';

import { CustomerOrderOrchestrator } from './coordinators/customer-order.orchestrator';
import { OrdersController } from './controllers/orders.controller';
import { OrderEntity } from './entities/order.entity';
import { CreateOrderCommandHandler } from './handlers/create-order.handler';

import { BusinessEntity } from '../business/entities/business.entity';
import { CustomerEntity } from '../customer/entities/customer.entity';
import { DeliveryEntity } from '../delivery/entities/delivery.entity';
import { ActivitySeederService } from './services/activity-seeder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, DeliveryEntity, BusinessEntity, CustomerEntity]),
    CqrsModule,
    EventBusModule.forFeature(),
    forwardRef(() => DeliveryModule),
    forwardRef(() => PaymentModule),
  ],
  controllers: [OrdersController],
  providers: [CreateOrderCommandHandler, CustomerOrderOrchestrator, ActivitySeederService],
  exports: [TypeOrmModule, CreateOrderCommandHandler, CustomerOrderOrchestrator],
})
export class OrderModule { }
