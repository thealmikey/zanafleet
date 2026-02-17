import { EventBusModule } from '@api/core/event-bus';
import { Module, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProcessDefinitionEntity } from './entities/process-definition.entity';
import { ProcessInstanceEntity } from './entities/process-instance.entity';
import { ProcessTransitionEntity } from './entities/process-transition.entity';
import {
  ProcessInstanceNeo4jProjection,
  ProcessStateChangedNeo4jProjection,
} from './projections/process-instance-neo4j.projection';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowEventSubscriber } from './subscribers/workflow-event.subscriber';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] WorkflowModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [
    TypeOrmModule.forFeature([
      ProcessDefinitionEntity,
      ProcessInstanceEntity,
      ProcessTransitionEntity,
    ]),
  ];
}

/**
 * Command handlers
 */
const CommandHandlers: Type<unknown>[] = [];

/**
 * Event handlers
 */
const EventHandlers = [ProcessInstanceNeo4jProjection, ProcessStateChangedNeo4jProjection];

/**
 * WorkflowModule
 *
 * Encapsulates all Workflow-related functionality.
 *
 * Providers:
 * - WorkflowEngineService: Core service for managing process instances and transitions
 * - WorkflowEventSubscriber: Handles domain events from other modules
 * - ProcessInstanceNeo4jProjection: Syncs process instances to Neo4j
 * - ProcessStateChangedNeo4jProjection: Syncs state changes to Neo4j
 *
 * Entities:
 * - ProcessDefinitionEntity: Blueprint for process definitions
 * - ProcessInstanceEntity: Runtime process instances
 * - ProcessTransitionEntity: Transition rules between states
 */
@Module({
  imports: [
    CqrsModule,
    EventBusModule.forFeature(),
    ...getTypeOrmImports(),
  ],
  providers: [
    WorkflowEngineService,
    WorkflowEventSubscriber,
    ...CommandHandlers,
    ...EventHandlers,
  ],
  exports: [
    WorkflowEngineService,
    WorkflowEventSubscriber,
  ],
})
export class WorkflowModule {}
