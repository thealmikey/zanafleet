import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

import { TenantAware } from '../../database/interfaces/tenant-aware.interface';

/**
 * Delivery status enum
 */
export enum WebhookDeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRIED = 'retried',
}

/**
 * WebhookDeliveryLog Entity
 *
 * Tracks all webhook delivery attempts for auditing and debugging.
 * Records request/response details and retry schedules.
 *
 * @Entity('webhook_delivery_logs')
 * @Index(['subscriptionId'])
 * @Index(['status'])
 * @Index(['workspaceId'])
 * @Index(['workspaceId', 'status'])
 */
@Entity('webhook_delivery_logs')
@Index(['subscriptionId'])
@Index(['status'])
@Index(['workspaceId'])
@Index(['workspaceId', 'status'])
export class WebhookDeliveryLog implements TenantAware {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  subscriptionId!: string;

  @Column('uuid')
  workspaceId!: string;

  @Column('varchar', { length: 255 })
  eventType!: string;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @Column('int', { nullable: true })
  responseStatus?: number | null;

  @Column('text', { nullable: true })
  responseBody?: string | null;

  @Column('int', { default: 1 })
  attemptNumber!: number;

  @Column('enum', { enum: WebhookDeliveryStatus, default: WebhookDeliveryStatus.PENDING })
  status!: WebhookDeliveryStatus;

  @Column('timestamp with time zone', { nullable: true })
  nextRetryAt?: Date | null;

  @Column('timestamp with time zone', { nullable: true })
  deliveredAt?: Date | null;

  @Column('text', { nullable: true })
  errorMessage?: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
