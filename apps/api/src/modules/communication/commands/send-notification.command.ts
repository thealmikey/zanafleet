import { NotificationChannel, RecipientType } from '../dto/notification.enums';

/**
 * SendNotificationCommand
 * Command to initiate sending a notification through a specified channel
 */
export class SendNotificationCommand {
  constructor(
    public readonly recipientId: string,
    public readonly recipientType: RecipientType,
    public readonly channel: NotificationChannel,
    public readonly templateId: string,
    public readonly variables: Record<string, unknown> = {},
    public readonly workspaceId: string,
    public readonly correlationId?: string,
    public readonly causationId?: string
  ) {}
}
