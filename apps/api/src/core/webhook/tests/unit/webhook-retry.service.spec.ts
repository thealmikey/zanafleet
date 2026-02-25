import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { RetryDefaults } from '../../../event-bus/event-bus.constants';
import { JobQueueService } from '../../../job-queue/job-queue.service';
import {
  WebhookDeliveryLog,
  WebhookDeliveryStatus,
} from '../../entities/webhook-delivery-log.entity';
import { WebhookRetryService } from '../../services/webhook-retry.service';

describe('WebhookRetryService', () => {
  let service: WebhookRetryService;

  const _repository = {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const _jobQueueService = {
    enqueue: jest.fn().mockResolvedValue('test-job-id'),
    enqueueInWorkspace: jest.fn().mockResolvedValue('test-job-id'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookRetryService,
        {
          provide: getRepositoryToken(WebhookDeliveryLog),
          useValue: _repository,
        },
        {
          provide: JobQueueService,
          useValue: _jobQueueService,
        },
      ],
    }).compile();

    service = module.get<WebhookRetryService>(WebhookRetryService);

    jest.clearAllMocks();
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff delay correctly', () => {
      const baseDelayMs = 1000;
      const multiplier = 2;

      // Attempt 0: 1000 * 2^0 = 1000
      expect(service.calculateDelay(0, baseDelayMs, multiplier)).toBe(1000);

      // Attempt 1: 1000 * 2^1 = 2000
      expect(service.calculateDelay(1, baseDelayMs, multiplier)).toBe(2000);

      // Attempt 2: 1000 * 2^2 = 4000
      expect(service.calculateDelay(2, baseDelayMs, multiplier)).toBe(4000);

      // Attempt 3: 1000 * 2^3 = 8000
      expect(service.calculateDelay(3, baseDelayMs, multiplier)).toBe(8000);
    });

    it('should use default values when not provided', () => {
      // Using default RetryDefaults: MAX_RETRIES=3, BASE_DELAY_MS=1000, MULTIPLIER=2
      expect(service.calculateDelay(0, RetryDefaults.BASE_DELAY_MS, RetryDefaults.MULTIPLIER)).toBe(
        1000
      );
      expect(service.calculateDelay(1, RetryDefaults.BASE_DELAY_MS, RetryDefaults.MULTIPLIER)).toBe(
        2000
      );
      expect(service.calculateDelay(2, RetryDefaults.BASE_DELAY_MS, RetryDefaults.MULTIPLIER)).toBe(
        4000
      );
    });
  });

  describe('getDelaySequence', () => {
    it('should return the sequence of delays for configured retries', () => {
      const delays = service.getDelaySequence();

      expect(delays).toEqual([1000, 2000, 4000]); // 3 retries with default config
    });

    it('should return custom delay sequence with provided values', () => {
      const delays = service.getDelaySequence(5, 500, 3);

      expect(delays).toEqual([500, 1500, 4500, 13500, 40500]);
    });
  });

  describe('scheduleRetry', () => {
    it('should schedule a retry for a failed delivery', async () => {
      const mockDeliveryLog = {
        id: 'log-1',
        subscriptionId: 'sub-1',
        workspaceId: 'workspace-1',
        eventType: 'payment.events.completed-v1',
        payload: {},
        attemptNumber: 1,
        status: WebhookDeliveryStatus.FAILED,
        createdAt: new Date(),
      };

      _repository.findOne.mockResolvedValue(mockDeliveryLog as unknown as WebhookDeliveryLog);
      _repository.update.mockResolvedValue({ affected: 1, raw: {} });

      await service.scheduleRetry('log-1');

      expect(_repository.findOne).toHaveBeenCalledWith({ where: { id: 'log-1' } });
      expect(_repository.update).toHaveBeenCalled();
    });

    it('should mark as failed when max retries exceeded', async () => {
      const mockDeliveryLog = {
        id: 'log-1',
        subscriptionId: 'sub-1',
        workspaceId: 'workspace-1',
        eventType: 'payment.events.completed-v1',
        payload: {},
        attemptNumber: 3, // Already at max retries
        status: WebhookDeliveryStatus.FAILED,
        createdAt: new Date(),
      };

      _repository.findOne.mockResolvedValue(mockDeliveryLog as unknown as WebhookDeliveryLog);
      _repository.update.mockResolvedValue({ affected: 1, raw: {} });

      await service.scheduleRetry('log-1');

      // Should update to FAILED status instead of scheduling retry
      expect(_repository.update).toHaveBeenCalledWith('log-1', {
        status: WebhookDeliveryStatus.FAILED,
        nextRetryAt: null,
      });
    });

    it('should do nothing if delivery log not found', async () => {
      _repository.findOne.mockResolvedValue(null);

      await service.scheduleRetry('non-existent');

      expect(_repository.update).not.toHaveBeenCalled();
    });
  });

  describe('markAsFailed', () => {
    it('should update delivery log status to failed', async () => {
      _repository.update.mockResolvedValue({ affected: 1, raw: {} });

      await service.markAsFailed('log-1', 'Connection timeout');

      expect(_repository.update).toHaveBeenCalledWith('log-1', {
        status: WebhookDeliveryStatus.FAILED,
        errorMessage: 'Connection timeout',
        nextRetryAt: null,
      });
    });
  });

  describe('markAsSuccess', () => {
    it('should update delivery log status to success', async () => {
      _repository.update.mockResolvedValue({ affected: 1, raw: {} });

      await service.markAsSuccess('log-1', 200, 'OK');

      expect(_repository.update).toHaveBeenCalledWith('log-1', {
        status: WebhookDeliveryStatus.SUCCESS,
        responseStatus: 200,
        responseBody: 'OK',
        deliveredAt: expect.any(Date),
        nextRetryAt: null,
      });
    });
  });

  describe('getPendingRetries', () => {
    it('should return pending retries', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          status: WebhookDeliveryStatus.RETRIED,
          nextRetryAt: new Date(),
        },
      ];

      _repository.find.mockResolvedValue(mockLogs as unknown as WebhookDeliveryLog[]);

      const result = await service.getPendingRetries();

      expect(result).toHaveLength(1);
      expect(_repository.find).toHaveBeenCalledWith({
        where: {
          status: WebhookDeliveryStatus.RETRIED,
          nextRetryAt: expect.any(Object),
        },
        take: 100,
        order: { createdAt: 'ASC' },
      });
    });
  });
});
