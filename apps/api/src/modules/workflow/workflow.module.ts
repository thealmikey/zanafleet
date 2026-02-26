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

/**
 * Command handlers
 */
const CommandHandlers: Type<any>[] = [];

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

    TypeOrmModule.forFeature([
      ProcessDefinitionEntity,
      ProcessInstanceEntity,
      ProcessTransitionEntity,
    ]),
  ],
  providers: [WorkflowEngineService, WorkflowEventSubscriber, ...CommandHandlers, ...EventHandlers],
  exports: [WorkflowEngineService, WorkflowEventSubscriber],
})
export class WorkflowModule {}
