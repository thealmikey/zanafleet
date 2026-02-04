import { Injectable, Logger } from '@nestjs/common';
import { MessagePayload, SendResult } from '../interfaces/message-payload.interface';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { PushProvider } from '../providers/push.provider';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(
    private readonly emailProvider: EmailProvider,
    private readonly smsProvider: SmsProvider,
    private readonly pushProvider: PushProvider,
  ) {}

  async send(message: MessagePayload): Promise<SendResult> {
    this.logger.debug(
      `Routing message to ${message.channel} provider for recipient: ${message.recipient}`,
    );

    switch (message.channel) {
      case 'email':
        return this.emailProvider.send(message);

      case 'sms':
        return this.smsProvider.send(message);

      case 'push':
        return this.pushProvider.send(message);

      default:
        const exhaustiveCheck: never = message.channel;
        this.logger.error(`Unknown channel type: ${exhaustiveCheck}`);
        return {
          success: false,
          error: `Unknown channel type: ${exhaustiveCheck}`,
        };
    }
  }
}
