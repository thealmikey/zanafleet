import { Module, OnModuleInit, Logger, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { CalendarModule } from '../calendar/calendar.module';

import { PolicyDecisionLogEntity } from './entities/policy-decision-log.entity';
import { PolicyEntity } from './entities/policy.entity';
import { PolicyDecisionLogRepository } from './repositories/policy-decision-log.repository';
import { PolicyRepository } from './repositories/policy.repository';
import { JsonLogicEvaluatorService } from './services/json-logic-evaluator.service';
import { PolicyEnforcementAdapter } from './services/policy-enforcement.adapter';
import { PolicyEvaluationEngineService } from './services/policy-evaluation-engine.service';

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
    console.log('[DEBUG] PolicyModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([PolicyEntity, PolicyDecisionLogEntity])];
}

/**
 * PolicyModule
 *
 * Provides the Policy & Control Engine for the ZanaFleet platform.
 * Handles policy evaluation, enforcement, and audit logging.
 *
 * Key exports:
 * - PolicyEnforcementAdapter: Integration hooks for delivery/assignment services
 * - PolicyEvaluationEngineService: Core evaluation orchestration
 */
@Module({
  imports: [
    ...getTypeOrmImports(),
    CqrsModule,
    EventBusModule.forFeature(),
    CalendarModule,
  ],
  providers: [
    PolicyRepository,
    PolicyDecisionLogRepository,
    JsonLogicEvaluatorService,
    PolicyEvaluationEngineService,
    PolicyEnforcementAdapter,
    ...createTypeOrmFallbackProviders(PolicyEntity, PolicyDecisionLogEntity),
  ],
  exports: [PolicyEnforcementAdapter, PolicyEvaluationEngineService],
})
export class PolicyModule implements OnModuleInit {
  private readonly logger = new Logger(PolicyModule.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('PolicyModule initialized - Policy & Control Engine ready');
  }
}
