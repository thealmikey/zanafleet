import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { ProposalStatus, InvocationMode } from '../enums/consent.enums';

/**
 * Reasoning Step from AI analysis
 */
export interface ReasoningStep {
  step: string;
  reasoning: string;
  confidence: number;
  timestamp: Date;
}

/**
 * Alternative proposal when user rejects current one
 */
export interface ProposalAlternative {
  capabilityName: string;
  description: string;
  extractedInputs: Record<string, unknown>;
}

/**
 * CapabilityProposal Entity
 * 
 * Tracks a single AI-suggested capability with full audit trail.
 * This is the core domain model that tracks AI-suggested capabilities
 * before user confirmation.
 * 
 * Key concepts:
 * - proposalId: Unique identifier for this proposal
 * - capabilityName: The capability being proposed
 * - extractedInputs: Inferred inputs from user message
 * - confidenceScore: AI confidence score (0-1)
 * - missingInputs: Inputs that need clarification
 * - summary: Human-readable summary of what AI thinks user wants
 * - status: Current status in the proposal lifecycle
 * - streamId: The interaction stream this proposal belongs to
 * - sourceEventId: The event that triggered this proposal
 * - expiresAt: Timestamp when proposal expires (default: 5 minutes)
 * - reasoning: Reasoning chain from AI analysis
 * - alternatives: Suggested alternatives if user wants something different
 */
@Entity('capability_proposals')
@Index(['streamId', 'status'])
@Index(['expiresAt'])
export class CapabilityProposalEntity {
  @PrimaryColumn('uuid')
  proposalId!: string;

  @Column('uuid')
  streamId!: string;

  @Column('uuid', { nullable: true })
  sessionId!: string;

  @Column('varchar', { length: 255 })
  capabilityName!: string;

  @Column('simple-json')
  extractedInputs!: Record<string, unknown>;

  @Column('float')
  confidenceScore!: number;

  @Column('text', { array: true })
  missingInputs!: string[];

  @Column('text')
  summary!: string;

  @Column('enum', { enum: ProposalStatus, default: ProposalStatus.PROPOSED })
  status!: ProposalStatus;

  @Column('enum', { enum: InvocationMode, nullable: true })
  invocationMode!: InvocationMode | null;

  @Column('uuid')
  sourceEventId!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  @Column('timestamp with time zone', { nullable: true })
  confirmedAt!: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  expiresAt!: Date | null;

  @Column('simple-json', { nullable: true })
  reasoning!: ReasoningStep[] | null;

  @Column('simple-json', { nullable: true })
  alternatives!: ProposalAlternative[] | null;

  /**
   * Check if the proposal has expired
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Check if the proposal is in a terminal state
   */
  isTerminal(): boolean {
    return (
      this.status === ProposalStatus.EXECUTED ||
      this.status === ProposalStatus.REJECTED ||
      this.status === ProposalStatus.EXPIRED ||
      this.status === ProposalStatus.CANCELLED ||
      this.status === ProposalStatus.FAILED
    );
  }

  /**
   * Check if the proposal can be confirmed
   */
  canBeConfirmed(): boolean {
    return (
      this.status === ProposalStatus.PROPOSED &&
      !this.isExpired()
    );
  }
}
