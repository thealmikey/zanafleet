import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TenantAware } from '../../database/interfaces/tenant-aware.interface';

/**
 * WebhookSubscription Entity
 *
 * Stores webhook endpoint configurations for workspaces.
 * Each subscription defines where to send events and which events to listen to.
 *
 * @Entity('webhook_subscriptions')
 * @Index(['workspaceId'])
 * @Index(['workspaceId', 'isActive'])
 */
@Entity('webhook_subscriptions')
@Index(['workspaceId'])
@Index(['workspaceId', 'isActive'])
export class WebhookSubscription implements TenantAware {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('varchar', { length: 2048 })
  url!: string;

  @Column('simple-array')
  events!: string[];

  @Column('varchar', { length: 256 })
  secret!: string;

  @Column('boolean', { default: true })
  isActive!: boolean;

  @Column('varchar', { length: 255, nullable: true })
  name?: string | null;

  @Column('text', { nullable: true })
  description?: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
