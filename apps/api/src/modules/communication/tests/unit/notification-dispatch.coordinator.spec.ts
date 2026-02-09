import {
  NotificationDispatchCoordinator,
  NotificationInput,
} from '../../coordinators/notification-dispatch.coordinator';
import { NotificationChannel, NotificationStatus, RecipientType } from '../../dto/notification.enums';
import { NotificationEntity } from '../../entities/notification.entity';
import { TemplateEntity } from '../../entities/template.entity';
import { ChannelProvider, RenderedMessage, Recipient } from '../../providers/channel-provider.interface';
import { NoOpChannelProvider } from '../../providers/noop-channel.provider';

describe('NotificationDispatchCoordinator', () => {
  let coordinator: NotificationDispatchCoordinator;
  let mockTemplateService: {
    findByName: jest.Mock;
    render: jest.Mock;
    validateVariables: jest.Mock;
  };
  let mockPreferenceService: {
    isEnabled: jest.Mock;
    getPreferences: jest.Mock;
  };
  let mockEventBusService: {
    publish: jest.Mock;
  };
  let mockNotificationRepository: {
    findOne: jest.Mock;
    save: jest.Mock;
  };

  const createMockTemplate = (
    channel: NotificationChannel,
    overrides: Partial<TemplateEntity> = {},
  ): TemplateEntity => {
    const template = new TemplateEntity();
    template.id = `template-${channel.toLowerCase()}`;
    template.name = 'test-template';
    template.channel = channel;
    template.subject = 'Test Subject {{name}}';
    template.body = 'Hello {{name}}, your order {{orderId}} is ready.';
    template.variables = ['name', 'orderId'];
    template.version = 1;
    template.locale = 'en';
    template.isActive = true;
    template.createdAt = new Date();
    template.updatedAt = new Date();
    Object.assign(template, overrides);
    return template;
  };

  const createMockInput = (
    overrides: Partial<NotificationInput> = {},
  ): NotificationInput => ({
    recipientId: 'recipient-123',
    recipientType: RecipientType.RIDER,
    templateName: 'test-template',
    variables: { name: 'John', orderId: 'ORD-456' },
    channels: [NotificationChannel.PUSH],
    workspaceId: 'workspace-001',
    recipientContact: {
      email: 'john@example.com',
      phone: '+254700000000',
      deviceToken: 'device-token-123',
    },
    ...overrides,
  });

  const createMockProvider = (
    channel: NotificationChannel,
    overrides: {
      providerId?: string;
      send?: jest.Mock;
      canDeliver?: jest.Mock;
      isHealthy?: jest.Mock;
    } = {},
  ): jest.Mocked<ChannelProvider> => {
    return {
      providerId: overrides.providerId ?? `mock-${channel.toLowerCase()}`,
      channel,
      displayName: `Mock ${channel} Provider`,
      send: overrides.send ?? jest.fn().mockResolvedValue({
        success: true,
        messageId: 'msg-123',
        providerReference: 'ref-123',
        deliveredAt: new Date(),
      }),
      canDeliver: overrides.canDeliver ?? jest.fn().mockReturnValue(true),
      isHealthy: overrides.isHealthy ?? jest.fn().mockResolvedValue(true),
    } as jest.Mocked<ChannelProvider>;
  };

  beforeEach(() => {
    mockTemplateService = {
      findByName: jest.fn(),
      render: jest.fn().mockImplementation((template: TemplateEntity, variables: Record<string, string>) => ({
        subject: template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || ''),
        body: template.body.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || ''),
        templateId: template.id,
        templateVersion: template.version,
      })),
      validateVariables: jest.fn().mockReturnValue({ isValid: true }),
    };

    mockPreferenceService = {
      isEnabled: jest.fn().mockResolvedValue(true),
      getPreferences: jest.fn().mockResolvedValue([]),
    };

    mockEventBusService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    mockNotificationRepository = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (entity) => entity),
    };

    coordinator = new NotificationDispatchCoordinator(
      mockTemplateService as any,
      mockPreferenceService as any,
      mockNotificationRepository as any,
      mockEventBusService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    coordinator.clearRateLimits();
  });

  describe('channel selection and preference checking', () => {
    it('should select the first enabled channel', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      const input = createMockInput({ channels: [NotificationChannel.PUSH] });
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.PUSH);
      expect(pushProvider.send).toHaveBeenCalled();
    });

    it('should skip channel when preference is disabled', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      const smsProvider = createMockProvider(NotificationChannel.SMS);
      coordinator.registerChannelProvider(pushProvider);
      coordinator.registerChannelProvider(smsProvider);

      mockPreferenceService.isEnabled
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.SMS));

      const input = createMockInput({
        channels: [NotificationChannel.PUSH, NotificationChannel.SMS],
      });
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(pushProvider.send).not.toHaveBeenCalled();
      expect(smsProvider.send).toHaveBeenCalled();
    });

    it('should skip notification when all channels are disabled by preference', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockPreferenceService.isEnabled.mockResolvedValue(false);

      const input = createMockInput({ channels: [NotificationChannel.PUSH] });
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(false);
      expect(result.skippedReason).toContain('No enabled channels');
      expect(pushProvider.send).not.toHaveBeenCalled();
    });

    it('should check preference for each channel', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockPreferenceService.isEnabled.mockResolvedValue(true);
      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      const input = createMockInput({
        channels: [NotificationChannel.PUSH],
      });
      await coordinator.dispatch(input);

      expect(mockPreferenceService.isEnabled).toHaveBeenCalledWith(
        'recipient-123',
        RecipientType.RIDER,
        NotificationChannel.PUSH,
        'workspace-001',
      );
    });
  });

  describe('fallback logic', () => {
    it('should fallback to secondary channel when primary fails', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH, {
        send: jest.fn().mockResolvedValue({
          success: false,
          errorCode: 'DELIVERY_FAILED',
          errorMessage: 'Device unreachable',
        }),
      });
      const smsProvider = createMockProvider(NotificationChannel.SMS);
      coordinator.registerChannelProvider(pushProvider);
      coordinator.registerChannelProvider(smsProvider);

      mockTemplateService.findByName
        .mockResolvedValueOnce(createMockTemplate(NotificationChannel.PUSH))
        .mockResolvedValueOnce(createMockTemplate(NotificationChannel.SMS));

      coordinator.updateConfig({ maxRetries: 1 });

      const input = createMockInput({
        channels: [NotificationChannel.PUSH],
        fallbackChannels: [NotificationChannel.SMS],
      });
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(true);
      expect(result.channel).toBe(NotificationChannel.SMS);
      expect(result.fallbackUsed).toBe(true);
      expect(pushProvider.send).toHaveBeenCalled();
      expect(smsProvider.send).toHaveBeenCalled();
    });

    it('should not use fallback when disabled in config', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH, {
        send: jest.fn().mockResolvedValue({
          success: false,
          errorMessage: 'Failed',
        }),
      });
      const smsProvider = createMockProvider(NotificationChannel.SMS);
      coordinator.registerChannelProvider(pushProvider);
      coordinator.registerChannelProvider(smsProvider);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      coordinator.updateConfig({ enableFallback: false, maxRetries: 1 });

      const input = createMockInput({
        channels: [NotificationChannel.PUSH],
        fallbackChannels: [NotificationChannel.SMS],
      });
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(false);
      expect(smsProvider.send).not.toHaveBeenCalled();
    });

    it('should report all fallbacks exhausted when none succeed', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH, {
        send: jest.fn().mockResolvedValue({ success: false, errorMessage: 'Push failed' }),
      });
      const smsProvider = createMockProvider(NotificationChannel.SMS, {
        send: jest.fn().mockResolvedValue({ success: false, errorMessage: 'SMS failed' }),
      });
      coordinator.registerChannelProvider(pushProvider);
      coordinator.registerChannelProvider(smsProvider);

      mockTemplateService.findByName
        .mockResolvedValueOnce(createMockTemplate(NotificationChannel.PUSH))
        .mockResolvedValueOnce(createMockTemplate(NotificationChannel.SMS));

      coordinator.updateConfig({ maxRetries: 1 });

      const input = createMockInput({
        channels: [NotificationChannel.PUSH],
        fallbackChannels: [NotificationChannel.SMS],
      });
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('all fallbacks exhausted');
    });
  });

  describe('rate limiting', () => {
    it('should allow notifications within rate limit', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      coordinator.updateConfig({
        defaultRateLimit: { maxPerMinute: 5, maxPerHour: 50, maxPerDay: 200 },
      });

      const input = createMockInput();

      for (let i = 0; i < 3; i++) {
        const result = await coordinator.dispatch(input);
        expect(result.success).toBe(true);
      }

      expect(pushProvider.send).toHaveBeenCalledTimes(3);
    });

    it('should block notifications exceeding per-minute rate limit', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      coordinator.updateConfig({
        defaultRateLimit: { maxPerMinute: 2, maxPerHour: 50, maxPerDay: 200 },
      });

      const input = createMockInput();

      await coordinator.dispatch(input);
      await coordinator.dispatch(input);

      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(false);
      expect(result.skippedReason).toContain('Per-minute limit exceeded');
    });
  });

  describe('event emission', () => {
    it('should emit Communication.Notification.SentV1 on success', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      const input = createMockInput({ correlationId: 'corr-123' });
      await coordinator.dispatch(input);

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'notification.events.sent-v1',
        expect.objectContaining({
          eventType: 'Communication.Notification.SentV1',
          payload: expect.objectContaining({
            recipientId: 'recipient-123',
            channel: NotificationChannel.PUSH,
            templateName: 'test-template',
            workspaceId: 'workspace-001',
          }),
          correlationId: 'corr-123',
        }),
      );
    });

    it('should emit Communication.Notification.FailedV1 on failure', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH, {
        send: jest.fn().mockResolvedValue({
          success: false,
          errorMessage: 'Delivery failed',
        }),
      });
      coordinator.registerChannelProvider(pushProvider);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      coordinator.updateConfig({ maxRetries: 1, enableFallback: false });

      const input = createMockInput();
      await coordinator.dispatch(input);

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'notification.events.failed-v1',
        expect.objectContaining({
          eventType: 'Communication.Notification.FailedV1',
          payload: expect.objectContaining({
            recipientId: 'recipient-123',
            error: expect.stringContaining('Delivery failed'),
          }),
        }),
      );
    });

    it('should emit skipped event when all preferences disabled', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockPreferenceService.isEnabled.mockResolvedValue(false);

      const input = createMockInput();
      await coordinator.dispatch(input);

      expect(mockEventBusService.publish).toHaveBeenCalledWith(
        'notification.events.skipped-v1',
        expect.objectContaining({
          eventType: 'Communication.Notification.SkippedV1',
        }),
      );
    });
  });

  describe('template handling', () => {
    it('should fail when template not found', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockTemplateService.findByName.mockResolvedValue(null);

      const input = createMockInput();
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('should fail when template validation fails', async () => {
      const pushProvider = createMockProvider(NotificationChannel.PUSH);
      coordinator.registerChannelProvider(pushProvider);

      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));
      mockTemplateService.validateVariables.mockReturnValue({
        isValid: false,
      });

      const input = createMockInput({ variables: {} });
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template validation failed');
    });
  });

  describe('NoOpChannelProvider', () => {
    it('should simulate successful delivery', async () => {
      const provider = new NoOpChannelProvider(NotificationChannel.EMAIL);
      const message: RenderedMessage = {
        subject: 'Test Subject',
        body: 'Test Body',
      };
      const recipient: Recipient = {
        recipientId: 'test-123',
        recipientType: 'RIDER',
        email: 'test@example.com',
      };

      const result = await provider.send(message, recipient);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.providerReference).toContain('noop_email');
      expect(provider.getSentCount()).toBe(1);
    });

    it('should simulate failure when configured', async () => {
      const provider = new NoOpChannelProvider(NotificationChannel.SMS);
      provider.setFailure(true, 'Simulated network error');

      const result = await provider.send(
        { subject: null, body: 'Test' },
        { recipientId: 'test', recipientType: 'RIDER', phone: '+254700000000' },
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Simulated network error');
    });

    it('should check delivery capability by channel', () => {
      const emailProvider = new NoOpChannelProvider(NotificationChannel.EMAIL);
      const smsProvider = new NoOpChannelProvider(NotificationChannel.SMS);
      const pushProvider = new NoOpChannelProvider(NotificationChannel.PUSH);

      expect(emailProvider.canDeliver({ recipientId: 'r1', recipientType: 'RIDER', email: 'a@b.com' })).toBe(true);
      expect(emailProvider.canDeliver({ recipientId: 'r1', recipientType: 'RIDER' })).toBe(false);

      expect(smsProvider.canDeliver({ recipientId: 'r1', recipientType: 'RIDER', phone: '+1234' })).toBe(true);
      expect(smsProvider.canDeliver({ recipientId: 'r1', recipientType: 'RIDER' })).toBe(false);

      expect(pushProvider.canDeliver({ recipientId: 'r1', recipientType: 'RIDER', deviceToken: 'token' })).toBe(true);
      expect(pushProvider.canDeliver({ recipientId: 'r1', recipientType: 'RIDER' })).toBe(false);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status for existing notification', async () => {
      const mockNotification = new NotificationEntity();
      mockNotification.id = 'notif-123';
      mockNotification.status = NotificationStatus.SENT;
      mockNotification.channel = NotificationChannel.PUSH;
      mockNotification.sentAt = new Date();
      mockNotification.failedAt = null;
      mockNotification.error = null;
      mockNotification.attempts = 1;

      mockNotificationRepository.findOne.mockResolvedValue(mockNotification);

      const status = await coordinator.getDeliveryStatus('notif-123');

      expect(status).not.toBeNull();
      expect(status?.notificationId).toBe('notif-123');
      expect(status?.status).toBe(NotificationStatus.SENT);
      expect(status?.channel).toBe(NotificationChannel.PUSH);
    });

    it('should return null for non-existent notification', async () => {
      mockNotificationRepository.findOne.mockResolvedValue(null);

      const status = await coordinator.getDeliveryStatus('non-existent');

      expect(status).toBeNull();
    });
  });

  describe('configuration', () => {
    it('should update and retrieve configuration', () => {
      coordinator.updateConfig({
        maxRetries: 5,
        retryDelayMs: 2000,
        enableFallback: false,
        defaultRateLimit: {
          maxPerMinute: 10,
          maxPerHour: 100,
          maxPerDay: 500,
        },
      });

      const config = coordinator.getConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.retryDelayMs).toBe(2000);
      expect(config.enableFallback).toBe(false);
      expect(config.defaultRateLimit.maxPerMinute).toBe(10);
    });
  });

  describe('retry logic', () => {
    it('should retry on transient failures', async () => {
      const provider = createMockProvider(NotificationChannel.PUSH);
      provider.send
        .mockResolvedValueOnce({ success: false, errorMessage: 'Transient error' })
        .mockResolvedValueOnce({ success: false, errorMessage: 'Transient error' })
        .mockResolvedValueOnce({ success: true, messageId: 'msg-success' });

      coordinator.registerChannelProvider(provider);
      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      coordinator.updateConfig({ maxRetries: 3, retryDelayMs: 10 });

      const input = createMockInput();
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(true);
      expect(provider.send).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries exhausted', async () => {
      const provider = createMockProvider(NotificationChannel.PUSH, {
        send: jest.fn().mockResolvedValue({
          success: false,
          errorMessage: 'Persistent error',
        }),
      });

      coordinator.registerChannelProvider(provider);
      mockTemplateService.findByName.mockResolvedValue(createMockTemplate(NotificationChannel.PUSH));

      coordinator.updateConfig({ maxRetries: 2, retryDelayMs: 10, enableFallback: false });

      const input = createMockInput();
      const result = await coordinator.dispatch(input);

      expect(result.success).toBe(false);
      expect(provider.send).toHaveBeenCalledTimes(2);
    });
  });
});
