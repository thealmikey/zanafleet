import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventBus } from '@nestjs/cqrs';

import { ProcessDefinitionEntity, ProcessState } from '../entities/process-definition.entity';
import {
  ProcessInstanceEntity,
  ProcessInstanceStatus,
  ProcessHistoryEntry,
  GuardEvaluationResult,
  ProcessRelatedEntity,
} from '../entities/process-instance.entity';
import {
  ProcessTransitionEntity,
  GuardConditionConfig,
  TransitionActionConfig,
  TransitionTriggerType,
  GuardType,
} from '../entities/process-transition.entity';
import { ProcessStateChangedEventV1 } from '../events/process-state-changed.event';
import { ProcessCreatedEventV1 } from '../events/process-created.event';

/**
 * Transition Result
 *
 * Result of attempting a state transition.
 */
export interface TransitionResult {
  success: boolean;
  instance?: ProcessInstanceEntity;
  newState?: string;
  guardResults?: GuardEvaluationResult[];
  error?: string;
}

/**
 * Create Process Instance Options
 *
 * Options for creating a new process instance.
 */
export interface CreateProcessInstanceOptions {
  definitionId: string;
  name: string;
  context?: Record<string, unknown>;
  triggeredBy?: string;
  correlationId?: string;
  parentInstanceId?: string;
  relatedEntities?: ProcessRelatedEntity[];
  expiresAt?: Date;
}

/**
 * Trigger Transition Options
 *
 * Options for triggering a state transition.
 */
export interface TriggerTransitionOptions {
  instanceId: string;
  eventType: string;
  eventData?: Record<string, unknown>;
  triggeredBy?: string;
}

