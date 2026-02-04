import { Module } from '@nestjs/common';

import { EmailProvider } from './providers/email.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';
import { MessagingService } from './services/messaging.service';

@Module({
  providers: [MessagingService, EmailProvider, SmsProvider, PushProvider],
  exports: [MessagingService],
})
export class MessagingModule {}
