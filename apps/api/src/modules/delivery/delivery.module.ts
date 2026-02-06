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

import { AssignRiderToDeliveryHandler } from './handlers/assign-rider-to-delivery.handler'
import { AcceptDeliveryAssignmentHandler } from './handlers/accept-delivery-assignment.handler'
import { MarkDeliveryPickedUpHandler } from './handlers/mark-delivery-picked-up.handler'
import { MarkDeliveryInTransitHandler } from './handlers/mark-delivery-in-transit.handler'
import { MarkDeliveryDeliveredHandler } from './handlers/mark-delivery-delivered.handler'
import { CancelDeliveryHandler } from './handlers/cancel-delivery.handler'
import { RecordDeliveryAttemptFailedHandler } from './handlers/record-delivery-attempt-failed.handler'

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryEntity]), CqrsModule],
  providers: [
    DeliveryService,
    OrderCreatedSubscriber,
    DeliveryScheduledSubscriber,
    CandidateSelectionService,
    AssignmentRulesService,
    LocationResolverService,
    // Command Handlers
    AssignRiderToDeliveryHandler,
    AcceptDeliveryAssignmentHandler,
    MarkDeliveryPickedUpHandler,
    MarkDeliveryInTransitHandler,
    MarkDeliveryDeliveredHandler,
    CancelDeliveryHandler,
    RecordDeliveryAttemptFailedHandler,
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}
