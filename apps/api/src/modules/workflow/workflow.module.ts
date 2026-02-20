import { EventBusModule } from '@api/core/event-bus';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Module, Type, Provider } from '@nestjs/common';
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
    ...(isSandBoxMode
      ? createTypeOrmFallbackProviders(
          ProcessDefinitionEntity,
          ProcessInstanceEntity,
          ProcessTransitionEntity,
        )
      : []),
  ],
  exports: [
    WorkflowEngineService,
    WorkflowEventSubscriber,
  ],
})
export class WorkflowModule {}
