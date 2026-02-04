import { Test, TestingModule } from '@nestjs/testing';

import { MessagePayload } from '../interfaces/message-payload.interface';
import { EmailProvider } from '../providers/email.provider';
import { PushProvider } from '../providers/push.provider';
import { SmsProvider } from '../providers/sms.provider';
import { MessagingService } from '../services/messaging.service';

describe('MessagingService - Routing Logic', () => {
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

  describe('channel routing', () => {
    it('should route only to EmailProvider when channel is email', async () => {
      const emailSpy = jest.spyOn(emailProvider, 'send');
      const smsSpy = jest.spyOn(smsProvider, 'send');
      const pushSpy = jest.spyOn(pushProvider, 'send');

      const message: MessagePayload = {
        channel: 'email',
        recipient: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      };

      await service.send(message);

      expect(emailSpy).toHaveBeenCalledTimes(1);
      expect(smsSpy).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should route only to SmsProvider when channel is sms', async () => {
      const emailSpy = jest.spyOn(emailProvider, 'send');
      const smsSpy = jest.spyOn(smsProvider, 'send');
      const pushSpy = jest.spyOn(pushProvider, 'send');

      const message: MessagePayload = {
        channel: 'sms',
        recipient: '+1234567890',
        subject: 'Test',
        body: 'Test',
      };

      await service.send(message);

      expect(smsSpy).toHaveBeenCalledTimes(1);
      expect(emailSpy).not.toHaveBeenCalled();
      expect(pushSpy).not.toHaveBeenCalled();
    });

    it('should route only to PushProvider when channel is push', async () => {
      const emailSpy = jest.spyOn(emailProvider, 'send');
      const smsSpy = jest.spyOn(smsProvider, 'send');
      const pushSpy = jest.spyOn(pushProvider, 'send');

      const message: MessagePayload = {
        channel: 'push',
        recipient: 'device_token',
        subject: 'Test',
        body: 'Test',
      };

      await service.send(message);

      expect(pushSpy).toHaveBeenCalledTimes(1);
      expect(emailSpy).not.toHaveBeenCalled();
      expect(smsSpy).not.toHaveBeenCalled();
    });

    it('should return different messageId formats per channel', async () => {
      const emailResult = await service.send({
        channel: 'email',
        recipient: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      });

      const smsResult = await service.send({
        channel: 'sms',
        recipient: '+1234567890',
        subject: 'Test',
        body: 'Test',
      });

      const pushResult = await service.send({
        channel: 'push',
        recipient: 'device_token',
        subject: 'Test',
        body: 'Test',
      });

      expect(emailResult.messageId).toMatch(/^email_/);
      expect(smsResult.messageId).toMatch(/^sms_/);
      expect(pushResult.messageId).toMatch(/^push_/);
    });
  });

  describe('message preservation', () => {
    it('should pass the complete message payload to the provider', async () => {
      const spy = jest.spyOn(emailProvider, 'send');

      const message: MessagePayload = {
        channel: 'email',
        recipient: 'user@example.com',
        subject: 'Welcome',
        body: 'Welcome to our service',
        metadata: {
          userId: '456',
          priority: 'high',
        },
      };

      await service.send(message);

      expect(spy).toHaveBeenCalledWith(message);
    });

    it('should return success result from provider', async () => {
      const message: MessagePayload = {
        channel: 'sms',
        recipient: '+9876543210',
        subject: 'Code',
        body: '456789',
      };

      const result = await service.send(message);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.error).toBeUndefined();
    });
  });
});
