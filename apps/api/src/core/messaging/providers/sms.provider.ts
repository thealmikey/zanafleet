import { Injectable, Logger } from '@nestjs/common';
import { MessagePayload, SendResult } from '../interfaces/message-payload.interface';
import { MessagingProvider } from '../interfaces/messaging-provider.interface';

@Injectable()
export class SmsProvider implements MessagingProvider {
  private readonly logger = new Logger(SmsProvider.name);

  async send(message: MessagePayload): Promise<SendResult> {
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(
      `[SMS] Sending to ${message.recipient} | MessageId: ${messageId}`,
    );

    if (message.metadata) {
      this.logger.debug(`[SMS] Metadata: ${JSON.stringify(message.metadata)}`);
    }

    this.logger.debug(`[SMS] Body: ${message.body}`);

    return {
      success: true,
      messageId,
    };
  }
}
