import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

import { VisibilityTokenType, VisibilityTokenStatus } from '../dto/advertising.enums';

/**
 * VisibilityToken Entity
 *
 * Represents purchased visibility tokens that boost search rankings
 * and improve listing visibility for businesses/riders.
 *
 * Types:
 * - BOOST: Short-term visibility boost (1-7 days)
 * - PREMIUM: Premium badge/listing (always show as premium)
 * - FEATURED: Featured placement at top of results
 * - TOP_RESULT: Always show as first result
 */
@Entity('visibility_tokens')
@Index(['workspaceId', 'status'])
@Index(['targetType', 'targetId', 'status'])
export class VisibilityToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('uuid')
  purchasedById!: string;

  @Column({
    type: 'enum',
    enum: VisibilityTokenType,
  })
  tokenType!: VisibilityTokenType;

  @Column({
    type: 'enum',
    enum: VisibilityTokenStatus,
    default: VisibilityTokenStatus.ACTIVE,
  })
  status!: VisibilityTokenStatus;

  @Column({ length: 50 })
  targetType!: string; // 'rider', 'business', 'job', 'service'

  @Column('uuid')
  targetId!: string;

  @Column('int')
  durationDays!: number;

  @Column({ type: 'timestamp' })
  startedAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column('decimal', { precision: 18, scale: 2 })
  price!: string;

  @Column('decimal', { precision: 18, scale: 2, default: '0' })
  boostScore!: string;

  @Column('uuid', { nullable: true })
  paymentIntentId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * Check if token is currently active
   */
  isActive(): boolean {
    if (this.status !== VisibilityTokenStatus.ACTIVE) return false;

    const now = new Date();
    return now >= this.startedAt && now <= this.expiresAt;
  }

  /**
   * Get remaining days until expiry
   */
  getRemainingDays(): number {
    const now = new Date();
    const diff = this.expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calculate boost score based on token type and remaining duration
   */
  calculateBoostScore(): number {
    const baseScores: Record<VisibilityTokenType, number> = {
      [VisibilityTokenType.BOOST]: 10,
      [VisibilityTokenType.PREMIUM]: 25,
      [VisibilityTokenType.FEATURED]: 50,
      [VisibilityTokenType.TOP_RESULT]: 100,
    };

    const baseScore = baseScores[this.tokenType];
    const remainingDays = this.getRemainingDays();
    const durationMultiplier = Math.min(remainingDays / this.durationDays, 1);

    return baseScore * durationMultiplier;
  }
}
