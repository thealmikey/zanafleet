import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationChannel, NotificationStatus, RecipientType } from '../dto/notification.enums';

/**
 * NotificationEntity represents a notification record in the system
 * Tracks both sent notifications and failures for audit and retry purposes
 */
@Entity('notifications')
@Index(['workspaceId', 'createdAt'])
@Index(['recipientId', 'status'])
@Index(['correlationId'])
export class NotificationEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'enum', enum: NotificationChannel })
  channel!: NotificationChannel;

  @Column({ type: 'uuid' })
  recipientId!: string;

  @Column({ type: 'enum', enum: RecipientType })
  recipientType!: RecipientType;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.PENDING })
  status!: NotificationStatus;

  @Column({ type: 'varchar' })
  templateId!: string;

  @Column({ type: 'text', nullable: true })
  renderedSubject!: string | null;

  @Column({ type: 'text' })
  renderedBody!: string;

  @Column({ type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  failedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'uuid' })
  workspaceId!: string;

  @Column({ type: 'uuid', nullable: true })
  correlationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  causationId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
