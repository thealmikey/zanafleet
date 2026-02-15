import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { InteractionEventType, InteractionActorType } from '../../interaction/entities/interaction-event.entity';
import { InteractionEventRepository } from '../../interaction/repositories/interaction-event.repository';
import { NavigationIntentDto } from '../dto/navigation-intent.dto';
import { CapabilityProposalEntity } from '../entities/capability-proposal.entity';
import { ProposalStatus, InvocationMode } from '../enums/consent.enums';

import { ProposalNotFoundError, InvalidProposalStateError } from './consent-confirmation.service';


/**
 * Execution result from capability orchestrator
 */
export interface ExecutionResult {
  success: boolean;
  navigationIntent?: NavigationIntentDto;
  result?: unknown;
  error?: string;
}

/**
 * CapabilityOrchestrator
 * 
 * Orchestrates capability execution AFTER user confirmation.
 * This is the ONLY path to capability execution - it NEVER auto-invokes.
 * 
 * CRITICAL: execute() MUST check that proposal is CONFIRMED before proceeding.
 */
@Injectable()
export class CapabilityOrchestrator {
  private readonly logger = new Logger(CapabilityOrchestrator.name);
  
  // Registry of capability handlers
  private readonly capabilityHandlers: Map<string, CapabilityHandler> = new Map();

  constructor(
    @InjectRepository(CapabilityProposalEntity)
    private readonly proposalRepository: Repository<CapabilityProposalEntity>,
    private readonly interactionEventRepository: InteractionEventRepository,
  ) {}

  /**
   * Register a capability handler
   */
  registerHandler(capabilityName: string, handler: CapabilityHandler): void {
    this.capabilityHandlers.set(capabilityName, handler);
    this.logger.log(`Registered handler for capability: ${capabilityName}`);
  }

  /**
   * Execute a capability
   * 
   * CRITICAL: This ONLY executes after confirmation check.
   * The proposal MUST be in CONFIRMED status before execution.
   * 
   * @param proposalId - The ID of the confirmed proposal
   * @returns ExecutionResult with navigation intent
   */
  async execute(proposalId: string): Promise<ExecutionResult> {
    this.logger.log(`Executing capability for proposal: ${proposalId}`);

    // Get the proposal
    const proposal = await this.proposalRepository.findOne({
      where: { proposalId },
    });

    if (!proposal) {
      throw new ProposalNotFoundError(proposalId);
    }

    // CRITICAL: Validate proposal is CONFIRMED
    if (proposal.status !== ProposalStatus.CONFIRMED) {
      throw new InvalidProposalStateError(
        `Cannot execute proposal ${proposalId}: status is ${proposal.status}. ` +
        'Proposal must be CONFIRMED before execution.',
      );
    }

    // Get the appropriate handler
    const handler = this.capabilityHandlers.get(proposal.capabilityName);
    
    if (!handler) {
      const error = `No handler registered for capability: ${proposal.capabilityName}`;
      this.logger.error(error);
      
      // Mark as failed
      await this.markAsFailed(proposal, error);
      
      return {
        success: false,
        error,
      };
    }

    try {
      // Execute the capability
      const result = await handler.execute(proposal.extractedInputs);
      
      // Mark as executed
      await this.markAsExecuted(proposal, result);
      
      // Append execution event to stream
      await this.appendExecutionEvent(proposal, result);

      // Generate navigation intent based on result
      const navigationIntent = this.generateNavigationIntent(proposal, result);

      this.logger.log(`Successfully executed capability ${proposal.capabilityName} for proposal ${proposalId}`);

      return {
        success: true,
        navigationIntent,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Execution failed for proposal ${proposalId}: ${errorMessage}`);
      
      // Mark as failed
      await this.markAsFailed(proposal, errorMessage);
      
      // Append failure event
      await this.appendFailureEvent(proposal, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute without proposal ID (direct execution with capability name)
   * This should only be used when the capability doesn't require consent
   */
  async executeDirect(
    capabilityName: string,
    inputs: Record<string, unknown>,
    invocationMode: InvocationMode = InvocationMode.CONVERSATIONAL,
  ): Promise<ExecutionResult> {
    this.logger.log(`Direct executing capability: ${capabilityName}`);

    const handler = this.capabilityHandlers.get(capabilityName);
    
    if (!handler) {
      const error = `No handler registered for capability: ${capabilityName}`;
      this.logger.error(error);
      
      return {
        success: false,
        error,
      };
    }

    try {
      const result = await handler.execute(inputs);
      const navigationIntent = this.generateNavigationIntentFromCapability(capabilityName, result, invocationMode);

      return {
        success: true,
        navigationIntent,
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Direct execution failed for ${capabilityName}: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Mark proposal as executed
   */
  private async markAsExecuted(proposal: CapabilityProposalEntity, _result: unknown): Promise<void> {
    proposal.status = ProposalStatus.EXECUTED;
    proposal.updatedAt = new Date();
    await this.proposalRepository.save(proposal);
  }

  /**
   * Mark proposal as failed
   */
  private async markAsFailed(proposal: CapabilityProposalEntity, _error: string): Promise<void> {
    proposal.status = ProposalStatus.FAILED;
    proposal.updatedAt = new Date();
    await this.proposalRepository.save(proposal);
  }

  /**
   * Append execution event to interaction stream
   */
  private async appendExecutionEvent(
    proposal: CapabilityProposalEntity,
    result: unknown,
  ): Promise<void> {
    try {
      await this.interactionEventRepository.appendToStream(proposal.streamId, {
        id: uuidv4(),
        streamId: proposal.streamId,
        actorId: 'system',
        actorType: InteractionActorType.SYSTEM,
        eventType: 'CAPABILITY_EXECUTED' as InteractionEventType,
        payload: {
          proposalId: proposal.proposalId,
          capabilityName: proposal.capabilityName,
          result,
        },
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to append execution event: ${(error as Error).message}`);
    }
  }

