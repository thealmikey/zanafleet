import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CqrsModule } from '@nestjs/cqrs'

import { DeliveryEntity } from './entities/delivery.entity'
import { DeliveryService } from './services/delivery.service'
import { OrderCreatedSubscriber } from './subscribers/order-created.subscriber'
import { DeliveryScheduledSubscriber } from './subscribers/delivery-scheduled.subscriber'
import { CandidateSelectionService } from './services/candidate-selection.service'
import { AssignmentRulesService } from './services/assignment-rules.service'
import { LocationResolverService } from '../../core/location/location-resolver.service'

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryEntity]), CqrsModule],
  providers: [
    DeliveryService,
    OrderCreatedSubscriber,
    DeliveryScheduledSubscriber,
    CandidateSelectionService,
    AssignmentRulesService,
    LocationResolverService,
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
