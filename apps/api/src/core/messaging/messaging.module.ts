import { Module } from '@nestjs/common';
import { MessagingService } from './services/messaging.service';
import { EmailProvider } from './providers/email.provider';
import { SmsProvider } from './providers/sms.provider';
import { PushProvider } from './providers/push.provider';

@Module({
  providers: [MessagingService, EmailProvider, SmsProvider, PushProvider],
  exports: [MessagingService],
})
export class MessagingModule {}
