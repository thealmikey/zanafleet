/**
 * Intelligence Snapshot Service
 *
 * Service for managing intelligence snapshots following the storage strategy.
 * Handles creation, updates, and retrieval of snapshots for move intelligence.
 *
 * @module media-insight/services
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { MoveRecommendation } from '../../intelligence/intelligence-context';
import { IntelligenceSnapshotEntity, ProfileSource } from '../entities/intelligence-snapshot.entity';
import type { MediaInsight } from '../interfaces';

/**
 * Summary of a snapshot for API responses.
 */
export interface SnapshotSummary {
  /** Unique identifier for the snapshot */
  snapshotId: string;
  /** ID of the order this snapshot belongs to */
  orderId: string;
  /** Whether the snapshot has media insight data */
  hasMediaInsight: boolean;
  /** Overall confidence score for the recommendation */
  confidenceScore: number;
  /** Source of the profile data */
  profileSource: ProfileSource;
  /** Timestamp when the snapshot was created */
  createdAt: Date;
}

/**
 * IntelligenceSnapshotService
 *
 * Manages the lifecycle of intelligence snapshots:
 * - Creates initial snapshots with legacy-based recommendations
 * - Updates snapshots with media insight when analysis completes
 * - Retrieves snapshots for orders
 * - Marks snapshots as stale for re-analysis
 *
 * Design principles:
 * - Single source of truth for move intelligence
 * - Supports async enhancement model
 * - Never throws - logs errors and returns null
 */
@Injectable()
export class IntelligenceSnapshotService {
  private readonly logger = new Logger(IntelligenceSnapshotService.name);

  constructor(
    @InjectRepository(IntelligenceSnapshotEntity)
    private readonly snapshotRepository: Repository<IntelligenceSnapshotEntity>,
  ) {}

  /**
   * Create an initial snapshot with a legacy-based recommendation.
   *
   * This is called when a move estimate is first generated,
   * before any media analysis has been performed.
   *
   * @param orderId - ID of the order
   * @param recommendation - The move recommendation from legacy estimation
   * @param version - Version of the intelligence engine
   * @returns The created snapshot entity
   */
  async createInitialSnapshot(
    orderId: string,
    recommendation: MoveRecommendation,
    version: string,
  ): Promise<IntelligenceSnapshotEntity> {
    this.logger.debug(`Creating initial snapshot for order ${orderId}`);

    const snapshot = this.snapshotRepository.create({
      orderId,
      moveRecommendation: recommendation as unknown as Record<string, unknown>,
      mediaInsightSummary: null,
      mediaInsightFull: null,
      confidenceScore: recommendation.confidenceScore,
      intelligenceVersion: version,
      profileSource: 'legacy',
      isStale: false,
    });

    const saved = await this.snapshotRepository.save(snapshot);
    this.logger.debug(`Created initial snapshot ${saved.id} for order ${orderId}`);

    return saved;
  }

