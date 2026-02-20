import { getRepositoryToken } from '@nestjs/typeorm';
import { Module, OnModuleInit, Logger, Provider } from '@nestjs/common';
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
 * Creates a mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  return {
    save: async (entity: T): Promise<T> => entity,
    find: async (): Promise<T[]> => [],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merge: (entity: T, ...updates: any[]): T => ({ ...entity, ...Object.assign({}, ...updates) }),
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
  };
}

/**
 * Creates fallback providers for TypeORM entities in sandbox mode
 */
function createTypeOrmFallbackProviders(...entities: (new () => unknown)[]): Provider[] {
  if (!isSandBoxMode) return [];
  return entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }));
}

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
    ...createTypeOrmFallbackProviders(
      CalendarEntity,
      TimeWindowEntity,
      CalendarRuleEntity,
      CalendarEventEntity,
      CalendarBindingEntity,
      CalendarOverrideEntity,
    ),
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
