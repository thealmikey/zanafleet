import { Injectable, Logger } from '@nestjs/common';

import { NotificationChannel } from '../../../modules/communication/dto/notification.enums';
import { MessagePayload, SendResult } from '../interfaces/message-payload.interface';
import { EmailProvider } from '../providers/email.provider';
import { PushProvider } from '../providers/push.provider';
import { SmsProvider } from '../providers/sms.provider';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly pushProvider: PushProvider
  ) {}

  async send(message: MessagePayload): Promise<SendResult> {
    this.logger.debug(
      `Routing message to ${message.channel} provider for recipient: ${message.recipient}`
    );

    switch (message.channel) {
      case NotificationChannel.EMAIL:
        return this.emailProvider.send(message);

      case NotificationChannel.SMS:
        return this.smsProvider.send(message);

      case NotificationChannel.PUSH:
        return this.pushProvider.send(message);

      default: {
        const channelStr = String((message as { channel: unknown }).channel);
        this.logger.error(`Unknown channel type: ${channelStr}`);
        return {
          success: false,
          error: `Unknown channel type: ${channelStr}`,
        };
      }
    }
  }
}
