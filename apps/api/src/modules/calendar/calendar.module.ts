import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventBusModule } from '../../core/event-bus/event-bus.module';
import {
  CalendarEntity,
  TimeWindowEntity,
  CalendarRuleEntity,
  CalendarEventEntity,
} from './entities';
import { CalendarRepository } from './repositories/calendar.repository';
import { CalendarEventRepository } from './repositories/calendar-event.repository';
import { CalendarService } from './services/calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CalendarEntity,
      TimeWindowEntity,
      CalendarRuleEntity,
      CalendarEventEntity,
    ]),
    CqrsModule,
    EventBusModule,
  ],
  providers: [CalendarRepository, CalendarEventRepository, CalendarService],
  exports: [CalendarService, CalendarRepository, CalendarEventRepository],
})
export class CalendarModule implements OnModuleInit {
  private readonly logger = new Logger(CalendarModule.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('CalendarModule initialized');
  }
}
