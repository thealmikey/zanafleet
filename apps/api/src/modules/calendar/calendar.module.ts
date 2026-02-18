import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';

import {
  CalendarEntity,
  TimeWindowEntity,
  CalendarRuleEntity,
  CalendarEventEntity,
  CalendarBindingEntity,
  CalendarOverrideEntity,
} from './entities';
import { CalendarEventRepository } from './repositories/calendar-event.repository';
import { CalendarRepository } from './repositories/calendar.repository';
import { CalendarBindingService } from './services/calendar-binding.service';
import { CalendarPolicyBridgeService } from './services/calendar-policy-bridge.service';
import { CalendarSyncService } from './services/calendar-sync.service';
import { CalendarService } from './services/calendar.service';
import { SchedulingConstraintService } from './services/scheduling-constraint.service';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] CalendarModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([
    CalendarEntity,
    TimeWindowEntity,
    CalendarRuleEntity,
    CalendarEventEntity,
    CalendarBindingEntity,
    CalendarOverrideEntity,
  ])];
}

@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    EventBusModule,
  ],
  providers: [
    CalendarRepository,
    CalendarEventRepository,
    CalendarService,
    CalendarBindingService,
    CalendarSyncService,
    SchedulingConstraintService,
    CalendarPolicyBridgeService,
  ],
  exports: [
    CalendarService,
    CalendarBindingService,
    CalendarSyncService,
    SchedulingConstraintService,
    CalendarPolicyBridgeService,
    CalendarRepository,
    CalendarEventRepository,
  ],
})
export class CalendarModule implements OnModuleInit {
  private readonly logger = new Logger(CalendarModule.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('CalendarModule initialized');
  }
}
