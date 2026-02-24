import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { NotificationsController } from '../../controllers/notifications.controller';
import { NotificationDispatchCoordinator } from '../../coordinators/notification-dispatch.coordinator';
import {
  NotificationChannel,
  RecipientType,
  NotificationStatus,
} from '../../dto/notification.enums';

describe('NotificationsController (e2e)', () => {
  let app: INestApplication;
  let mockCoordinator: {
    dispatch: jest.Mock;
    dispatchBatch: jest.Mock;
    getDeliveryStatus: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  beforeEach(async () => {
    mockCoordinator = {
      dispatch: jest.fn(),
      dispatchBatch: jest.fn(),
      getDeliveryStatus: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        Reflector,
        { provide: NotificationDispatchCoordinator, useValue: mockCoordinator },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'notification.send'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: notification.send');
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /notifications/dispatch', () => {
    it('should return 200 and pass body to coordinator.dispatch', async () => {
      const mockResult = {
        success: true,
        notificationId: 'notif-123',
        channel: NotificationChannel.EMAIL,
        messageId: 'msg-456',
        providerReference: 'ref-789',
      };
      mockCoordinator.dispatch.mockResolvedValue(mockResult);

      const dto = {
        recipientId: 'recipient-123',
        recipientType: RecipientType.RIDER,
        templateName: 'welcome_email',
        variables: { name: 'John' },
        channels: [NotificationChannel.EMAIL],
        workspaceId: 'workspace-123',
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/dispatch')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        notificationId: 'notif-123',
        channel: NotificationChannel.EMAIL,
        messageId: 'msg-456',
      });
      expect(mockCoordinator.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'recipient-123',
          recipientType: RecipientType.RIDER,
          templateName: 'welcome_email',
          channels: [NotificationChannel.EMAIL],
          workspaceId: 'workspace-123',
        })
      );
    });

    it('should handle dispatch with fallback channels', async () => {
      const mockResult = {
        success: true,
        notificationId: 'notif-456',
        channel: NotificationChannel.SMS,
        messageId: 'msg-789',
        fallbackUsed: true,
      };
      mockCoordinator.dispatch.mockResolvedValue(mockResult);

      const dto = {
        recipientId: 'recipient-456',
        recipientType: RecipientType.BUSINESS,
        templateName: 'order_confirmation',
        variables: { orderId: 'ORD-123' },
        channels: [NotificationChannel.PUSH],
        fallbackChannels: [NotificationChannel.SMS],
        workspaceId: 'workspace-456',
        locale: 'en-KE',
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/dispatch')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        notificationId: 'notif-456',
        channel: NotificationChannel.SMS,
        fallbackUsed: true,
      });
    });

    it('should handle dispatch with recipient contact info', async () => {
      const mockResult = {
        success: true,
        notificationId: 'notif-789',
        channel: NotificationChannel.WHATSAPP,
        messageId: 'wa-123',
      };
      mockCoordinator.dispatch.mockResolvedValue(mockResult);

      const dto = {
        recipientId: 'recipient-789',
        recipientType: RecipientType.RIDER,
        templateName: 'delivery_update',
        variables: { status: 'delivered' },
        channels: [NotificationChannel.WHATSAPP],
        workspaceId: 'workspace-789',
        recipientContact: {
          phone: '+254700000000',
          whatsappId: 'wa-recipient-123',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/dispatch')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        notificationId: 'notif-789',
        channel: NotificationChannel.WHATSAPP,
      });
      expect(mockCoordinator.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientContact: {
            phone: '+254700000000',
            whatsappId: 'wa-recipient-123',
          },
        })
      );
    });

    it('should handle failed dispatch', async () => {
      const mockResult = {
        success: false,
        notificationId: 'notif-fail',
        error: 'Template not found',
      };
      mockCoordinator.dispatch.mockResolvedValue(mockResult);

      const dto = {
        recipientId: 'recipient-123',
        recipientType: RecipientType.RIDER,
        templateName: 'nonexistent_template',
        variables: {},
        channels: [NotificationChannel.EMAIL],
        workspaceId: 'workspace-123',
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/dispatch')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Template not found',
      });
    });
  });

  describe('POST /notifications/dispatch/batch', () => {
    it('should return 200 and pass array to coordinator.dispatchBatch', async () => {
      const mockResult = {
        success: true,
        totalProcessed: 3,
        successCount: 2,
        failedCount: 1,
        skippedCount: 0,
        results: [
          { success: true, notificationId: 'n1', channel: NotificationChannel.EMAIL },
          { success: true, notificationId: 'n2', channel: NotificationChannel.SMS },
          { success: false, notificationId: 'n3', error: 'Rate limit exceeded' },
        ],
      };
      mockCoordinator.dispatchBatch.mockResolvedValue(mockResult);

      const dto = {
        notifications: [
          {
            recipientId: 'r1',
            recipientType: RecipientType.RIDER,
            templateName: 'batch_notification',
            variables: { index: '1' },
            channels: [NotificationChannel.EMAIL],
            workspaceId: 'workspace-123',
          },
          {
            recipientId: 'r2',
            recipientType: RecipientType.RIDER,
            templateName: 'batch_notification',
            variables: { index: '2' },
            channels: [NotificationChannel.SMS],
            workspaceId: 'workspace-123',
          },
          {
            recipientId: 'r3',
            recipientType: RecipientType.BUSINESS,
            templateName: 'batch_notification',
            variables: { index: '3' },
            channels: [NotificationChannel.PUSH],
            workspaceId: 'workspace-123',
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/dispatch/batch')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        totalProcessed: 3,
        successCount: 2,
        failedCount: 1,
        skippedCount: 0,
      });
      expect(response.body.results).toHaveLength(3);
      expect(mockCoordinator.dispatchBatch).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ recipientId: 'r1' }),
          expect.objectContaining({ recipientId: 'r2' }),
          expect.objectContaining({ recipientId: 'r3' }),
        ])
      );
    });

    it('should handle empty batch', async () => {
      const mockResult = {
        success: true,
        totalProcessed: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };
      mockCoordinator.dispatchBatch.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/notifications/dispatch/batch')
        .send({ notifications: [] })
        .expect(200);

      expect(response.body).toMatchObject({
        totalProcessed: 0,
        successCount: 0,
      });
    });
  });

  describe('GET /notifications/:id/status', () => {
    it('should return 200 with delivery status', async () => {
      const mockStatus = {
        notificationId: 'notif-123',
        status: NotificationStatus.SENT,
        channel: NotificationChannel.EMAIL,
        sentAt: new Date('2024-01-15T10:00:00Z'),
        failedAt: null,
        error: null,
        attempts: 1,
      };
      mockCoordinator.getDeliveryStatus.mockResolvedValue(mockStatus);

      const response = await request(app.getHttpServer())
        .get('/notifications/notif-123/status')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.objectContaining({
          notificationId: 'notif-123',
          status: NotificationStatus.SENT,
          channel: NotificationChannel.EMAIL,
          attempts: 1,
        }),
      });
      expect(mockCoordinator.getDeliveryStatus).toHaveBeenCalledWith('notif-123');
    });

    it('should return 200 with null status when notification not found', async () => {
      mockCoordinator.getDeliveryStatus.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get('/notifications/non-existent/status')
        .expect(200);

      expect(response.body).toEqual({ status: null });
      expect(mockCoordinator.getDeliveryStatus).toHaveBeenCalledWith('non-existent');
    });

    it('should return 200 with failed status', async () => {
      const mockStatus = {
        notificationId: 'notif-failed',
        status: NotificationStatus.FAILED,
        channel: NotificationChannel.SMS,
        sentAt: null,
        failedAt: new Date('2024-01-15T10:05:00Z'),
        error: 'Provider unavailable',
        attempts: 3,
      };
      mockCoordinator.getDeliveryStatus.mockResolvedValue(mockStatus);

      const response = await request(app.getHttpServer())
        .get('/notifications/notif-failed/status')
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.objectContaining({
          status: NotificationStatus.FAILED,
          error: 'Provider unavailable',
          attempts: 3,
        }),
      });
    });
  });

  describe('Fallback scenario', () => {
    it('should indicate fallback was used when primary channel fails', async () => {
      const mockResult = {
        success: true,
        notificationId: 'notif-fallback',
        channel: NotificationChannel.SMS,
        messageId: 'sms-123',
        fallbackUsed: true,
      };
      mockCoordinator.dispatch.mockResolvedValue(mockResult);

      const dto = {
        recipientId: 'recipient-fallback',
        recipientType: RecipientType.RIDER,
        templateName: 'urgent_alert',
        variables: { message: 'Important update' },
        channels: [NotificationChannel.PUSH],
        fallbackChannels: [NotificationChannel.SMS, NotificationChannel.EMAIL],
        workspaceId: 'workspace-fallback',
      };

      const response = await request(app.getHttpServer())
        .post('/notifications/dispatch')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        fallbackUsed: true,
        channel: NotificationChannel.SMS,
      });
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks notification.send capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      const dto = {
        recipientId: 'recipient-123',
        recipientType: RecipientType.RIDER,
        templateName: 'test_template',
        variables: {},
        channels: [NotificationChannel.EMAIL],
        workspaceId: 'workspace-123',
      };

      await request(app.getHttpServer()).post('/notifications/dispatch').send(dto).expect(403);
    });

    it('should return 403 for batch dispatch when lacking capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/notifications/dispatch/batch')
        .send({ notifications: [] })
        .expect(403);
    });

    it('should return 403 for status check when lacking capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer()).get('/notifications/notif-123/status').expect(403);
    });
  });
});
