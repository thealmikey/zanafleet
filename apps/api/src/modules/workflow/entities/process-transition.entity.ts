import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProcessDefinitionEntity } from './process-definition.entity';

/**
 * Transition Trigger Type
 *
 * Defines what type of event can trigger this transition.
 */
export enum TransitionTriggerType {
  EVENT = 'event',
  MANUAL = 'manual',
  TIMEOUT = 'timeout',
  AI_SUGGESTION = 'ai_suggestion',
}

/**
 * Guard Condition Type
 *
 * Defines how guard conditions are evaluated.
 */
export enum GuardType {
  POLICY = 'policy',
  EXPRESSION = 'expression',
  CALLBACK = 'callback',
}

/**
 * Guard Condition Configuration
 *
 * Defines a guard condition for the transition.
 */
export interface GuardConditionConfig {
  guardType: GuardType;
  guardName: string;
  expression?: string;
  policyScope?: string;
  policyAction?: string;
  callbackService?: string;
  failMessage: string;
}

/**
 * Transition Action Configuration
 *
 * Defines an action to execute during transition.
 */
export interface TransitionActionConfig {
  actionType: 'event' | 'service' | 'notification';
  actionName: string;
  serviceName?: string;
  payload?: Record<string, unknown>;
  async: boolean;
  onFailure: 'continue' | 'rollback' | 'abort';
}

/**
 * Process Transition Entity
 *
 * Defines an explicit transition between two states.
 * Includes guard conditions and actions.
 */
@Entity({ name: 'process_transitions' })
export class ProcessTransitionEntity {
  @PrimaryColumn('uuid')
  transitionId!: string;

  @Index('IDX_process_transitions_definition_id')
  @Column('uuid')
  definitionId!: string;

  @ManyToOne(() => ProcessDefinitionEntity)
  @JoinColumn({ name: 'definitionId' })
  definition!: ProcessDefinitionEntity;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column()
  sourceState!: string;

  @Column()
  targetState!: string;

  @Column({
    type: 'enum',
    enum: TransitionTriggerType,
    default: TransitionTriggerType.EVENT,
  })
  triggerType!: TransitionTriggerType;

  @Column({ nullable: true })
  triggerEventType!: string;

  @Column('simple-json', { default: [] })
  guardConditions!: GuardConditionConfig[];

  @Column('simple-json', { default: [] })
  actions!: TransitionActionConfig[];

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: 0 })
  priority!: number;

  @Column({ nullable: true })
  timeoutMs!: number;

  @Column({ nullable: true })
  timeoutEventType!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain representation
   */
  toDomain(): {
    transitionId: string;
    definitionId: string;
    name: string;
    description: string;
    sourceState: string;
    targetState: string;
    triggerType: TransitionTriggerType;
    triggerEventType: string;
    guardConditions: GuardConditionConfig[];
    actions: TransitionActionConfig[];
    isActive: boolean;
    priority: number;
    timeoutMs: number | undefined;
    timeoutEventType: string | undefined;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      transitionId: this.transitionId,
      definitionId: this.definitionId,
      name: this.name,
      description: this.description,
      sourceState: this.sourceState,
      targetState: this.targetState,
      triggerType: this.triggerType,
      triggerEventType: this.triggerEventType,
      guardConditions: this.guardConditions,
      actions: this.actions,
      isActive: this.isActive,
      priority: this.priority,
      timeoutMs: this.timeoutMs,
      timeoutEventType: this.timeoutEventType,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    transitionId: string;
    definitionId: string;
    name: string;
    description: string;
    sourceState: string;
    targetState: string;
    triggerType: TransitionTriggerType;
    triggerEventType?: string;
    guardConditions?: GuardConditionConfig[];
    actions?: TransitionActionConfig[];
    isActive?: boolean;
    priority?: number;
    timeoutMs?: number;
    timeoutEventType?: string;
  }): ProcessTransitionEntity {
    const e = new ProcessTransitionEntity();
    e.transitionId = data.transitionId;
    e.definitionId = data.definitionId;
    e.name = data.name;
    e.description = data.description;
    e.sourceState = data.sourceState;
    e.targetState = data.targetState;
    e.triggerType = data.triggerType;
    e.triggerEventType = data.triggerEventType ?? '';
    e.guardConditions = data.guardConditions ?? [];
    e.actions = data.actions ?? [];
    e.isActive = data.isActive ?? true;
    e.priority = data.priority ?? 0;
    e.timeoutMs = data.timeoutMs ?? 0;
    e.timeoutEventType = data.timeoutEventType ?? '';
    return e;
  }
}
