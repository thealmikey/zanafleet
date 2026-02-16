/**
 * In-Memory Workflow Repository
 *
 * In-memory implementation for sandbox mode.
 * Provides data access for workflow/process lookups without PostgreSQL.
 */

import { Injectable } from '@nestjs/common';

import { InMemoryStoreBase } from '../../../core/sandbox/in-memory-store.base';
import { ProcessDefinitionEntity } from '../entities/process-definition.entity';
import { ProcessTransitionEntity } from '../entities/process-transition.entity';

/**
 * Process Instance for in-memory storage
 */
interface ProcessInstanceData {
  instanceId: string;
  definitionId: string;
  currentState: string;
  context: Record<string, unknown>;
  relatedEntities: Array<{
    entityType: string;
    entityId: string;
    role: string;
    linkedAt: Date;
  }>;
  status: 'active' | 'completed' | 'cancelled' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-Memory Workflow Repository
 *
 * Provides in-memory data access for workflow/process lookups.
 * This is used when running in sandbox mode with USE_IN_MEMORY_DB=true.
 */
@Injectable()
export class WorkflowRepositoryInMemory {
  /**
   * Store for process definitions
   */
  private readonly definitionStore: InMemoryStoreBase<ProcessDefinitionEntity>;

  /**
   * Store for process transitions
   */
  private readonly transitionStore: InMemoryStoreBase<ProcessTransitionEntity>;

  /**
   * Store for process instances
   */
  private readonly instanceStore: InMemoryStoreBase<ProcessInstanceData>;

  constructor() {
    this.definitionStore = new InMemoryStoreBase<ProcessDefinitionEntity>({
      entityName: 'ProcessDefinition',
      autoGenerateIds: false,
    });
    this.transitionStore = new InMemoryStoreBase<ProcessTransitionEntity>({
      entityName: 'ProcessTransition',
      autoGenerateIds: false,
    });
    this.instanceStore = new InMemoryStoreBase<ProcessInstanceData>({
      entityName: 'ProcessInstance',
      autoGenerateIds: true,
    });
  }

  // =========================================================================
  // Process Definitions
  // =========================================================================

  /**
   * Find definition by ID
   */
  async findDefinitionById(definitionId: string): Promise<ProcessDefinitionEntity | null> {
    return this.definitionStore.findById(definitionId);
  }

  /**
   * Find definition by name
   */
  async findDefinitionByName(name: string): Promise<ProcessDefinitionEntity | null> {
    const all = await this.definitionStore.findAll();
    return all.find((d) => d.name === name) || null;
  }

  /**
   * Find all active definitions
   */
  async findActiveDefinitions(): Promise<ProcessDefinitionEntity[]> {
    const all = await this.definitionStore.findAll();
    return all.filter((d) => d.isActive);
  }

  /**
   * Save a process definition
   */
  async saveDefinition(entity: ProcessDefinitionEntity): Promise<ProcessDefinitionEntity> {
    return this.definitionStore.save(entity);
  }

  // =========================================================================
  // Process Transitions
  // =========================================================================

  /**
   * Find transitions by definition ID
   */
  async findTransitionsByDefinitionId(definitionId: string): Promise<ProcessTransitionEntity[]> {
    const all = await this.transitionStore.findAll();
    return all.filter((t) => t.definitionId === definitionId);
  }

  /**
   * Find transition by ID
   */
  async findTransitionById(transitionId: string): Promise<ProcessTransitionEntity | null> {
    const all = await this.transitionStore.findAll();
    return all.find((t) => t.transitionId === transitionId) || null;
  }

  /**
   * Save a process transition
   */
  async saveTransition(entity: ProcessTransitionEntity): Promise<ProcessTransitionEntity> {
    return this.transitionStore.save(entity);
  }

  // =========================================================================
  // Process Instances
  // =========================================================================

  /**
   * Find instance by ID
   */
  async findInstanceById(instanceId: string): Promise<ProcessInstanceData | null> {
    return this.instanceStore.findById(instanceId);
  }

  /**
   * Find instances by definition ID
   */
  async findInstancesByDefinitionId(definitionId: string): Promise<ProcessInstanceData[]> {
    const all = await this.instanceStore.findAll();
    return all.filter((i) => i.definitionId === definitionId);
  }

  /**
   * Find instances by status
   */
  async findInstancesByStatus(status: ProcessInstanceData['status']): Promise<ProcessInstanceData[]> {
    const all = await this.instanceStore.findAll();
    return all.filter((i) => i.status === status);
  }

  /**
   * Save a process instance
   */
  async saveInstance(instance: ProcessInstanceData): Promise<ProcessInstanceData> {
    return this.instanceStore.save(instance);
  }

  /**
   * Update a process instance
   */
  async updateInstance(
    instanceId: string,
    data: Partial<ProcessInstanceData>
  ): Promise<ProcessInstanceData | null> {
    return this.instanceStore.update(instanceId, data);
  }

  // =========================================================================
  // Utility Methods
  // =========================================================================

  /**
   * Clear all workflow data
   */
  async clear(): Promise<void> {
    await this.definitionStore.clear();
    await this.transitionStore.clear();
    await this.instanceStore.clear();
  }

  /**
   * Count total definitions
   */
  async countDefinitions(): Promise<number> {
    return this.definitionStore.count();
  }

  /**
   * Count total instances
   */
  async countInstances(): Promise<number> {
    return this.instanceStore.count();
  }

  /**
   * Seed definitions for testing
   */
  async seedDefinitions(definitions: ProcessDefinitionEntity[]): Promise<void> {
    await this.definitionStore.seed(definitions);
  }

  /**
   * Seed transitions for testing
   */
  async seedTransitions(transitions: ProcessTransitionEntity[]): Promise<void> {
    await this.transitionStore.seed(transitions);
  }

  /**
   * Seed instances for testing
   */
  async seedInstances(instances: ProcessInstanceData[]): Promise<void> {
    await this.instanceStore.seed(instances);
  }
}
