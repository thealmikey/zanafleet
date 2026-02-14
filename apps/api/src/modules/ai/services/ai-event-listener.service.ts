import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { AISuggestionStoreService } from './ai-suggestion-store.service';
import { AIRiskAnalyzerService } from './ai-risk-analyzer.service';
import { CreateAISuggestionDTO } from '../interfaces/ai-suggestion.interface';
import { AISuggestionGeneratedEventV1 } from '../events/ai-suggestion-generated.event';

/**
 * AI Event Listener Service
 *
 * Handles workflow and capability events to generate AI suggestions.
 * Uses NestJS CQRS event handlers pattern.
 */

// Default suggestion TTL: 24 hours
const DEFAULT_TTL_HOURS = 24;

@Injectable()
export class AIEventListenerService {
  private readonly logger = new Logger(AIEventListenerService.name);

  constructor(
    private readonly suggestionStore: AISuggestionStoreService,
    private readonly riskAnalyzer: AIRiskAnalyzerService
  ) {}

  /**
   * Determine capability based on workflow state
   */
  private determineCapability(workflowState: string): string {
    const stateToCapability: Record<string, string> = {
      pending: 'submit_for_review',
      in_progress: 'request_assistance',
      awaiting_review: 'check_requirements',
      waiting: 'follow_up',
      pending_approval: 'provide_additional_info',
      draft: 'submit_draft',
    };

    return stateToCapability[workflowState.toLowerCase()] ?? 'check_status';
  }

  /**
   * Generate human-readable reason
   */
  private generateReason(workflowState: string, capability: string): string {
    return `Based on the current state "${workflowState}", consider: ${capability}`;
  }

  /**
   * Generate a suggestion for the given context
   */
  async generateSuggestion(params: {
    actorId: string;
    contextType: string;
    contextId: string;
    workflowState: string;
    previousStates?: string[];
    capability?: string;
    correlationId?: string;
    causationId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AISuggestionGeneratedEventV1 | null> {
    try {
      // Determine suggested capability
      const capability = params.capability ?? this.determineCapability(params.workflowState);
      const reason = this.generateReason(params.workflowState, capability);

      // Analyze risk - handle failure gracefully
      let riskScore = 50; // Default risk score
      try {
        const riskAnalysis = await this.riskAnalyzer.analyzeRisk({
          actorId: params.actorId,
          contextType: params.contextType,
          contextId: params.contextId,
          workflowState: params.workflowState,
          capability,
          confidence: 0.75,
          metadata: params.metadata,
        });
        riskScore = riskAnalysis.riskScore;
      } catch (error) {
        this.logger.warn(
          `Risk analysis failed for ${params.contextType}:${params.contextId}: ${(error as Error).message}`
        );
        // Continue with default risk score
      }

      // Calculate TTL
      const expiresAt = new Date(Date.now() + DEFAULT_TTL_HOURS * 60 * 60 * 1000);

      // Create suggestion DTO
      const suggestionDTO: CreateAISuggestionDTO = {
        actorId: params.actorId,
        contextType: params.contextType,
        contextId: params.contextId,
        workflowState: params.workflowState,
        capability,
        reason,
        confidence: 0.75,
        riskScore,
        expiresAt,
        deduplicationHash: `${params.actorId}:${params.contextType}:${params.contextId}:${params.workflowState}:${capability}`,
      };

      // Store suggestion - handle failure gracefully
      let suggestion;
      try {
        suggestion = await this.suggestionStore.createSuggestion(suggestionDTO);
      } catch (error) {
        this.logger.error(
          `Failed to store suggestion for ${params.contextType}:${params.contextId}: ${(error as Error).message}`,
          (error as Error).stack
        );
        return null;
      }

      // Create suggestion event
      const suggestionEvent = new AISuggestionGeneratedEventV1({
        eventId: uuidv4(),
        aggregateId: suggestion.id,
        actorId: suggestion.actorId,
        suggestionId: suggestion.id,
        contextType: suggestion.contextType,
        contextId: suggestion.contextId,
        workflowState: suggestion.workflowState,
        capability: suggestion.capability,
        reason: suggestion.reason,
        confidence: Number(suggestion.confidence),
        riskScore: suggestion.riskScore ?? undefined,
        expiresAt: suggestion.expiresAt,
        deduplicationHash: suggestion.deduplicationHash ?? undefined,
        correlationId: params.correlationId,
        causationId: params.causationId,
        metadata: params.metadata,
      });

      this.logger.log(
        `Generated suggestion: ${suggestion.id} for ${params.contextType}:${params.contextId}`
      );

      return suggestionEvent;
    } catch (error) {
      this.logger.error(
        `Failed to generate suggestion: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }
}
