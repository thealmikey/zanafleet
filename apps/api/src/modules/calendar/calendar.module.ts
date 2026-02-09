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
    EventBusModule,
  ],
  providers: [
    CalendarRepository,
    CalendarEventRepository,
    CalendarService,
    CalendarBindingService,
    SchedulingConstraintService,
  ],
  exports: [
    CalendarService,
    CalendarBindingService,
    SchedulingConstraintService,
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
