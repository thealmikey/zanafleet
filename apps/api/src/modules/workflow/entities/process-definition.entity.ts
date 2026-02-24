import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProcessState } from './process-state.enum';

// Note: ProcessTransitionEntity is referenced by name in the decorator to avoid circular dependency
// Import ProcessState for use in the entity class
type ProcessStateEnum = typeof ProcessState;

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

  @OneToMany('ProcessTransitionEntity', (transition: any) => transition.definition)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transitions!: any[];

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
