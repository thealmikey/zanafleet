import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { InteractionEventType, InteractionActorType } from '../../interaction/entities/interaction-event.entity';
import { InteractionEventRepository } from '../../interaction/repositories/interaction-event.repository';
import { NavigationIntentDto } from '../dto/navigation-intent.dto';
import { CapabilityProposalEntity, ReasoningStep, ProposalAlternative } from '../entities/capability-proposal.entity';
import { ProposalStatus, InvocationMode, ConfirmationAction } from '../enums/consent.enums';

/**
 * Result of a confirmation action
 */
export interface ConfirmationResult {
  success: boolean;
  proposal: CapabilityProposalEntity;
  navigationIntent?: NavigationIntentDto;
  executionResult?: unknown;
  error?: string;
}

/**
 * UserConfirmation Event
 * 
 * Captured when user responds to a proposal
 */
export interface UserConfirmation {
  confirmationId: string;
  proposalId: string;
  streamId: string;
  action: ConfirmationAction;
  modifiedInputs?: Record<string, unknown>;
  reason?: string;
  actorId: string;
  actorType: 'USER' | 'SYSTEM';
  timestamp: Date;
}

/**
 * Errors
 */
export class ProposalNotFoundError extends Error {
  constructor(proposalId: string) {
    super(`Proposal not found: ${proposalId}`);
    this.name = 'ProposalNotFoundError';
  }
}

export class InvalidProposalStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidProposalStateError';
  }
}

export class ProposalExpiredError extends Error {
  constructor(proposalId: string) {
    super(`Proposal expired: ${proposalId}`);
    this.name = 'ProposalExpiredError';
  }
}

export class UnknownConfirmationActionError extends Error {
  constructor(action: ConfirmationAction) {
    super(`Unknown confirmation action: ${action}`);
    this.name = 'UnknownConfirmationActionError';
  }
}

/**
 * ConsentConfirmationService
 * 
 * Handles the confirmation workflow for capability proposals.
 * This service ensures user sovereignty by requiring explicit confirmation
 * before any capability execution.
 */
@Injectable()
export class ConsentConfirmationService {
  private readonly logger = new Logger(ConsentConfirmationService.name);
  private readonly DEFAULT_EXPIRY_MINUTES = 5;

  constructor(
    @InjectRepository(CapabilityProposalEntity)
    private readonly proposalRepository: Repository<CapabilityProposalEntity>,
    private readonly interactionEventRepository: InteractionEventRepository,
  ) {}

  /**
   * Create a new proposal from AI analysis
   * 
   * IMPORTANT: This does NOT execute the capability
   * It only creates a proposal and appends to InteractionStream
   */
  async createProposal(
    streamId: string,
    sessionId: string,
    sourceEventId: string,
    capabilityName: string,
    extractedInputs: Record<string, unknown>,
    confidenceScore: number,
    missingInputs: string[],
    summary: string,
    reasoning?: ReasoningStep[],
    alternatives?: ProposalAlternative[],
    invocationMode?: InvocationMode,
  ): Promise<CapabilityProposalEntity> {
    const proposalId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.DEFAULT_EXPIRY_MINUTES * 60 * 1000);

    const proposal = this.proposalRepository.create({
      proposalId,
      streamId,
      sessionId,
      capabilityName,
      extractedInputs,
      confidenceScore,
      missingInputs,
      summary,
      status: ProposalStatus.PROPOSED,
      sourceEventId,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      reasoning: reasoning ?? null,
      alternatives: alternatives ?? null,
      invocationMode: invocationMode ?? undefined,
    });

    // Persist proposal
    await this.proposalRepository.save(proposal);
    this.logger.log(`Created proposal ${proposalId} for capability ${capabilityName}`);

    // Append PROPOSAL_CREATED event to InteractionStream (append-only, immutable)
    try {
      await this.interactionEventRepository.appendToStream(streamId, {
        id: uuidv4(),
        streamId,
        actorId: 'system', // AI system
        actorType: InteractionActorType.AI_AGENT,
        eventType: 'CAPABILITY_PROPOSED' as InteractionEventType,
        payload: {
          proposalId,
          capabilityName,
          summary,
          confidenceScore,
          missingInputs,
          expiresAt: proposal.expiresAt,
        },
        createdAt: now,
      });
    } catch (error) {
      this.logger.warn(`Failed to append proposal event to interaction stream: ${(error as Error).message}`);
      // Don't fail the proposal creation if event append fails
    }

