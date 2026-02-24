import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { AdCampaign } from './ad-campaign.entity';

/**
 * AdImpression Entity
 *
 * Tracks each time an ad is displayed to a user.
 */
@Entity('ad_impressions')
export class AdImpression {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  campaignId!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('uuid', { nullable: true })
  userId!: string | null;

  @Column('uuid', { nullable: true })
  sessionId!: string | null;

  @Column({ length: 255, nullable: true })
  ipAddress!: string | null;

  @Column({ length: 10, nullable: true })
  userAgent!: string | null;

  @Column({ length: 50, nullable: true })
  placement!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  context!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => AdCampaign, (campaign) => campaign.impressions)
  @JoinColumn({ name: 'campaignId' })
  campaign!: AdCampaign;
}
