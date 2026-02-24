import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { VisibilityTokenStatus, VisibilityTokenType } from '../dto/advertising.enums';
import { VisibilityToken } from '../entities/visibility-token.entity';

/**
 * VisibilityScoringService
 *
 * Calculates visibility boost scores for search results and listings.
 * Supports multiple token types with different boost multipliers.
 */
@Injectable()
export class VisibilityScoringService {
  constructor(
    @InjectRepository(VisibilityToken)
    private readonly visibilityTokenRepository: Repository<VisibilityToken>
  ) {}

  /**
   * Get total boost score for a target (rider, business, etc.)
   */
  async getBoostScore(targetType: string, targetId: string): Promise<number> {
    const activeTokens = await this.visibilityTokenRepository.find({
      where: {
        targetType,
        targetId,
        status: VisibilityTokenStatus.ACTIVE,
        startedAt: LessThanOrEqual(new Date()),
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });

    if (activeTokens.length === 0) {
      return 0;
    }

    // Calculate combined boost score
    const totalScore = activeTokens.reduce((sum, token) => {
      return sum + token.calculateBoostScore();
    }, 0);

    return Math.min(totalScore, 100); // Cap at 100
  }

  /**
   * Get active tokens for a target
   */
  async getActiveTokens(targetType: string, targetId: string): Promise<VisibilityToken[]> {
    return this.visibilityTokenRepository.find({
      where: {
        targetType,
        targetId,
        status: VisibilityTokenStatus.ACTIVE,
        startedAt: LessThanOrEqual(new Date()),
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });
  }

  /**
   * Check if target has a specific token type
   */
  async hasTokenType(
    targetType: string,
    targetId: string,
    tokenType: VisibilityTokenType
  ): Promise<boolean> {
    const token = await this.visibilityTokenRepository.findOne({
      where: {
        targetType,
        targetId,
        tokenType,
        status: VisibilityTokenStatus.ACTIVE,
        startedAt: LessThanOrEqual(new Date()),
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });

    return !!token;
  }

  /**
   * Get all targets with active visibility tokens for a workspace
   */
  async getBoostedTargets(
    workspaceId: string,
    targetType?: string
  ): Promise<{ targetType: string; targetId: string; boostScore: number }[]> {
    const query = this.visibilityTokenRepository
      .createQueryBuilder('token')
      .where('token.workspaceId = :workspaceId', { workspaceId })
      .andWhere('token.status = :status', { status: VisibilityTokenStatus.ACTIVE })
      .andWhere('token.startedAt <= :now', { now: new Date() })
      .andWhere('token.expiresAt >= :now', { now: new Date() });

    if (targetType) {
      query.andWhere('token.targetType = :targetType', { targetType });
    }

    const tokens = await query.getMany();

    // Group by target and calculate scores
    const targetMap = new Map<
      string,
      { targetType: string; targetId: string; boostScore: number }
    >();

    for (const token of tokens) {
      const key = `${token.targetType}:${token.targetId}`;
      const existing = targetMap.get(key);

      if (existing) {
        existing.boostScore += token.calculateBoostScore();
      } else {
        targetMap.set(key, {
          targetType: token.targetType,
          targetId: token.targetId,
          boostScore: token.calculateBoostScore(),
        });
      }
    }

    // Sort by boost score descending
    return Array.from(targetMap.values()).sort((a, b) => b.boostScore - a.boostScore);
  }

  /**
   * Apply boost score to search results
   * This should be called by the search service to reorder results
   */
  async applyVisibilityBoost<T extends { id: string }>(
    results: T[],
    targetType: string,
    _getWorkspaceId: (item: T) => string
  ): Promise<T[]> {
    // For each result, get its boost score and reorder
    const resultsWithBoost = await Promise.all(
      results.map(async (item) => {
        const boostScore = await this.getBoostScore(targetType, item.id);
        return { item, boostScore };
      })
    );

    // Sort by boost score (descending), keeping original order for equal scores
    return resultsWithBoost
      .sort((a, b) => {
        if (b.boostScore !== a.boostScore) {
          return b.boostScore - a.boostScore;
        }
        return 0;
      })
      .map((r) => r.item);
  }

  /**
   * Get pricing for each token type
   */
  getTokenPricing(): Record<VisibilityTokenType, { basePrice: number; duration: number }> {
    return {
      [VisibilityTokenType.BOOST]: {
        basePrice: 500, // KES per day
        duration: 7, // 7 days
      },
      [VisibilityTokenType.PREMIUM]: {
        basePrice: 2000, // KES per month
        duration: 30,
      },
      [VisibilityTokenType.FEATURED]: {
        basePrice: 5000, // KES per month
        duration: 30,
      },
      [VisibilityTokenType.TOP_RESULT]: {
        basePrice: 10000, // KES per month
        duration: 30,
      },
    };
  }

  /**
   * Calculate price for a token
   */
  calculateTokenPrice(tokenType: VisibilityTokenType, durationDays: number): number {
    const pricing = this.getTokenPricing();
    const { basePrice, duration } = pricing[tokenType];

    // Calculate daily rate
    const dailyRate = basePrice / duration;
    return Math.ceil(dailyRate * durationDays);
  }
}
