import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { AIFeedbackEntity, AIFeedbackType } from '../entities/ai-feedback.entity';
import { AISuggestionEntity } from '../entities/ai-suggestion.entity';
import { AISuggestionStatus } from '../interfaces/ai-suggestion.interface';

/**
 * AI Suggestion Feedback Service
 *
 * Captures user feedback on AI suggestions.
 * Stores accepted, rejected, and expired feedback for learning and analytics.
 */
@Injectable()
export class AISuggestionFeedbackService {
  private readonly logger = new Logger(AISuggestionFeedbackService.name);

  constructor(
    @InjectRepository(AIFeedbackEntity)
    private readonly feedbackRepository: Repository<AIFeedbackEntity>,
    @InjectRepository(AISuggestionEntity)
    private readonly suggestionRepository: Repository<AISuggestionEntity>
  ) {}

  /**
   * Record accepted suggestion feedback
   */
  async recordAccepted(
    suggestionId: string,
    userComment?: string
  ): Promise<AIFeedbackEntity | null> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      this.logger.warn(`Suggestion not found: ${suggestionId}`);
      return null;
    }

    // Update suggestion status
    suggestion.status = AISuggestionStatus.ACCEPTED;
    await this.suggestionRepository.save(suggestion);

    // Create feedback record
    const feedback = AIFeedbackEntity.fromAcceptedSuggestion({
      id: uuidv4(),
      actorId: suggestion.actorId,
      suggestionId: suggestion.id,
      capability: suggestion.capability,
      confidence: Number(suggestion.confidence),
      riskScore: suggestion.riskScore ?? undefined,
      reason: suggestion.reason,
      userComment,
      contextType: suggestion.contextType,
      contextId: suggestion.contextId,
      workflowState: suggestion.workflowState,
      correlationId: suggestion.correlationId ?? undefined,
    });

    const saved = await this.feedbackRepository.save(feedback);
    this.logger.debug(`Recorded accepted feedback for suggestion: ${suggestionId}`);

    return saved;
  }

  /**
   * Record rejected suggestion feedback
   */
  async recordRejected(
    suggestionId: string,
    userComment?: string
  ): Promise<AIFeedbackEntity | null> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      this.logger.warn(`Suggestion not found: ${suggestionId}`);
      return null;
    }

    // Update suggestion status
    suggestion.status = AISuggestionStatus.REJECTED;
    await this.suggestionRepository.save(suggestion);

    // Create feedback record
    const feedback = AIFeedbackEntity.fromRejectedSuggestion({
      id: uuidv4(),
      actorId: suggestion.actorId,
      suggestionId: suggestion.id,
      capability: suggestion.capability,
      confidence: Number(suggestion.confidence),
      riskScore: suggestion.riskScore ?? undefined,
      reason: suggestion.reason,
      userComment,
      contextType: suggestion.contextType,
      contextId: suggestion.contextId,
      workflowState: suggestion.workflowState,
      correlationId: suggestion.correlationId ?? undefined,
    });

    const saved = await this.feedbackRepository.save(feedback);
    this.logger.debug(`Recorded rejected feedback for suggestion: ${suggestionId}`);

    return saved;
  }

  /**
   * Record expired suggestion feedback
   */
  async recordExpired(suggestionId: string): Promise<AIFeedbackEntity | null> {
    const suggestion = await this.suggestionRepository.findOne({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      this.logger.warn(`Suggestion not found: ${suggestionId}`);
      return null;
    }

    // Update suggestion status
    suggestion.status = AISuggestionStatus.EXPIRED;
    await this.suggestionRepository.save(suggestion);

    // Create feedback record
    const feedback = AIFeedbackEntity.fromExpiredSuggestion({
      id: uuidv4(),
      actorId: suggestion.actorId,
      suggestionId: suggestion.id,
      capability: suggestion.capability,
      confidence: Number(suggestion.confidence),
      riskScore: suggestion.riskScore ?? undefined,
      reason: suggestion.reason,
      contextType: suggestion.contextType,
      contextId: suggestion.contextId,
      workflowState: suggestion.workflowState,
      correlationId: suggestion.correlationId ?? undefined,
    });

    const saved = await this.feedbackRepository.save(feedback);
    this.logger.debug(`Recorded expired feedback for suggestion: ${suggestionId}`);

    return saved;
  }

  /**
   * Get feedback by actor
   */
  async getFeedbackByActor(actorId: string, limit = 100): Promise<AIFeedbackEntity[]> {
    return this.feedbackRepository.find({
      where: { actorId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get feedback by type
   */
  async getFeedbackByType(
    feedbackType: AIFeedbackType,
    limit = 100
  ): Promise<AIFeedbackEntity[]> {
    return this.feedbackRepository.find({
      where: { feedbackType },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get acceptance rate for a capability
   */
  async getAcceptanceRate(capability: string): Promise<number> {
    const total = await this.feedbackRepository.count({
      where: { capability },
    });

    if (total === 0) return 0;

    const accepted = await this.feedbackRepository.count({
      where: {
        capability,
        feedbackType: AIFeedbackType.ACCEPTED,
      },
    });

    return accepted / total;
  }

  /**
   * Get feedback statistics
   */
  async getStatistics(): Promise<{
    total: number;
    accepted: number;
    rejected: number;
    expired: number;
    acceptanceRate: number;
  }> {
    const [total, accepted, rejected, expired] = await Promise.all([
      this.feedbackRepository.count(),
      this.feedbackRepository.count({
        where: { feedbackType: AIFeedbackType.ACCEPTED },
      }),
      this.feedbackRepository.count({
        where: { feedbackType: AIFeedbackType.REJECTED },
      }),
      this.feedbackRepository.count({
        where: { feedbackType: AIFeedbackType.EXPIRED },
      }),
    ]);

    return {
      total,
      accepted,
      rejected,
      expired,
      acceptanceRate: total > 0 ? accepted / total : 0,
    };
  }
}
