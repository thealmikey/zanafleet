import { EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { MessagingService } from '../../../../core/messaging/services/messaging.service';
import { SendNotificationCommand } from '../../commands/send-notification.command';
import {
  NotificationChannel,
  NotificationStatus,
  RecipientType,
} from '../../dto/notification.enums';
import { NotificationEntity } from '../../entities/notification.entity';
import { NotificationFailedEventV1 } from '../../events/notification-failed.event';
import { NotificationSentEventV1 } from '../../events/notification-sent.event';
import { NotificationSkippedEventV1 } from '../../events/notification-skipped.event';
import { SendNotificationCommandHandler } from '../../handlers/send-notification.handler';
import { PreferenceService } from '../../services/preference.service';

describe('SendNotificationCommandHandler', () => {
  let handler: SendNotificationCommandHandler;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMessagingService = {
    send: jest.fn(),
  };

  const mockEventBus = {
    publish: jest.fn(),
  };

  const mockPreferenceService = {
    isEnabled: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SendNotificationCommandHandler,
        {
          provide: getRepositoryToken(NotificationEntity),
          useValue: mockNotificationRepository,
        },
        {
          provide: MessagingService,
          useValue: mockMessagingService,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
        {
          provide: PreferenceService,
          useValue: mockPreferenceService,
        },
      ],
    }).compile();

    handler = module.get<SendNotificationCommandHandler>(
      SendNotificationCommandHandler,
    );

    // Default all preference checks to enabled
    mockPreferenceService.isEnabled.mockResolvedValue(true);
  });

  describe('execute', () => {
    it('should be defined', () => {
      expect(handler).toBeDefined();
    });

    it('should create a notification entity with pending status', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'welcome-template',
        { name: 'John' },
        'workspace-id-123',
      );

      const mockNotification = {
        id: expect.any(String),
        channel: NotificationChannel.EMAIL,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.ACTOR,
        status: NotificationStatus.PENDING,
        templateId: 'welcome-template',
        renderedSubject: expect.any(String),
        renderedBody: expect.any(String),
        workspaceId: 'workspace-id-123',
        correlationId: undefined,
        causationId: undefined,
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      await handler.execute(command);

      expect(mockNotificationRepository.create).toHaveBeenCalled();
    });

    it('should call MessagingService with correct message payload', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'welcome-template',
        { name: 'John' },
        'workspace-id-123',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.EMAIL,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.ACTOR,
        status: NotificationStatus.PENDING,
        templateId: 'welcome-template',
        renderedSubject: 'Welcome',
        renderedBody: 'Welcome John',
        workspaceId: 'workspace-id-123',
        correlationId: undefined,
        causationId: undefined,
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      await handler.execute(command);

      expect(mockMessagingService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.EMAIL,
          recipient: 'recipient-id-123',
          subject: expect.any(String),
          body: expect.any(String),
          metadata: expect.objectContaining({
            notificationId: expect.any(String),
            templateId: 'welcome-template',
            recipientType: RecipientType.ACTOR,
          }),
        }),
      );
    });

    it('should publish NotificationSentEventV1 when message is sent successfully', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.RIDER,
        NotificationChannel.SMS,
        'otp-template',
        { code: '123456' },
        'workspace-id-123',
        'corr-id-123',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.SMS,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.RIDER,
        status: NotificationStatus.PENDING,
        templateId: 'otp-template',
        renderedSubject: null,
        renderedBody: 'Your OTP is 123456',
        workspaceId: 'workspace-id-123',
        correlationId: 'corr-id-123',
        causationId: undefined,
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'sms_msg_123',
      });

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(NotificationSentEventV1),
      );

      const createdDto = mockNotificationRepository.create.mock.calls[0][0];
      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.eventType).toBe('NotificationSentEvent-V1');
      expect(publishedEvent.notificationId).toBe(createdDto.id);
      expect(publishedEvent.messageId).toBe('sms_msg_123');
      expect(publishedEvent.correlationId).toBe('corr-id-123');
    });

    it('should update notification to SENT status and save when successful', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.BUSINESS,
        NotificationChannel.PUSH,
        'alert-template',
        {},
        'workspace-id-123',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.PUSH,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.BUSINESS,
        status: NotificationStatus.PENDING,
        templateId: 'alert-template',
        renderedSubject: 'Alert',
        renderedBody: 'System alert',
        workspaceId: 'workspace-id-123',
        sentAt: null,
        failedAt: null,
        error: null,
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'push_msg_123',
      });

      await handler.execute(command);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: NotificationStatus.SENT,
          sentAt: expect.any(Date),
        }),
      );
    });

    it('should publish NotificationFailedEventV1 when message send fails', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'template-123',
        {},
        'workspace-id-123',
        'corr-id-456',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.EMAIL,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.ACTOR,
        status: NotificationStatus.PENDING,
        templateId: 'template-123',
        renderedSubject: 'Test',
        renderedBody: 'Test body',
        workspaceId: 'workspace-id-123',
        correlationId: 'corr-id-456',
        attempts: 1,
        error: null,
        failedAt: null,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: false,
        error: 'Email service unavailable',
      });

      await handler.execute(command);

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(NotificationFailedEventV1),
      );

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.eventType).toBe('NotificationFailedEvent-V1');
      expect(publishedEvent.error).toBe('Email service unavailable');
      expect(publishedEvent.correlationId).toBe('corr-id-456');
    });

    it('should update notification to FAILED status and save when send fails', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.RIDER,
        NotificationChannel.SMS,
        'template-123',
        {},
        'workspace-id-123',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.SMS,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.RIDER,
        status: NotificationStatus.PENDING,
        templateId: 'template-123',
        renderedSubject: null,
        renderedBody: 'Test',
        workspaceId: 'workspace-id-123',
        sentAt: null,
        failedAt: null,
        error: null,
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: false,
        error: 'Invalid phone number',
      });

      await handler.execute(command);

      expect(mockNotificationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: NotificationStatus.FAILED,
          failedAt: expect.any(Date),
          error: 'Invalid phone number',
        }),
      );
    });

    it('should handle exceptions and publish failed event', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'template-123',
        {},
        'workspace-id-123',
        'corr-id-789',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.EMAIL,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.ACTOR,
        status: NotificationStatus.PENDING,
        templateId: 'template-123',
        renderedSubject: 'Test',
        renderedBody: 'Test',
        workspaceId: 'workspace-id-123',
        correlationId: 'corr-id-789',
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(handler.execute(command)).rejects.toThrow(
        'Database connection failed',
      );

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(NotificationFailedEventV1),
      );

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.error).toBe('Database connection failed');
      expect(publishedEvent.correlationId).toBe('corr-id-789');
    });

    it('should return notification ID on success', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'template-123',
        {},
        'workspace-id-123',
      );

      const notificationId = 'notification-id-123';
      const mockNotification = {
        id: notificationId,
        channel: NotificationChannel.EMAIL,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.ACTOR,
        status: NotificationStatus.PENDING,
        templateId: 'template-123',
        renderedSubject: 'Test',
        renderedBody: 'Test',
        workspaceId: 'workspace-id-123',
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      const result = await handler.execute(command);

      expect(result).toEqual({ notificationId: expect.any(String) });
    });

    it('should render templates with variables', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'welcome-template',
        { firstName: 'John', lastName: 'Doe', city: 'New York' },
        'workspace-id-123',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.EMAIL,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.ACTOR,
        status: NotificationStatus.PENDING,
        templateId: 'welcome-template',
        renderedSubject: expect.stringContaining('John'),
        renderedBody: expect.stringContaining('Doe'),
        workspaceId: 'workspace-id-123',
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      await handler.execute(command);

      expect(mockNotificationRepository.create).toHaveBeenCalled();
    });

    it('should check preferences before sending', async () => {
      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'template-123',
        {},
        'workspace-id-123',
        'corr-id-123',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.EMAIL,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.ACTOR,
        status: NotificationStatus.PENDING,
        templateId: 'template-123',
        renderedSubject: 'Test',
        renderedBody: 'Test body',
        workspaceId: 'workspace-id-123',
        correlationId: 'corr-id-123',
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'msg-123',
      });

      await handler.execute(command);

      expect(mockPreferenceService.isEnabled).toHaveBeenCalledWith(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'workspace-id-123',
      );
    });

    it('should skip notification and emit NotificationSkippedEventV1 when preferences disabled', async () => {
      mockPreferenceService.isEnabled.mockResolvedValue(false);

      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.ACTOR,
        NotificationChannel.EMAIL,
        'template-123',
        {},
        'workspace-id-123',
        'corr-id-123',
      );

      const result = await handler.execute(command);

      expect(mockMessagingService.send).not.toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(NotificationSkippedEventV1),
      );

      const publishedEvent = mockEventBus.publish.mock.calls[0][0];
      expect(publishedEvent.eventType).toBe('NotificationSkippedEvent-V1');
      expect(publishedEvent.reason).toBe('PREFERENCE_DISABLED');
      expect(publishedEvent.recipientId).toBe('recipient-id-123');
      expect(publishedEvent.correlationId).toBe('corr-id-123');
      expect(result).toEqual({ notificationId: expect.any(String) });
    });

    it('should proceed with sending when preferences enabled', async () => {
      mockPreferenceService.isEnabled.mockResolvedValue(true);

      const command = new SendNotificationCommand(
        'recipient-id-123',
        RecipientType.RIDER,
        NotificationChannel.SMS,
        'otp-template',
        { code: '123456' },
        'workspace-id-123',
      );

      const mockNotification = {
        id: 'notification-id-123',
        channel: NotificationChannel.SMS,
        recipientId: 'recipient-id-123',
        recipientType: RecipientType.RIDER,
        status: NotificationStatus.PENDING,
        templateId: 'otp-template',
        renderedSubject: null,
        renderedBody: 'Your OTP is 123456',
        workspaceId: 'workspace-id-123',
        attempts: 1,
      };

      mockNotificationRepository.create.mockReturnValue(mockNotification);
      mockMessagingService.send.mockResolvedValue({
        success: true,
        messageId: 'sms_msg_123',
      });

      await handler.execute(command);

      expect(mockMessagingService.send).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.any(NotificationSentEventV1),
      );
    });
  });
});