  /**
   * Append failure event to interaction stream
   */
  private async appendFailureEvent(
    proposal: CapabilityProposalEntity,
    error: string,
  ): Promise<void> {
    try {
      await this.interactionEventRepository.appendToStream(proposal.streamId, {
        id: uuidv4(),
        streamId: proposal.streamId,
        actorId: 'system',
        actorType: InteractionActorType.SYSTEM,
        eventType: 'CAPABILITY_FAILED' as InteractionEventType,
        payload: {
          proposalId: proposal.proposalId,
          capabilityName: proposal.capabilityName,
          error,
        },
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(`Failed to append failure event: ${(error as Error).message}`);
    }
  }

  /**
   * Generate navigation intent from execution result
   */
  private generateNavigationIntent(
    proposal: CapabilityProposalEntity,
    result: unknown,
  ): NavigationIntentDto | undefined {
    // Default navigation based on capability name
    const routeMap: Record<string, string> = {
      'CreateOrder': '/orders',
      'RequestMoveEstimate': '/estimates',
      'ProcessPayment': '/payments',
      'ScheduleDelivery': '/deliveries',
      'CreateRider': '/riders',
    };

    const targetRoute = routeMap[proposal.capabilityName] || '/dashboard';

    return new NavigationIntentDto({
      targetRoute,
      hydrationData: {
        capabilityName: proposal.capabilityName,
        result,
        proposalId: proposal.proposalId,
      },
      reason: `${proposal.capabilityName} completed successfully`,
      invocationMode: proposal.invocationMode || InvocationMode.CONVERSATIONAL,
    });
  }

  /**
   * Generate navigation intent for direct execution
   */
  private generateNavigationIntentFromCapability(
    capabilityName: string,
    result: unknown,
    invocationMode: InvocationMode,
  ): NavigationIntentDto | undefined {
    const routeMap: Record<string, string> = {
      'CreateOrder': '/orders',
      'RequestMoveEstimate': '/estimates',
      'ProcessPayment': '/payments',
      'ScheduleDelivery': '/deliveries',
      'CreateRider': '/riders',
    };

    const targetRoute = routeMap[capabilityName] || '/dashboard';

    return new NavigationIntentDto({
      targetRoute,
      hydrationData: {
        capabilityName,
        result,
      },
      reason: `${capabilityName} completed successfully`,
      invocationMode,
    });
  }
}

/**
 * Capability Handler Interface
 */
export interface CapabilityHandler {
  /**
   * Execute the capability with given inputs
   */
  execute(inputs: Record<string, unknown>): Promise<unknown>;
}
