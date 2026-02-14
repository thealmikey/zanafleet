import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '@api/core/event-bus';
import { v4 as uuidv4 } from 'uuid';

import { AISuggestionStoreService } from './ai-suggestion-store.service';
import { AIRiskAnalyzerService } from './ai-risk-analyzer.service';
import { AIHangingStateDetectedEventV1 } from '../events/ai-hanging-state-detected.event';
import { AISuggestionGeneratedEventV1 } from '../events/ai-suggestion-generated.event';
import { CreateAISuggestionDTO } from '../interfaces/ai-suggestion.interface';

/**
 * AI Reminder Engine Service
 *
 * Generates reminder suggestions based on hanging states.
 * Does NOT send push/email directly - creates suggestions that can be acted upon.
 */
@Injectable()
export class AIReminderEngineService {
  private readonly logger = new Logger(AIReminderEngineService.name);

  // Default reminder TTL: 4 hours
  private readonly DEFAULT_REMINDER_TTL_HOURS = 4;

  constructor(
    private readonly suggestionStore: AISuggestionStoreService,
    private readonly riskAnalyzer: AIRiskAnalyzerService,
    private readonly eventBus: EventBusService
  ) {}

  /**
   * Generate a reminder suggestion for a hanging state
   */
  async generateReminderSuggestion(
    hangingEvent: AIHangingStateDetectedEventV1
  ): Promise<AISuggestionGeneratedEventV1 | null> {
    this.logger.debug(
      `Generating reminder suggestion for hanging state: ${hangingEvent.contextType}:${hangingEvent.contextId}`
    );

    try {
      // Determine capability based on hanging state
      const capability = this.determineReminderCapability(hangingEvent);
      const reason = this.generateReminderReason(hangingEvent);

      // Analyze risk
      const riskAnalysis = await this.riskAnalyzer.analyzeRisk({
        actorId: hangingEvent.actorId,
        contextType: hangingEvent.contextType,
        contextId: hangingEvent.contextId,
        workflowState: hangingEvent.workflowState,
        capability,
        confidence: 0.7, // Moderate confidence for reminders
        metadata: {
          previousState: hangingEvent.previousState,
          durationMs: hangingEvent.durationMs,
          expectedDurationMs: hangingEvent.expectedDurationMs,
          severityRatio: hangingEvent.getSeverityRatio(),
        },
      });

      // Calculate TTL based on severity
      const ttlHours = this.calculateReminderTTL(hangingEvent);
      const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      // Create suggestion DTO
      const suggestionDTO: CreateAISuggestionDTO = {
        actorId: hangingEvent.actorId,
        contextType: hangingEvent.contextType,
        contextId: hangingEvent.contextId,
        workflowState: hangingEvent.workflowState,
        capability,
        reason,
        confidence: 0.7,
        riskScore: riskAnalysis.riskScore,
        expiresAt,
        deduplicationHash: `${hangingEvent.actorId}:${hangingEvent.contextType}:${hangingEvent.contextId}:reminder:${capability}`,
      };

      // Store suggestion
      const suggestion = await this.suggestionStore.createSuggestion(suggestionDTO);

      // Emit event
      const event = new AISuggestionGeneratedEventV1({
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
        correlationId: hangingEvent.correlationId,
        causationId: hangingEvent.eventId,
        metadata: {
          isReminder: true,
          hangingStateDurationMs: hangingEvent.durationMs,
          severityRatio: hangingEvent.getSeverityRatio(),
        },
      });

      await this.eventBus.publish('ai.suggestion.generated', event);

      this.logger.log(
        `Generated reminder suggestion: ${suggestion.id} for ${hangingEvent.contextType}:${hangingEvent.contextId}`
      );

      return event;
    } catch (error) {
      this.logger.error(
        `Failed to generate reminder suggestion: ${(error as Error).message}`,
        (error as Error).stack
      );
      return null;
    }
  }

  /**
   * Determine the appropriate capability for a reminder
   */
  private determineReminderCapability(event: AIHangingStateDetectedEventV1): string {
    // Use suggested capability from event if available
    if (event.suggestedCapability) {
      return event.suggestedCapability;
    }

    // Default capabilities based on workflow state
    const stateToCapability: Record<string, string> = {
      pending: 'check_status',
      in_progress: 'request_update',
      awaiting_review: 'submit_review',
      waiting: 'send_reminder',
      pending_approval: 'request_approval',
    };

    return stateToCapability[event.workflowState.toLowerCase()] ?? 'check_status';
  }

  /**
   * Generate a human-readable reason for the reminder
   */
  private generateReminderReason(event: AIHangingStateDetectedEventV1): string {
    const severityRatio = event.getSeverityRatio();
    const durationMinutes = Math.round(event.durationMs / 60000);
    const expectedMinutes = Math.round(event.expectedDurationMs / 60000);

    if (severityRatio >= 2) {
      return `This item has been in "${event.workflowState}" state for ${durationMinutes} minutes (expected: ${expectedMinutes} minutes). Action may be required.`;
    }

    return `This item has been in "${event.workflowState}" state for ${durationMinutes} minutes. Consider checking for updates.`;
  }

  /**
   * Calculate TTL based on severity
   */
  private calculateReminderTTL(event: AIHangingStateDetectedEventV1): number {
    const severityRatio = event.getSeverityRatio();

    if (severityRatio > 2) {
      // Critical: shorter TTL
      return 2;
    }

    if (severityRatio > 1.5) {
      // High: medium TTL
      return 3;
    }

    // Normal: default TTL
    return this.DEFAULT_REMINDER_TTL_HOURS;
  }
}
