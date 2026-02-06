import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DeliveryEntity } from './entities/delivery.entity'
import { DeliveryService } from './services/delivery.service'
import { OrderCreatedSubscriber } from './subscribers/order-created.subscriber'

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryEntity])],
  providers: [DeliveryService, OrderCreatedSubscriber],
  exports: [DeliveryService],
})
export class DeliveryModule {}
