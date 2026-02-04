import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

import { NotificationChannel } from '../dto/notification.enums';

/**
 * TemplateEntity
 *
 * Represents a notification template with support for:
 * - Variable interpolation via {{variable}} syntax
 * - Multi-locale support (default: 'en')
 * - Per-workspace branding configuration
 * - Workspace-scoped templates (workspaceId null = global template)
 *
 * Unique constraint ensures template name is unique per:
 * - workspace + locale + channel combination
 */
@Entity('notification_templates')
@Index(['workspaceId', 'locale', 'channel', 'name'])
@Unique('idx_template_unique', ['workspaceId', 'locale', 'channel', 'name'])
export class TemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel!: NotificationChannel;

  @Column('text')
  subject!: string;

  @Column('text')
  body!: string;

  @Column('simple-array')
  variables!: string[];

  @Column('int', { default: 1 })
  version = 1;

  @Column('varchar', { length: 10, default: 'en' })
  locale = 'en';

  @Column('uuid', { nullable: true })
  workspaceId: string | null = null;

  @Column('json', { nullable: true })
  brandingConfig: Record<string, unknown> | null = null;

  @Column('boolean', { default: true })
  isActive = true;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