/**
 * WorkflowEngineService
 *
 * Core service that handles event-driven state transitions.
 * Implements the Command → Event → Handler → Projection flow.
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    @InjectRepository(ProcessDefinitionEntity)
    private readonly definitionRepository: Repository<ProcessDefinitionEntity>,
    @InjectRepository(ProcessInstanceEntity)
    private readonly instanceRepository: Repository<ProcessInstanceEntity>,
    @InjectRepository(ProcessTransitionEntity)
    private readonly transitionRepository: Repository<ProcessTransitionEntity>,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Create a new process instance
   *
   * @param options - Process instance creation options
   * @returns The created process instance
   */
  async createProcessInstance(
    options: CreateProcessInstanceOptions
  ): Promise<ProcessInstanceEntity> {
    const {
      definitionId,
      name,
      context = {},
      triggeredBy = 'system',
      correlationId,
      parentInstanceId,
      relatedEntities = [],
      expiresAt,
    } = options;

    // Fetch the process definition
    const definition = await this.definitionRepository.findOne({
      where: { definitionId, isActive: true },
    });

    if (!definition) {
      throw new NotFoundException(`Process definition not found: ${definitionId}`);
    }

    // Create the instance
    const instanceId = crypto.randomUUID();
    const initialState = definition.initialState as ProcessState;

    const instance = new ProcessInstanceEntity();
    instance.instanceId = instanceId;
    instance.definitionId = definitionId;
    instance.definition = definition;
    instance.name = name;
    instance.currentState = initialState;
    instance.status = ProcessInstanceStatus.ACTIVE;
    instance.context = context;
    instance.relatedEntities = relatedEntities;
    instance.triggeredBy = triggeredBy;
    instance.correlationId = correlationId ?? undefined;
    instance.parentInstanceId = parentInstanceId ?? undefined;
    instance.expiresAt = expiresAt ?? undefined;
    instance.transitionCount = 0;
    instance.history = [];

    // Save to database
    await this.instanceRepository.save(instance);

    // Publish ProcessCreatedEvent
    const createdEvent = new ProcessCreatedEventV1({
      eventId: crypto.randomUUID(),
      instanceId: instance.instanceId,
      definitionId: instance.definitionId,
      name: instance.name,
      initialState: instance.currentState,
      context: instance.context,
      relatedEntities: instance.relatedEntities,
      triggeredBy: triggeredBy,
      correlationId,
      causationId: parentInstanceId,
    });

    this.eventBus.publish(createdEvent);
    this.logger.log(`Created process instance: ${instanceId} for definition: ${definitionId}`);

    return instance;
  }

  /**
   * Trigger a state transition based on an event
   *
   * @param options - Transition trigger options
   * @returns The transition result
   */
  async triggerTransition(options: TriggerTransitionOptions): Promise<TransitionResult> {
    const { instanceId, eventType, eventData = {}, triggeredBy = 'system' } = options;

    // Find the process instance
    const instance = await this.instanceRepository.findOne({
      where: { instanceId },
      relations: ['definition'],
    });

    if (!instance) {
      return {
        success: false,
        error: `Process instance not found: ${instanceId}`,
      };
    }

    if (instance.status !== ProcessInstanceStatus.ACTIVE) {
      return {
        success: false,
        instance,
        error: `Process instance is not active: ${instance.status}`,
      };
    }

    // Find the matching transition
    const transition = await this.findMatchingTransition(
      instance.definitionId,
      instance.currentState,
      eventType
    );

    if (!transition) {
      this.logger.warn(
        `No transition found for ${instanceId} from state ${instance.currentState} on event ${eventType}`
      );
      return {
        success: false,
        instance,
        error: 'No matching transition found',
      };
    }

    // Evaluate guard conditions
    const guardResults = await this.evaluateGuardConditions(
      transition.guardConditions,
      instance,
      eventData
    );

    // Check if all guards pass
    const allGuardsPassed = guardResults.every((g) => g.passed);

    if (!allGuardsPassed) {
      this.logger.warn(`Guard conditions failed for transition ${transition.transitionId}`);
      return {
        success: false,
        instance,
        guardResults,
        error: 'Guard conditions not met',
      };
    }

    // Execute the transition
    return this.executeTransition(instance, transition, eventData, guardResults, triggeredBy);
  }

  /**
   * Validate if a transition is possible from the current state
   *
   * @param instanceId - The process instance ID
   * @param targetState - The desired target state
   * @returns Validation result with available transitions
   */
  async validateTransition(
    instanceId: string,
    targetState: string
  ): Promise<{
    possible: boolean;
    transition?: ProcessTransitionEntity;
    reason?: string;
  }> {
    const instance = await this.instanceRepository.findOne({
      where: { instanceId },
    });

    if (!instance) {
      throw new NotFoundException(`Process instance not found: ${instanceId}`);
    }

    const transition = await this.findMatchingTransition(
      instance.definitionId,
      instance.currentState,
      undefined,
      targetState
    );

    if (!transition) {
      return {
        possible: false,
        reason: `No transition from ${instance.currentState} to ${targetState}`,
      };
    }

    return {
      possible: true,
      transition,
    };
  }

  /**
   * Get the current state of a process instance
   *
   * @param instanceId - The process instance ID
   * @returns The process instance with current state
   */
  async getProcessState(instanceId: string): Promise<ProcessInstanceEntity> {
    const instance = await this.instanceRepository.findOne({
      where: { instanceId },
      relations: ['definition'],
    });

    if (!instance) {
      throw new NotFoundException(`Process instance not found: ${instanceId}`);
    }

    return instance;
  }

  /**
   * Get all active process instances for a definition
   *
   * @param definitionId - The process definition ID
   * @returns Array of active process instances
   */
  async getActiveInstances(definitionId: string): Promise<ProcessInstanceEntity[]> {
    return this.instanceRepository.find({
      where: {
        definitionId,
        status: ProcessInstanceStatus.ACTIVE,
      },
    });
  }

  /**
   * Execute a state transition
   */
  private async executeTransition(
    instance: ProcessInstanceEntity,
    transition: ProcessTransitionEntity,
    eventData: Record<string, unknown>,
    guardResults: GuardEvaluationResult[],
    triggeredBy: string
  ): Promise<TransitionResult> {
    const previousState = instance.currentState;
    const previousContext = { ...instance.context };

    // Update instance state
    instance.currentState = transition.targetState as ProcessState;
    instance.transitionCount += 1;
    instance.context = { ...instance.context, ...eventData };

    // Check if we reached a terminal state
    const definition = await this.definitionRepository.findOne({
      where: { definitionId: instance.definitionId },
    });

    if (definition?.terminalStates?.includes(transition.targetState)) {
      instance.status = ProcessInstanceStatus.COMPLETED;
      instance.completedAt = new Date();
    }

    // Add history entry
    const historyEntry: ProcessHistoryEntry = {
      transitionId: transition.transitionId,
      fromState: previousState,
      toState: transition.targetState,
      eventType: transition.triggerEventType || 'unknown',
      eventId: (eventData.eventId as string) || crypto.randomUUID(),
      triggeredBy: triggeredBy,
      contextSnapshot: previousContext,
      timestamp: new Date(),
      guardResults,
    };

    instance.history = [...instance.history, historyEntry];

    // Save instance
    await this.instanceRepository.save(instance);

    // Execute post-transition actions
    await this.executeTransitionActions(transition.actions, instance);

    // Publish state changed event
    const stateChangedEvent = new ProcessStateChangedEventV1({
      eventId: crypto.randomUUID(),
      instanceId: instance.instanceId,
      definitionId: instance.definitionId,
      previousState,
      newState: transition.targetState,
      context: instance.context,
      transitionId: transition.transitionId,
      guardResults,
      triggeredBy,
    });

    this.eventBus.publish(stateChangedEvent);

    this.logger.log(
      `Transition executed: ${instance.instanceId} from ${previousState} to ${transition.targetState}`
    );

    return {
      success: true,
      instance,
      newState: transition.targetState,
      guardResults,
    };
  }

  /**
   * Evaluate guard conditions for a transition
   */
  private async evaluateGuardConditions(
    guardConditions: GuardConditionConfig[],
    instance: ProcessInstanceEntity,
    eventData: Record<string, unknown>
  ): Promise<GuardEvaluationResult[]> {
    const results: GuardEvaluationResult[] = [];

    for (const guard of guardConditions) {
      if (guard.guardType === GuardType.EXPRESSION) {
        // Evaluate expression
        const passed = this.evaluateExpression(guard.expression!, {
          context: instance.context,
          eventData,
          currentState: instance.currentState,
        });

        results.push({
          guardName: guard.guardName,
          passed,
          reason: passed ? 'Expression evaluated true' : 'Expression evaluated false',
        });
      } else if (guard.guardType === GuardType.POLICY) {
        // Policy evaluation would integrate with PolicyEngine
        // For now, we'll allow policy-based guards to pass
        results.push({
          guardName: guard.guardName,
          passed: true,
          reason: 'Policy evaluation not implemented - allowing transition',
          policyId: undefined,
        });
      } else {
        // CALLBACK type - not implemented yet
        results.push({
          guardName: guard.guardName,
          passed: true,
          reason: 'Callback evaluation not implemented - allowing transition',
        });
      }
    }

    return results;
  }

  /**
   * Evaluate a simple expression
   */
  private evaluateExpression(
    expression: string,
    context: {
      context: Record<string, unknown>;
      eventData: Record<string, unknown>;
      currentState: string;
    }
  ): boolean {
    try {
      // Simple expression evaluation
      const fn = new Function('context', 'eventData', 'currentState', `return ${expression}`);
      return fn(context.context, context.eventData, context.currentState) as boolean;
    } catch {
      this.logger.error(`Failed to evaluate expression: ${expression}`);
      return false;
    }
  }

  /**
   * Find a matching transition for the given state and event
   */
  private async findMatchingTransition(
    definitionId: string,
    currentState: string,
    eventType?: string,
    targetState?: string
  ): Promise<ProcessTransitionEntity | null> {
    const query = this.transitionRepository
      .createQueryBuilder('transition')
      .where('transition.definitionId = :definitionId', { definitionId })
      .andWhere('transition.sourceState = :sourceState', { sourceState: currentState })
      .andWhere('transition.isActive = :isActive', { isActive: true });

    if (eventType) {
      query.andWhere('transition.triggerEventType = :eventType', { eventType });
      query.andWhere('transition.triggerType = :triggerType', {
        triggerType: TransitionTriggerType.EVENT,
      });
    } else if (targetState) {
      query.andWhere('transition.targetState = :targetState', { targetState });
      query.andWhere('transition.triggerType = :triggerType', {
        triggerType: TransitionTriggerType.MANUAL,
      });
    }

    query.orderBy('transition.priority', 'DESC');

    return query.getOne();
  }

  /**
   * Execute transition actions
   */
  private async executeTransitionActions(
    actions: TransitionActionConfig[],
    instance: ProcessInstanceEntity
  ): Promise<void> {
    for (const action of actions) {
      if (action.async) {
        // Execute asynchronously
        this.executeAction(action, instance).catch((err) =>
          this.logger.error(`Action ${action.actionName} failed: ${err.message}`)
        );
      } else {
        await this.executeAction(action, instance);
      }
    }
  }

  /**
   * Execute a single transition action
   */
  private async executeAction(
    action: TransitionActionConfig,
    instance: ProcessInstanceEntity
  ): Promise<void> {
    if (action.actionType === 'event') {
      // Event publishing would be handled by EventBus
      this.logger.debug(
        `Executing action: ${action.actionName} for instance: ${instance.instanceId}`
      );
    }
    // Service and notification actions would be implemented here
  }
}
