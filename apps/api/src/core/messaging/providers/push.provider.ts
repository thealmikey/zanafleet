import { Injectable, Logger } from '@nestjs/common';

import { MessagePayload, SendResult } from '../interfaces/message-payload.interface';
import { MessagingProvider } from '../interfaces/messaging-provider.interface';

@Injectable()
export class PushProvider implements MessagingProvider {
  private readonly logger = new Logger(PushProvider.name);

  async send(message: MessagePayload): Promise<SendResult> {
    const messageId = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `[PUSH] Sending to ${message.recipient} | Title: ${message.subject} | MessageId: ${messageId}`
    );

    if (message.metadata) {
      this.logger.debug(`[PUSH] Metadata: ${JSON.stringify(message.metadata)}`);
    }

    this.logger.debug(`[PUSH] Body: ${message.body}`);

    return {
      success: true,
      messageId,
    };
  }
}