  /**
   * Update a snapshot with media insight from async analysis.
   *
   * This is called when media analysis completes successfully.
   * If no snapshot exists, creates a new one with the media insight.
   *
   * @param orderId - ID of the order
   * @param mediaInsight - The media insight from analysis
   * @param updatedRecommendation - Optional updated recommendation with media data
   * @returns The updated snapshot entity or null on error
   */
  async updateWithMediaInsight(
    orderId: string,
    mediaInsight: MediaInsight,
    updatedRecommendation?: MoveRecommendation,
  ): Promise<IntelligenceSnapshotEntity | null> {
    this.logger.debug(`Updating snapshot with media insight for order ${orderId}`);

    try {
      const snapshot = await this.snapshotRepository.findOne({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });

      if (!snapshot) {
        this.logger.warn(`No snapshot found for order ${orderId}, creating new one`);
        return this.createSnapshotWithMedia(orderId, mediaInsight, updatedRecommendation);
      }

      // Update existing snapshot with media insight
      snapshot.mediaInsightFull = mediaInsight;
      snapshot.mediaInsightSummary = {
        detectedItemCount: mediaInsight.detectedItems.length,
        estimatedVolumeM3: mediaInsight.estimatedTotalVolumeM3,
        laborIntensity: mediaInsight.estimatedLaborIntensity,
        fragilityScore: mediaInsight.fragilityScore,
        confidence: mediaInsight.perceptionConfidence,
      };
      snapshot.profileSource = 'media-enhanced';

      if (updatedRecommendation) {
        snapshot.moveRecommendation =
          updatedRecommendation as unknown as Record<string, unknown>;
        snapshot.confidenceScore = updatedRecommendation.confidenceScore;
      }

      const saved = await this.snapshotRepository.save(snapshot);
      this.logger.debug(`Updated snapshot ${saved.id} with media insight for order ${orderId}`);

      return saved;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update snapshot with media insight for order ${orderId}: ${errorMessage}`,
      );
      return null;
    }
  }

  /**
   * Get the latest snapshot for an order.
   *
   * @param orderId - ID of the order
   * @returns The snapshot entity or null if not found
   */
  async getSnapshotForOrder(orderId: string): Promise<IntelligenceSnapshotEntity | null> {
    try {
      return this.snapshotRepository.findOne({
        where: { orderId },
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get snapshot for order ${orderId}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Get a summary of the snapshot for an order.
   *
   * @param orderId - ID of the order
   * @returns The snapshot summary or null if not found
   */
  async getSnapshotSummary(orderId: string): Promise<SnapshotSummary | null> {
    const snapshot = await this.getSnapshotForOrder(orderId);

    if (!snapshot) {
      return null;
    }

    return {
      snapshotId: snapshot.id,
      orderId: snapshot.orderId,
      hasMediaInsight: !!snapshot.mediaInsightFull,
      confidenceScore: Number(snapshot.confidenceScore),
      profileSource: snapshot.profileSource,
      createdAt: snapshot.createdAt,
    };
  }

  /**
   * Mark a snapshot as stale for re-analysis.
   *
   * This is called when the order is updated and the intelligence
   * needs to be recalculated.
   *
   * @param orderId - ID of the order
   */
  async markStale(orderId: string): Promise<void> {
    try {
      await this.snapshotRepository.update({ orderId }, { isStale: true });
      this.logger.debug(`Marked snapshot as stale for order ${orderId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to mark snapshot as stale for order ${orderId}: ${errorMessage}`);
    }
  }

  /**
   * Create a new snapshot with media insight.
   *
   * Used when no existing snapshot is found.
   *
   * @param orderId - ID of the order
   * @param mediaInsight - The media insight from analysis
   * @param recommendation - Optional move recommendation
   * @returns The created snapshot entity
   */
  private async createSnapshotWithMedia(
    orderId: string,
    mediaInsight: MediaInsight,
    recommendation?: MoveRecommendation,
  ): Promise<IntelligenceSnapshotEntity> {
    const snapshot = this.snapshotRepository.create({
      orderId,
      moveRecommendation: recommendation
        ? (recommendation as unknown as Record<string, unknown>)
        : null,
      mediaInsightFull: mediaInsight,
      mediaInsightSummary: {
        detectedItemCount: mediaInsight.detectedItems.length,
        estimatedVolumeM3: mediaInsight.estimatedTotalVolumeM3,
        laborIntensity: mediaInsight.estimatedLaborIntensity,
        fragilityScore: mediaInsight.fragilityScore,
        confidence: mediaInsight.perceptionConfidence,
      },
      confidenceScore: recommendation?.confidenceScore ?? mediaInsight.perceptionConfidence,
      intelligenceVersion: '1.0.0',
      profileSource: recommendation ? 'media-enhanced' : 'media-only',
      isStale: false,
    });

    const saved = await this.snapshotRepository.save(snapshot);
    this.logger.debug(`Created snapshot ${saved.id} with media insight for order ${orderId}`);

    return saved;
  }
}
