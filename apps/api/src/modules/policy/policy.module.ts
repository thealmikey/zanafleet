import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

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
  ],
  exports: [PolicyEnforcementAdapter, PolicyEvaluationEngineService],
})
export class PolicyModule implements OnModuleInit {
  private readonly logger = new Logger(PolicyModule.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('PolicyModule initialized - Policy & Control Engine ready');
  }
}
