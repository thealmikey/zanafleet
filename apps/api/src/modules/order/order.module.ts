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

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, DeliveryEntity, BusinessEntity, CustomerEntity]),
    CqrsModule,
    EventBusModule.forFeature(),
    forwardRef(() => DeliveryModule),
    forwardRef(() => PaymentModule),
    CustomerModule,
  ],
  controllers: [OrdersController],
  providers: [CreateOrderCommandHandler, CustomerOrderOrchestrator, ActivitySeederService],
  exports: [TypeOrmModule, CreateOrderCommandHandler, CustomerOrderOrchestrator],
})
export class OrderModule { }
