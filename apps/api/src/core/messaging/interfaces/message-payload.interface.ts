export type MessageChannel = 'email' | 'sms' | 'push';

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
