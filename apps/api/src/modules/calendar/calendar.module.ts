import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  CalendarBindingEntity,
  CalendarEntity,
  CalendarEventEntity,
  CalendarOverrideEntity,
  CalendarRuleEntity,
  TimeWindowEntity,
} from './entities';
import { CalendarEventRepository } from './repositories/calendar-event.repository';
import { CalendarRepository } from './repositories/calendar.repository';
import { CalendarBindingService } from './services/calendar-binding.service';
import { CalendarPolicyBridgeService } from './services/calendar-policy-bridge.service';
import { CalendarSyncService } from './services/calendar-sync.service';
import { CalendarService } from './services/calendar.service';
import { SchedulingConstraintService } from './services/scheduling-constraint.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarEntity,
      TimeWindowEntity,
      CalendarRuleEntity,
      CalendarEventEntity,
      CalendarBindingEntity,
      CalendarOverrideEntity,
    ]),
    CqrsModule,
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
