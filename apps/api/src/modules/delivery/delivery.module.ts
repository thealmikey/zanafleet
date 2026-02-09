import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '@api/core/event-bus';
import { LocationResolverService } from '../../core/location/location-resolver.service';
import { BillingModule } from '../billing/billing.module';
import { CalendarModule } from '../calendar/calendar.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LocationIntelligenceModule } from '../location-intelligence/location-intelligence.module';
import { PolicyModule } from '../policy/policy.module';

import { DeliveryLifecycleCoordinator } from './coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from './coordinators/delivery-matching.coordinator';
import { DeliveryTrackingController } from './controllers/delivery-tracking.controller';
import { DeliveryEntity } from './entities/delivery.entity';
import { AcceptDeliveryAssignmentHandler } from './handlers/accept-delivery-assignment.handler';
import { AssignRiderToDeliveryHandler } from './handlers/assign-rider-to-delivery.handler';
import { CancelDeliveryHandler } from './handlers/cancel-delivery.handler';
import { MarkDeliveryDeliveredHandler } from './handlers/mark-delivery-delivered.handler';
import { MarkDeliveryInTransitHandler } from './handlers/mark-delivery-in-transit.handler';
import { MarkDeliveryPickedUpHandler } from './handlers/mark-delivery-picked-up.handler';
import { RecordDeliveryAttemptFailedHandler } from './handlers/record-delivery-attempt-failed.handler';
import { AssignmentRulesService } from './services/assignment-rules.service';
import { CandidateSelectionService } from './services/candidate-selection.service';
import { DeliveryService } from './services/delivery.service';
import { DeliveryScheduledSubscriber } from './subscribers/delivery-scheduled.subscriber';
import { OrderCreatedSubscriber } from './subscribers/order-created.subscriber';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryEntity]),
    CqrsModule,
    EventBusModule.forFeature(),
    forwardRef(() => PolicyModule),
    forwardRef(() => BillingModule),
    forwardRef(() => CalendarModule),
    forwardRef(() => LedgerModule),
    forwardRef(() => LocationIntelligenceModule),
  ],
  controllers: [DeliveryTrackingController],
  providers: [
    DeliveryService,
    DeliveryLifecycleCoordinator,
    DeliveryMatchingCoordinator,
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
  exports: [DeliveryService, DeliveryLifecycleCoordinator, DeliveryMatchingCoordinator],
})
export class DeliveryModule {}
