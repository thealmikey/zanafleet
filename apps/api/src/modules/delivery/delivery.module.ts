import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DeliveryEntity } from './entities/delivery.entity'
import { DeliveryService } from './services/delivery.service'

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryEntity])],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
