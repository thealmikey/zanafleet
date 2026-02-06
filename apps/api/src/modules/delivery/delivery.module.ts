import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'
import { TypeOrmModule } from '@nestjs/typeorm'

import { LocationResolverService } from '../../core/location/location-resolver.service'

import { DeliveryTrackingController } from './controllers/delivery-tracking.controller'
import { DeliveryEntity } from './entities/delivery.entity'
import { AcceptDeliveryAssignmentHandler } from './handlers/accept-delivery-assignment.handler'
import { AssignRiderToDeliveryHandler } from './handlers/assign-rider-to-delivery.handler'
import { CancelDeliveryHandler } from './handlers/cancel-delivery.handler'
import { MarkDeliveryDeliveredHandler } from './handlers/mark-delivery-delivered.handler'
import { MarkDeliveryInTransitHandler } from './handlers/mark-delivery-in-transit.handler'
import { MarkDeliveryPickedUpHandler } from './handlers/mark-delivery-picked-up.handler'
import { RecordDeliveryAttemptFailedHandler } from './handlers/record-delivery-attempt-failed.handler'
import { AssignmentRulesService } from './services/assignment-rules.service'
import { CandidateSelectionService } from './services/candidate-selection.service'
import { DeliveryService } from './services/delivery.service'
import { DeliveryScheduledSubscriber } from './subscribers/delivery-scheduled.subscriber'
import { OrderCreatedSubscriber } from './subscribers/order-created.subscriber'

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryEntity]), CqrsModule],
  controllers: [DeliveryTrackingController],
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
