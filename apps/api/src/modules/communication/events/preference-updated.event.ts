import { BaseEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { NotificationChannel, RecipientType } from '../dto/notification.enums';

/**
 * PreferenceUpdatedEventV1
 *
 * Emitted when a notification preference is created or updated.
 * Provides audit trail for preference changes including who made the change and when.
 */
export class PreferenceUpdatedEventV1 implements BaseEvent {
  readonly eventId: string;
  readonly eventType = 'PreferenceUpdatedEvent-V1' as const;
  readonly eventVersion = '1.0.0' as const;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType = 'NotificationPreference' as const;
  readonly recipientId: string;
  readonly recipientType: RecipientType;
  readonly channel: NotificationChannel;
  readonly enabled: boolean;
  readonly workspaceId: string | null;
  readonly updatedBy: string | null;
  readonly correlationId?: string;
  readonly causationId?: string;

  constructor(data: {
    eventId: string;
    aggregateId: string;
    recipientId: string;
    recipientType: RecipientType;
    channel: NotificationChannel;
    enabled: boolean;
    workspaceId?: string | null;
    updatedBy?: string | null;
    occurredAt?: Date;
    correlationId?: string;
    causationId?: string;
  }) {
    this.eventId = data.eventId;
    this.aggregateId = data.aggregateId;
    this.recipientId = data.recipientId;
    this.recipientType = data.recipientType;
    this.channel = data.channel;
    this.enabled = data.enabled;
    this.workspaceId = data.workspaceId ?? null;
    this.updatedBy = data.updatedBy ?? null;
    this.occurredAt = data.occurredAt ?? new Date();
    this.correlationId = data.correlationId;
    this.causationId = data.causationId;
  }

  toJSON(): {
    eventId: string;
    eventType: 'PreferenceUpdatedEvent-V1';
    eventVersion: '1.0.0';
    occurredAt: string;
    aggregateId: string;
    aggregateType: 'NotificationPreference';
    recipientId: string;
    recipientType: string;
    channel: string;
    enabled: boolean;
    workspaceId: string | null;
    updatedBy: string | null;
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
      recipientId: this.recipientId,
      recipientType: this.recipientType,
      channel: this.channel,
      enabled: this.enabled,
      workspaceId: this.workspaceId,
      updatedBy: this.updatedBy,
      correlationId: this.correlationId,
      causationId: this.causationId,
    };
  }

  static fromJSON(data: {
    eventId: string;
    aggregateId: string;
    recipientId: string;
    recipientType: string;
    channel: string;
    enabled: boolean;
    workspaceId: string | null;
    updatedBy: string | null;
    occurredAt: string;
    correlationId?: string;
    causationId?: string;
  }): PreferenceUpdatedEventV1 {
    return new PreferenceUpdatedEventV1({
      eventId: data.eventId,
      aggregateId: data.aggregateId,
      recipientId: data.recipientId,
      recipientType: data.recipientType as RecipientType,
      channel: data.channel as NotificationChannel,
      enabled: data.enabled,
      workspaceId: data.workspaceId,
      updatedBy: data.updatedBy,
      occurredAt: new Date(data.occurredAt),
      correlationId: data.correlationId,
      causationId: data.causationId,
    });
  }
}
