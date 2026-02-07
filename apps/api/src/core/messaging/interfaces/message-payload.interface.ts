import { NotificationChannel } from '../../../modules/communication/dto/notification.enums';

export type MessageChannel = Exclude<NotificationChannel, NotificationChannel.IN_APP>;

export interface MessagePayload {
  channel: MessageChannel;
  recipient: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