    return proposal;
  }

  /**
   * Process user confirmation
   * 
   * This is the ONLY path to capability execution
   * User must explicitly confirm before execute() is called
   */
  async processConfirmation(
    proposalId: string,
    action: ConfirmationAction,
    actorId: string,
    modifiedInputs?: Record<string, unknown>,
    reason?: string,
  ): Promise<ConfirmationResult> {
    const proposal = await this.proposalRepository.findOne({
      where: { proposalId },
    });

    if (!proposal) {
      throw new ProposalNotFoundError(proposalId);
    }

    if (proposal.status !== ProposalStatus.PROPOSED) {
      throw new InvalidProposalStateError(
        `Proposal ${proposalId} is not in PROPOSED state: ${proposal.status}`,
      );
    }

    if (proposal.expiresAt && new Date() > proposal.expiresAt) {
      await this.expireProposal(proposalId);
      throw new ProposalExpiredError(proposalId);
    }

    const confirmation: UserConfirmation = {
      confirmationId: uuidv4(),
      proposalId,
      streamId: proposal.streamId,
      action,
      modifiedInputs,
      reason,
      actorId,
      actorType: 'USER',
      timestamp: new Date(),
    };

    // Append confirmation to InteractionStream (append-only, immutable)
    try {
      await this.interactionEventRepository.appendToStream(proposal.streamId, {
        id: uuidv4(),
        streamId: proposal.streamId,
        actorId,
        actorType: InteractionActorType.USER,
        eventType: this.mapActionToEventType(action),
        payload: confirmation as unknown as Record<string, unknown>,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to append confirmation event: ${(error as Error).message}`);
    }

    // Process based on action
    switch (action) {
      case ConfirmationAction.CONFIRM:
        return await this.confirmProposal(proposal, confirmation);

      case ConfirmationAction.REJECT:
        return await this.rejectProposal(proposal, confirmation);

      case ConfirmationAction.MODIFY:
      case ConfirmationAction.EDIT:
        return await this.modifyProposal(proposal, confirmation, modifiedInputs!);

      case ConfirmationAction.CANCEL:
        return await this.cancelProposal(proposal, confirmation);

      case ConfirmationAction.REQUEST_CLARIFICATION:
        return await this.requestClarification(proposal, confirmation);

      case ConfirmationAction.SWITCH_CAPABILITY:
        return await this.switchCapability(proposal, confirmation, modifiedInputs);

      default:
        throw new UnknownConfirmationActionError(action);
    }
  }

  /**
   * Confirm a proposal - transitions to CONFIRMED state
   */
  private async confirmProposal(
    proposal: CapabilityProposalEntity,
    _confirmation: UserConfirmation,
  ): Promise<ConfirmationResult> {
    const now = new Date();

    // Update proposal status
    proposal.status = ProposalStatus.CONFIRMED;
    proposal.confirmedAt = now;
    proposal.updatedAt = now;
    await this.proposalRepository.save(proposal);

    this.logger.log(`Proposal ${proposal.proposalId} confirmed`);

    // Return success - caller should invoke CapabilityOrchestrator.execute()
    return {
      success: true,
      proposal,
    };
  }

  /**
   * Reject a proposal - transitions to REJECTED state
   */
  private async rejectProposal(
    proposal: CapabilityProposalEntity,
    _confirmation: UserConfirmation,
  ): Promise<ConfirmationResult> {
    const now = new Date();

    proposal.status = ProposalStatus.REJECTED;
    proposal.updatedAt = now;
    await this.proposalRepository.save(proposal);

    this.logger.log(`Proposal ${proposal.proposalId} rejected`);

    return {
      success: true,
      proposal,
    };
  }

  /**
   * Modify a proposal - updates inputs and keeps as PROPOSED
   */
  private async modifyProposal(
    proposal: CapabilityProposalEntity,
    _confirmation: UserConfirmation,
    modifiedInputs: Record<string, unknown>,
  ): Promise<ConfirmationResult> {
    const now = new Date();

    // Update extracted inputs with modifications
    proposal.extractedInputs = {
      ...proposal.extractedInputs,
      ...modifiedInputs,
    };
    proposal.updatedAt = now;
    await this.proposalRepository.save(proposal);

    this.logger.log(`Proposal ${proposal.proposalId} modified`);

    return {
      success: true,
      proposal,
    };
  }

  /**
   * Cancel a proposal - transitions to CANCELLED state
   */
  private async cancelProposal(
    proposal: CapabilityProposalEntity,
    _confirmation: UserConfirmation,
  ): Promise<ConfirmationResult> {
    const now = new Date();

    proposal.status = ProposalStatus.CANCELLED;
    proposal.updatedAt = now;
    await this.proposalRepository.save(proposal);

    this.logger.log(`Proposal ${proposal.proposalId} cancelled`);

    return {
      success: true,
      proposal,
    };
  }

  /**
   * Request clarification - returns proposal for AI to generate clarification
   */
  private async requestClarification(
    proposal: CapabilityProposalEntity,
    _confirmation: UserConfirmation,
  ): Promise<ConfirmationResult> {
    this.logger.log(`Clarification requested for proposal ${proposal.proposalId}`);

    // Keep proposal in PROPOSED state for AI to generate clarification
    return {
      success: true,
      proposal,
    };
  }

  /**
   * Switch capability - reject current and suggest new
   */
  private async switchCapability(
    proposal: CapabilityProposalEntity,
    _confirmation: UserConfirmation,
    _modifiedInputs?: Record<string, unknown>,
  ): Promise<ConfirmationResult> {
    // Mark current as cancelled
    const now = new Date();
    proposal.status = ProposalStatus.CANCELLED;
    proposal.updatedAt = now;
    await this.proposalRepository.save(proposal);

    this.logger.log(`Proposal ${proposal.proposalId} switched to new capability`);

    return {
      success: true,
      proposal,
    };
  }

  /**
   * Expire a proposal - transitions to EXPIRED state
   */
  async expireProposal(proposalId: string): Promise<void> {
    const proposal = await this.proposalRepository.findOne({
      where: { proposalId },
    });

    if (!proposal) {
      throw new ProposalNotFoundError(proposalId);
    }

    proposal.status = ProposalStatus.EXPIRED;
    proposal.updatedAt = new Date();
    await this.proposalRepository.save(proposal);

    this.logger.log(`Proposal ${proposalId} expired`);
  }

  /**
   * Get a proposal by ID
   */
  async getProposal(proposalId: string): Promise<CapabilityProposalEntity | null> {
    return this.proposalRepository.findOne({
      where: { proposalId },
    });
  }

  /**
   * Get all proposals for a session
   */
  async getProposalsBySession(sessionId: string): Promise<CapabilityProposalEntity[]> {
    return this.proposalRepository.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get all proposals for a stream
   */
  async getProposalsByStream(streamId: string): Promise<CapabilityProposalEntity[]> {
    return this.proposalRepository.find({
      where: { streamId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get active (non-terminal) proposals for a stream
   */
  async getActiveProposalsByStream(streamId: string): Promise<CapabilityProposalEntity[]> {
    return this.proposalRepository
      .createQueryBuilder('proposal')
      .where('proposal.streamId = :streamId', { streamId })
      .andWhere('proposal.status IN (:...statuses)', {
        statuses: [ProposalStatus.PROPOSED, ProposalStatus.CONFIRMED],
      })
      .orderBy('proposal.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Map confirmation action to interaction event type
   */
  private mapActionToEventType(action: ConfirmationAction): InteractionEventType {
    const mapping: Record<ConfirmationAction, InteractionEventType> = {
      [ConfirmationAction.CONFIRM]: 'CAPABILITY_CONFIRMED' as InteractionEventType,
      [ConfirmationAction.REJECT]: 'CAPABILITY_REJECTED' as InteractionEventType,
      [ConfirmationAction.EDIT]: 'CAPABILITY_MODIFIED' as InteractionEventType,
      [ConfirmationAction.MODIFY]: 'CAPABILITY_MODIFIED' as InteractionEventType,
      [ConfirmationAction.CANCEL]: 'CAPABILITY_CANCELLED' as InteractionEventType,
      [ConfirmationAction.REQUEST_CLARIFICATION]: 'AI_RESPONSE' as InteractionEventType,
      [ConfirmationAction.SWITCH_CAPABILITY]: 'CAPABILITY_CANCELLED' as InteractionEventType,
    };
    return mapping[action];
  }
}
