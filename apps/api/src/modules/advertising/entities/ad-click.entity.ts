import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { AdCampaign } from './ad-campaign.entity';

/**
 * AdClick Entity
 *
 * Tracks each time a user clicks on an ad.
 */
@Entity('ad_clicks')
export class AdClick {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  impressionId!: string;

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

  @Column({ type: 'text', nullable: true })
  clickThroughUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => AdCampaign, (campaign) => campaign.clicks)
  @JoinColumn({ name: 'campaignId' })
  campaign!: AdCampaign;
}
