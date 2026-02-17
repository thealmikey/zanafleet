/**
 * Intelligence Snapshot Entity
 *
 * Storage entity for intelligence snapshots following the storage strategy.
 * Supports both legacy-based and media-enhanced move profiles.
 *
 * @module media-insight/entities
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { MediaInsight } from '../interfaces';

/**
 * Profile source type indicating how the profile was generated.
 */
export type ProfileSource = 'legacy' | 'media-enhanced' | 'media-only';

/**
 * Summary of media insight stored in the snapshot.
 * Provides quick access to key metrics without loading the full insight.
 */
export interface MediaInsightSummary {
  /** Number of items detected in the media */
  detectedItemCount: number;
  /** Total estimated volume in cubic meters */
  estimatedVolumeM3: number;
  /** Labor intensity on 1-5 scale */
  laborIntensity: number;
  /** Fragility score from 0-1 */
  fragilityScore: number;
  /** Overall confidence in the analysis, 0-1 */
  confidence: number;
}

/**
 * IntelligenceSnapshotEntity
 *
 * Represents a snapshot of move intelligence at a point in time.
 * Supports the async processing model where:
 * 1. Initial snapshot is created with legacy-based recommendation
 * 2. Snapshot is updated when media analysis completes
 *
 * Design principles:
 * - Single source of truth for move intelligence
 * - Supports both legacy and media-enhanced profiles
 * - Tracks staleness for re-analysis scenarios
 * - Stores both summary and full insight for flexibility
 */
@Entity('intelligence_snapshots')
@Index(['orderId'])
@Index(['createdAt'])
export class IntelligenceSnapshotEntity {
  /** Unique identifier for the snapshot */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** ID of the order this snapshot belongs to */
  @Index()
  @Column({ type: 'uuid' })
  orderId!: string;

  /** The move recommendation (can be legacy or media-enhanced) */
  @Column({ type: 'simple-json', nullable: true })
  moveRecommendation!: Record<string, unknown> | null;

  /** Summary of media insight for quick access */
  @Column({ type: 'simple-json', nullable: true })
  mediaInsightSummary!: MediaInsightSummary | null;

  /** Full media insight data */
  @Column({ type: 'simple-json', nullable: true })
  mediaInsightFull!: MediaInsight | null;

  /** Overall confidence score for the recommendation */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  confidenceScore!: number;

  /** Version of the intelligence engine used */
  @Column({ type: 'varchar', length: 50 })
  intelligenceVersion!: string;

  /** Source of the profile data */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'legacy',
  })
  profileSource!: ProfileSource;

  /** Whether the snapshot is stale and needs re-analysis */
  @Column({ type: 'boolean', default: false })
  isStale!: boolean;

  /** Timestamp when the snapshot was created */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  /** Timestamp when the snapshot was last updated */
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to a plain object for API responses.
   */
  toPlainObject(): {
    id: string;
    orderId: string;
    hasMediaInsight: boolean;
    confidenceScore: number;
    profileSource: ProfileSource;
    isStale: boolean;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: this.id,
      orderId: this.orderId,
      hasMediaInsight: !!this.mediaInsightFull,
      confidenceScore: Number(this.confidenceScore),
      profileSource: this.profileSource,
      isStale: this.isStale,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
