import { EventBusModule } from '@api/core/event-bus';
import { Module, forwardRef } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LocationResolverService } from '../../core/location/location-resolver.service';
import { BillingModule } from '../billing/billing.module';
import { CalendarModule } from '../calendar/calendar.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LocationIntelligenceModule } from '../location-intelligence/location-intelligence.module';
import { OrderModule } from '../order/order.module';
import { PolicyModule } from '../policy/policy.module';

import { DeliveriesController } from './controllers/deliveries.controller';
import { DeliveryTrackingController } from './controllers/delivery-tracking.controller';
import { DeliveryExecutionCoordinator } from './coordinators/delivery-execution.coordinator';
import { DeliveryLifecycleCoordinator } from './coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from './coordinators/delivery-matching.coordinator';
import { DeliveryRequestCoordinator } from './coordinators/delivery-request.coordinator';
import { DeliveryLocationEntity } from './entities/delivery-location.entity';
import { DeliveryEntity } from './entities/delivery.entity';
import { AcceptDeliveryAssignmentHandler } from './handlers/accept-delivery-assignment.handler';
import { AssignRiderToDeliveryHandler } from './handlers/assign-rider-to-delivery.handler';
import { CancelDeliveryHandler } from './handlers/cancel-delivery.handler';
import { MarkDeliveryDeliveredHandler } from './handlers/mark-delivery-delivered.handler';
import { MarkDeliveryInTransitHandler } from './handlers/mark-delivery-in-transit.handler';
import { MarkDeliveryPickedUpHandler } from './handlers/mark-delivery-picked-up.handler';
import { RecordDeliveryAttemptFailedHandler } from './handlers/record-delivery-attempt-failed.handler';
import { AssignmentRulesService } from './services/assignment-rules.service';
import { DeliveryService } from './services/delivery.service';
import { DeliveryScheduledSubscriber } from './subscribers/delivery-scheduled.subscriber';
import { OrderCreatedSubscriber } from './subscribers/order-created.subscriber';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] DeliveryModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([DeliveryEntity, DeliveryLocationEntity])];
}

const imports = [
  ...getTypeOrmImports(),
  CqrsModule,
  EventBusModule.forFeature(),
  forwardRef(() => PolicyModule),
  forwardRef(() => BillingModule),
  forwardRef(() => CalendarModule),
  forwardRef(() => LedgerModule),
  forwardRef(() => LocationIntelligenceModule),
  forwardRef(() => OrderModule),
];

@Module({
  imports,
  controllers: [DeliveriesController, DeliveryTrackingController],
  providers: [
    DeliveryService,
    DeliveryLifecycleCoordinator,
    DeliveryMatchingCoordinator,
    DeliveryExecutionCoordinator,
    DeliveryRequestCoordinator,
    OrderCreatedSubscriber,
    DeliveryScheduledSubscriber,
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
  exports: [
    DeliveryService,
    DeliveryLifecycleCoordinator,
    DeliveryMatchingCoordinator,
    DeliveryExecutionCoordinator,
    DeliveryRequestCoordinator,
  ],
})
export class DeliveryModule {}
