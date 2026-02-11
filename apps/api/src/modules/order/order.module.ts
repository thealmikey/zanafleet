import { EventBusModule } from '@api/core/event-bus';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OrdersController } from './controllers/orders.controller';
import { OrderEntity } from './entities/order.entity';
import { CreateOrderCommandHandler } from './handlers/create-order.handler';

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity]), CqrsModule, EventBusModule.forFeature()],
  controllers: [OrdersController],
  providers: [CreateOrderCommandHandler],
  exports: [TypeOrmModule, CreateOrderCommandHandler],
})
export class OrderModule {}
