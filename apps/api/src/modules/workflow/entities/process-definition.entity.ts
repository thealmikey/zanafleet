import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

import { ProcessTransitionEntity } from './process-transition.entity';

/**
 * Process State Enum
 *
 * Defines all possible states for process instances.
 * States are process-agnostic - specific processes use subsets.
 */
export enum ProcessState {
  // Initial states
  DRAFT = 'draft',
  ESTIMATE_REQUESTED = 'estimate_requested',
  OPTIONS_PRESENTED = 'options_presented',

  // Confirmation states
  BOOKING_CONFIRMED = 'booking_confirmed',
  PAYMENT_AUTHORIZED = 'payment_authorized',

  // Assignment states
  DRIVER_ASSIGNED = 'driver_assigned',
  VEHICLE_ASSIGNED = 'vehicle_assigned',

  // Active states
  IN_PROGRESS = 'in_progress',
  ARRIVED = 'arrived',
  LOADING = 'loading',
  UNLOADING = 'unloading',

  // Terminal states
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Process Definition Entity
 *
 * Represents a process template/blueprint that can be instantiated.
 * Example: MoveBookingProcess, RefundProcess, OnboardingProcess
 */
@Entity({ name: 'process_definitions' })
export class ProcessDefinitionEntity {
  @PrimaryColumn('uuid')
  definitionId!: string;

  @Index('IDX_process_definitions_name')
  @Column()
  name!: string;

  @Column()
  description!: string;

  @Index('IDX_process_definitions_version')
  @Column({ default: '1.0.0' })
  version!: string;

  @Index('IDX_process_definitions_is_active')
  @Column({ default: true })
  isActive!: boolean;

  @Column('simple-array', { nullable: true })
  allowedStates!: string[];

  @Column('jsonb', { nullable: true })
  metadata!: Record<string, unknown>;

  @Column({ nullable: true })
  initialState!: string;

  @Column('simple-array', { nullable: true })
  terminalStates!: string[];

  @OneToMany(() => ProcessTransitionEntity, (transition) => transition.definition)
  transitions!: ProcessTransitionEntity[];

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain representation
   */
  toDomain(): {
    definitionId: string;
    name: string;
    description: string;
    version: string;
    isActive: boolean;
    allowedStates: string[];
    metadata: Record<string, unknown>;
    initialState: string;
    terminalStates: string[];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      definitionId: this.definitionId,
      name: this.name,
      description: this.description,
      version: this.version,
      isActive: this.isActive,
      allowedStates: this.allowedStates,
      metadata: this.metadata,
      initialState: this.initialState,
      terminalStates: this.terminalStates,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    definitionId: string;
    name: string;
    description: string;
    version?: string;
    isActive?: boolean;
    allowedStates?: string[];
    metadata?: Record<string, unknown>;
    initialState?: string;
    terminalStates?: string[];
  }): ProcessDefinitionEntity {
    const e = new ProcessDefinitionEntity();
    e.definitionId = data.definitionId;
    e.name = data.name;
    e.description = data.description;
    e.version = data.version ?? '1.0.0';
    e.isActive = data.isActive ?? true;
    e.allowedStates = data.allowedStates ?? [];
    e.metadata = data.metadata ?? {};
    e.initialState = data.initialState ?? '';
    e.terminalStates = data.terminalStates ?? [];
    return e;
  }
}
