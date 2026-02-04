import { Injectable, Logger } from '@nestjs/common';
import { MessagePayload, SendResult } from '../interfaces/message-payload.interface';
import { MessagingProvider } from '../interfaces/messaging-provider.interface';

@Injectable()
export class EmailProvider implements MessagingProvider {
  private readonly logger = new Logger(EmailProvider.name);

  async send(message: MessagePayload): Promise<SendResult> {
    const messageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `[EMAIL] Sending to ${message.recipient} | Subject: ${message.subject} | MessageId: ${messageId}`,
    );

    if (message.metadata) {
      this.logger.debug(`[EMAIL] Metadata: ${JSON.stringify(message.metadata)}`);
    }

    this.logger.debug(`[EMAIL] Body: ${message.body}`);

    return {
      success: true,
      messageId,
    };
  }
}
