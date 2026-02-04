import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { NotificationChannel, RecipientType } from '../dto/notification.enums';

/**
 * NotificationSkippedEventV1
 * Emitted when a notification is skipped due to preference opt-outs or other reasons
 */
export class NotificationSkippedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'NotificationSkippedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'Notification' as const;
  readonly notificationId: string;
  readonly recipientId: string;
  readonly recipientType: RecipientType;
  readonly channel: NotificationChannel;
  readonly templateId: string;
  readonly reason: string;
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
    reason: string;
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
    this.reason = data.reason;
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
    reason: string;
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
      reason: this.reason,
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
    reason: string;
    workspaceId: string;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): NotificationSkippedEventV1 {
    return new NotificationSkippedEventV1({
      eventId: data.eventId,
      notificationId: data.notificationId,
      recipientId: data.recipientId,
      recipientType: data.recipientType as RecipientType,
      channel: data.channel as NotificationChannel,
      templateId: data.templateId,
      reason: data.reason,
      workspaceId: data.workspaceId,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
