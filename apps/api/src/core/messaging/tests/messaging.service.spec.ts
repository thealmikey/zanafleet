import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from '../services/messaging.service';
import { EmailProvider } from '../providers/email.provider';
import { SmsProvider } from '../providers/sms.provider';
import { PushProvider } from '../providers/push.provider';

describe('MessagingService', () => {
  let service: MessagingService;
  let emailProvider: EmailProvider;
  let smsProvider: SmsProvider;
  let pushProvider: PushProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagingService, EmailProvider, SmsProvider, PushProvider],
    }).compile();

    service = module.get<MessagingService>(MessagingService);
    emailProvider = module.get<EmailProvider>(EmailProvider);
    smsProvider = module.get<SmsProvider>(SmsProvider);
    pushProvider = module.get<PushProvider>(PushProvider);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should route email messages to EmailProvider', async () => {
      const spy = jest.spyOn(emailProvider, 'send');

      const message = {
        channel: 'email' as const,
        recipient: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
      };

      const result = await service.send(message);

      expect(spy).toHaveBeenCalledWith(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^email_/);
    });

    it('should route SMS messages to SmsProvider', async () => {
      const spy = jest.spyOn(smsProvider, 'send');

      const message = {
        channel: 'sms' as const,
        recipient: '+1234567890',
        subject: 'OTP',
        body: 'Your OTP is 123456',
      };

      const result = await service.send(message);

      expect(spy).toHaveBeenCalledWith(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^sms_/);
    });

    it('should route push messages to PushProvider', async () => {
      const spy = jest.spyOn(pushProvider, 'send');

      const message = {
        channel: 'push' as const,
        recipient: 'device_token_123',
        subject: 'Notification Title',
        body: 'This is a push notification',
      };

      const result = await service.send(message);

      expect(spy).toHaveBeenCalledWith(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^push_/);
    });

    it('should include metadata when provided', async () => {
      const spy = jest.spyOn(emailProvider, 'send');

      const message = {
        channel: 'email' as const,
        recipient: 'test@example.com',
        subject: 'Test',
        body: 'Test body',
        metadata: {
          userId: '123',
          templateId: 'welcome',
        },
      };

      await service.send(message);

      expect(spy).toHaveBeenCalledWith(message);
    });
  });
});
