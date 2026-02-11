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

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity]),
    CqrsModule,
    EventBusModule.forFeature(),
    forwardRef(() => DeliveryModule),
    forwardRef(() => PaymentModule),
  ],
  controllers: [OrdersController],
  providers: [CreateOrderCommandHandler, CustomerOrderOrchestrator],
  exports: [TypeOrmModule, CreateOrderCommandHandler, CustomerOrderOrchestrator],
})
export class OrderModule { }
