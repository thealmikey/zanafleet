import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { NotificationChannel, RecipientType } from '../dto/notification.enums';

/**
 * NotificationFailedEventV1
 * Emitted when a notification fails to send
 */
export class NotificationFailedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationFailedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Notification' as const;
  readonly notificationId: string;
  readonly recipientId: string;
  readonly recipientType: RecipientType;
  readonly channel: NotificationChannel;
  readonly templateId: string;
  readonly error: string;
  readonly attempts: number;
  readonly workspaceId: string;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    notificationId: string;
    recipientId: string;
    recipientType: RecipientType;
    channel: NotificationChannel;
    templateId: string;
    error: string;
    attempts: number;
    workspaceId: string;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.notificationId = data.notificationId;
    this.aggregateId = data.notificationId;
    this.recipientId = data.recipientId;
    this.recipientType = data.recipientType;
    this.channel = data.channel;
    this.templateId = data.templateId;
    this.error = data.error;
    this.attempts = data.attempts;
    this.workspaceId = data.workspaceId;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: string;
    eventVersion: string;
    occurredAt: string;
    aggregateId: string;
    aggregateType: string;
    notificationId: string;
    recipientId: string;
    recipientType: string;
    channel: string;
    templateId: string;
    error: string;
    attempts: number;
    workspaceId: string;
    correlationId?: string;
    causationId?: string;
  } {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      eventVersion: this.eventVersion,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      aggregateType: this.aggregateType,
      notificationId: this.notificationId,
      recipientId: this.recipientId,
      recipientType: this.recipientType,
      channel: this.channel,
      templateId: this.templateId,
      error: this.error,
      attempts: this.attempts,
      workspaceId: this.workspaceId,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    notificationId: string;
    recipientId: string;
    recipientType: string;
    channel: string;
    templateId: string;
    error: string;
    attempts: number;
    workspaceId: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): NotificationFailedEventV1 {
    return new NotificationFailedEventV1({
      eventId: data.eventId,
      notificationId: data.notificationId,
      recipientId: data.recipientId,
      recipientType: data.recipientType as RecipientType,
      channel: data.channel as NotificationChannel,
      templateId: data.templateId,
      error: data.error,
      attempts: data.attempts,
      workspaceId: data.workspaceId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
