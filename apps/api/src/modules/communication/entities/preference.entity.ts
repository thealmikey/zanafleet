import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

import { NotificationChannel, RecipientType } from '../dto/notification.enums';

/**
 * NotificationPreferenceEntity
 *
 * Represents a notification preference for a recipient across channels and workspaces.
 * Implements an opt-out model: defaults to enabled if no preference record exists.
 *
 * Supports:
 * - Per-channel preferences (email, sms, push)
 * - Workspace-scoped preferences (workspaceId null = global preference)
 * - Audit trail via updatedBy (actorId who changed the preference)
 *
 * Unique constraint ensures one preference per:
 * - recipientId + recipientType + channel + workspaceId combination
 */
@Entity('notification_preferences')
@Index(['recipientId', 'recipientType', 'channel', 'workspaceId'])
@Unique('idx_preference_unique', ['recipientId', 'recipientType', 'channel', 'workspaceId'])
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  recipientId!: string;

  @Column({
    type: 'enum',
    enum: RecipientType,
  })
  recipientType!: RecipientType;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel!: NotificationChannel;

  @Column('boolean', { default: true })
  enabled = true;

  @Column('uuid', { nullable: true })
  workspaceId: string | null = null;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('varchar', { length: 255, nullable: true })
  updatedBy: string | null = null;
}
