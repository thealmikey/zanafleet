import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { MetricsService } from '../../../metrics/metrics.service';
import { CreateSubscriptionDto, ListQueryDto } from '../../dto/webhook.dto';
import {
  WebhookDeliveryLog,
  WebhookDeliveryStatus,
} from '../../entities/webhook-delivery-log.entity';
import { WebhookSubscription } from '../../entities/webhook-subscription.entity';
import { WebhookRetryService } from '../../services/webhook-retry.service';
import { WebhookSignatureService } from '../../services/webhook-signature.service';
import { WebhookService } from '../../services/webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;

  const _subscriptionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const _deliveryLogRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    update: jest.fn(),
  };

  const _signatureService = {
    generateSignature: jest.fn(),
    generateHeaders: jest.fn(),
  };

  const _retryService = {
    scheduleRetry: jest.fn(),
    markAsSuccess: jest.fn(),
    markAsFailed: jest.fn(),
  };

  const _metricsService = {
    incrementEventsPublished: jest.fn(),
    incrementEventsPublishedFailed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        {
          provide: getRepositoryToken(WebhookSubscription),
          useValue: _subscriptionRepository,
        },
        {
          provide: getRepositoryToken(WebhookDeliveryLog),
          useValue: _deliveryLogRepository,
        },
        {
          provide: WebhookSignatureService,
          useValue: _signatureService,
        },
        {
          provide: WebhookRetryService,
          useValue: _retryService,
        },
        {
          provide: MetricsService,
          useValue: _metricsService,
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);

    jest.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should create a new subscription', async () => {
      const dto: CreateSubscriptionDto = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['payment.events.completed-v1'],
        description: 'Test description',
      };

      _subscriptionRepository.create.mockReturnValue({
        id: 'test-id',
        workspaceId: 'workspace-1',
        ...dto,
        secret: 'generated-secret',
        isActive: true,
      } as unknown as WebhookSubscription);

      _subscriptionRepository.save.mockResolvedValue({
        id: 'test-id',
        workspaceId: 'workspace-1',
        ...dto,
        secret: 'generated-secret',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as WebhookSubscription);

      const result = await service.subscribe('workspace-1', dto);

      expect(result).toBeDefined();
      expect(result.url).toBe(dto.url);
      expect(result.events).toEqual(dto.events);
      expect(_subscriptionRepository.create).toHaveBeenCalled();
      expect(_subscriptionRepository.save).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should delete a subscription', async () => {
      _subscriptionRepository.delete.mockResolvedValue({ affected: 1, raw: {} });

      await service.unsubscribe('workspace-1', 'subscription-id');

      expect(_subscriptionRepository.delete).toHaveBeenCalledWith({
        id: 'subscription-id',
        workspaceId: 'workspace-1',
      });
    });

    it('should throw NotFoundException if subscription not found', async () => {
      _subscriptionRepository.delete.mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.unsubscribe('workspace-1', 'non-existent-id')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('listByWorkspace', () => {
    it('should return subscriptions with pagination', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          workspaceId: 'workspace-1',
          url: 'https://example.com/1',
          events: ['event1'],
          isActive: true,
          name: 'Test 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'sub-2',
          workspaceId: 'workspace-1',
          url: 'https://example.com/2',
          events: ['event2'],
          isActive: true,
          name: 'Test 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      _subscriptionRepository.findAndCount.mockResolvedValue([mockSubscriptions, 2]);

      const query: ListQueryDto = { page: 1, limit: 10 };
      const result = await service.listByWorkspace('workspace-1', query);

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('getSubscription', () => {
    it('should return a subscription by id', async () => {
      const mockSubscription = {
        id: 'sub-1',
        workspaceId: 'workspace-1',
        url: 'https://example.com',
        events: ['event1'],
        isActive: true,
        name: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      _subscriptionRepository.findOne.mockResolvedValue(
        mockSubscription as unknown as WebhookSubscription
      );

      const result = await service.getSubscription('workspace-1', 'sub-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('sub-1');
    });

    it('should throw NotFoundException if subscription not found', async () => {
      _subscriptionRepository.findOne.mockResolvedValue(null);

      await expect(service.getSubscription('workspace-1', 'non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('findSubscriptionsForEvent', () => {
    it('should return subscriptions matching the event type', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          workspaceId: 'workspace-1',
          url: 'https://example.com',
          events: ['payment.events.completed-v1'],
          isActive: true,
        },
      ];

      _subscriptionRepository.find.mockResolvedValue(
        mockSubscriptions as unknown as WebhookSubscription[]
      );

      const result = await service.findSubscriptionsForEvent(
        'payment.events.completed-v1',
        'workspace-1'
      );

      expect(result).toHaveLength(1);
      expect(result[0].events).toContain('payment.events.completed-v1');
    });

    it('should support wildcard subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          workspaceId: 'workspace-1',
          url: 'https://example.com',
          events: ['*'],
          isActive: true,
        },
      ];

      _subscriptionRepository.find.mockResolvedValue(
        mockSubscriptions as unknown as WebhookSubscription[]
      );

      const result = await service.findSubscriptionsForEvent('any.event.type', 'workspace-1');

      expect(result).toHaveLength(1);
    });
  });

  describe('listDeliveries', () => {
    it('should return delivery logs with pagination', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          subscriptionId: 'sub-1',
          workspaceId: 'workspace-1',
          eventType: 'payment.events.completed-v1',
          payload: {},
          attemptNumber: 1,
          status: WebhookDeliveryStatus.SUCCESS,
          createdAt: new Date(),
        },
      ];

      _deliveryLogRepository.findAndCount.mockResolvedValue([mockLogs, 1]);

      const query: ListQueryDto = { page: 1, limit: 10 };
      const result = await service.listDeliveries('workspace-1', query);

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getDelivery', () => {
    it('should return a delivery log by id', async () => {
      const mockLog = {
        id: 'log-1',
        subscriptionId: 'sub-1',
        workspaceId: 'workspace-1',
        eventType: 'payment.events.completed-v1',
        payload: {},
        attemptNumber: 1,
        status: WebhookDeliveryStatus.SUCCESS,
        createdAt: new Date(),
      };

      _deliveryLogRepository.findOne.mockResolvedValue(mockLog as unknown as WebhookDeliveryLog);

      const result = await service.getDelivery('workspace-1', 'log-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('log-1');
    });

    it('should throw NotFoundException if delivery not found', async () => {
      _deliveryLogRepository.findOne.mockResolvedValue(null);

      await expect(service.getDelivery('workspace-1', 'non-existent')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
