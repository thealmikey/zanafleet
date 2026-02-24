import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

import { AISuggestionEntity } from '../entities/ai-suggestion.entity';
import {
  AISuggestionStatus,
  CreateAISuggestionDTO,
  AISuggestionFilters,
} from '../interfaces/ai-suggestion.interface';

/**
 * AI Suggestion Store Service
 *
 * Handles persistence and retrieval of AI suggestions.
 * Supports TTL-based expiration and deduplication.
 */
@Injectable()
export class AISuggestionStoreService {
  private readonly logger = new Logger(AISuggestionStoreService.name);

  // Default TTL: 24 hours
  private readonly DEFAULT_TTL_HOURS = 24;

  // Max suggestions per context
  private readonly MAX_SUGGESTIONS_PER_CONTEXT = 5;

  constructor(
    @InjectRepository(AISuggestionEntity)
    private readonly suggestionRepository: Repository<AISuggestionEntity>
  ) {}

  /**
   * Create a new suggestion
   */
  async createSuggestion(dto: CreateAISuggestionDTO): Promise<AISuggestionEntity> {
    const id = uuidv4();
    const expiresAt =
      dto.expiresAt ?? new Date(Date.now() + this.DEFAULT_TTL_HOURS * 60 * 60 * 1000);
    const deduplicationHash = dto.deduplicationHash ?? this.generateHash(dto);

    // Check for duplicate
    const existing = await this.findByHash(deduplicationHash);
    if (existing) {
      this.logger.debug(`Duplicate suggestion detected: ${deduplicationHash}`);
      return existing;
    }

    // Check max suggestions per context
    await this.enforceMaxSuggestionsPerContext(dto.actorId, dto.contextType, dto.contextId);

    const entity = AISuggestionEntity.fromDomain({
      id,
      actorId: dto.actorId,
      contextType: dto.contextType,
      contextId: dto.contextId,
      workflowState: dto.workflowState,
      capability: dto.capability,
      reason: dto.reason,
      confidence: dto.confidence,
      riskScore: dto.riskScore,
      status: AISuggestionStatus.PENDING,
      expiresAt,
      deduplicationHash,
    });

    const saved = await this.suggestionRepository.save(entity);
    this.logger.debug(`Created suggestion: ${saved.id}`);
    return saved;
  }

  /**
   * Find suggestion by ID
   */
  async findById(id: string): Promise<AISuggestionEntity | null> {
    return this.suggestionRepository.findOne({ where: { id } });
  }

  /**
   * Find suggestions by filters
   */
  async findByFilters(filters: AISuggestionFilters): Promise<AISuggestionEntity[]> {
    const query = this.suggestionRepository.createQueryBuilder('suggestion');

    if (filters.actorId) {
      query.andWhere('suggestion.actorId = :actorId', { actorId: filters.actorId });
    }

    if (filters.contextType) {
      query.andWhere('suggestion.contextType = :contextType', { contextType: filters.contextType });
    }

    if (filters.contextId) {
      query.andWhere('suggestion.contextId = :contextId', { contextId: filters.contextId });
    }

    if (filters.status) {
      query.andWhere('suggestion.status = :status', { status: filters.status });
    }

    if (filters.capability) {
      query.andWhere('suggestion.capability = :capability', { capability: filters.capability });
    }

    if (filters.fromDate) {
      query.andWhere('suggestion.createdAt >= :fromDate', { fromDate: filters.fromDate });
    }

    if (filters.toDate) {
      query.andWhere('suggestion.createdAt <= :toDate', { toDate: filters.toDate });
    }

    return query.orderBy('suggestion.createdAt', 'DESC').take(100).getMany();
  }

  /**
   * Find pending suggestions for an actor
   */
  async findPendingByActor(actorId: string): Promise<AISuggestionEntity[]> {
    return this.suggestionRepository.find({
      where: {
        actorId,
        status: AISuggestionStatus.PENDING,
        expiresAt: MoreThan(new Date()) as any,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update suggestion status
   */
  async updateStatus(id: string, status: AISuggestionStatus): Promise<AISuggestionEntity | null> {
    const suggestion = await this.findById(id);
    if (!suggestion) {
      return null;
    }

    suggestion.status = status;
    return this.suggestionRepository.save(suggestion);
  }

  /**
   * Accept a suggestion
   */
  async acceptSuggestion(id: string): Promise<AISuggestionEntity | null> {
    return this.updateStatus(id, AISuggestionStatus.ACCEPTED);
  }

  /**
   * Reject a suggestion
   */
  async rejectSuggestion(id: string): Promise<AISuggestionEntity | null> {
    return this.updateStatus(id, AISuggestionStatus.REJECTED);
  }

  /**
   * Expire old pending suggestions
   */
  async expireOldSuggestions(): Promise<number> {
    const result = await this.suggestionRepository.update(
      {
        status: AISuggestionStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      { status: AISuggestionStatus.EXPIRED }
    );

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Expired ${affected} old suggestions`);
    }
    return affected;
  }

  /**
   * Delete expired suggestions (cleanup)
   */
  async deleteExpiredSuggestions(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.suggestionRepository.delete({
      status: AISuggestionStatus.EXPIRED,
      createdAt: LessThan(cutoffDate),
    });

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(`Deleted ${affected} expired suggestions older than ${olderThanDays} days`);
    }
    return affected;
  }

  /**
   * Find by deduplication hash
   */
  private async findByHash(hash: string): Promise<AISuggestionEntity | null> {
    return this.suggestionRepository.findOne({
      where: { deduplicationHash: hash },
    });
  }

  /**
   * Generate deduplication hash
   */
  private generateHash(dto: CreateAISuggestionDTO): string {
    const data = `${dto.actorId}:${dto.contextType}:${dto.contextId}:${dto.workflowState}:${dto.capability}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 64);
  }

  /**
   * Enforce max suggestions per context
   */
  private async enforceMaxSuggestionsPerContext(
    actorId: string,
    contextType: string,
    contextId: string
  ): Promise<void> {
    const count = await this.suggestionRepository.count({
      where: {
        actorId,
        contextType,
        contextId,
        status: AISuggestionStatus.PENDING,
      },
    });

    if (count >= this.MAX_SUGGESTIONS_PER_CONTEXT) {
      // Delete oldest pending suggestion
      const oldest = await this.suggestionRepository.findOne({
        where: {
          actorId,
          contextType,
          contextId,
          status: AISuggestionStatus.PENDING,
        },
        order: { createdAt: 'ASC' },
      });

      if (oldest) {
        await this.suggestionRepository.delete({ id: oldest.id });
        this.logger.debug(`Removed oldest suggestion to enforce max limit: ${oldest.id}`);
      }
    }
  }
}
