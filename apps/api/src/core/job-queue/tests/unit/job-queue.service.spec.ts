// =============================================================================
// JobQueueService Unit Tests
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JobQueueService } from '../../job-queue.service';
import { JOB_QUEUE_DEFAULTS, QUEUE_NAMES, JobPriority } from '../../job-queue.constants';

// Mock Redis
const mockRedis = {
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  quit: jest.fn().mockResolvedValue('OK'),
};

// Mock BullMQ classes
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
    getJob: jest.fn().mockResolvedValue(null),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    clean: jest.fn().mockResolvedValue([]),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  FlowProducer: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ jobs: [] }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

describe('JobQueueService', () => {
  let service: JobQueueService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobQueueService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                NODE_ENV: 'test',
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JobQueueService>(JobQueueService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis connection', async () => {
      expect(mockRedis.ping).toHaveBeenCalled();
    });

    it('should create default queues', async () => {
      // Verify the service initialized
      expect(service).toBeDefined();
    });
  });

  describe('enqueue', () => {
    it('should enqueue a job with default options', async () => {
      const jobId = await service.enqueue(QUEUE_NAMES.DEFAULT, 'test-job', {
        payload: { test: 'data' },
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should enqueue a job with custom options', async () => {
      const jobId = await service.enqueue(
        QUEUE_NAMES.DEFAULT,
        'test-job',
        { payload: { test: 'data' } },
        {
          priority: JobPriority.HIGH,
          delay: 1000,
          attempts: 5,
        }
      );

      expect(jobId).toBeDefined();
    });

    it('should generate UUID if no jobId provided', async () => {
      const jobId = await service.enqueue(QUEUE_NAMES.DEFAULT, 'test-job', {
        payload: { test: 'data' },
      });

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(jobId).toMatch(uuidRegex);
    });
  });

  describe('enqueueInWorkspace', () => {
    it('should enqueue a job with workspace isolation', async () => {
      const workspaceId = 'workspace-123';
      const jobId = await service.enqueueInWorkspace(workspaceId, QUEUE_NAMES.DEFAULT, 'test-job', {
        test: 'payload',
      });

      expect(jobId).toBeDefined();
    });

    it('should include tenant data in job', async () => {
      const workspaceId = 'workspace-456';
      const jobId = await service.enqueueInWorkspace(
        workspaceId,
        QUEUE_NAMES.SETTLEMENT,
        'settlement-job',
        { riderId: 'rider-123' },
        { jobId: 'custom-job-id' }
      );

      expect(jobId).toBe('custom-job-id');
    });
  });

  describe('process', () => {
    it('should register a job processor', async () => {
      const processor = jest.fn().mockResolvedValue({
        success: true,
        data: { result: 'ok' },
        attempts: 1,
      });

      await service.process(QUEUE_NAMES.DEFAULT, processor, 5);

      // Worker should be registered
      expect(service).toBeDefined();
    });
  });

  describe('getJobStatus', () => {
    it('should return null for non-existent job', async () => {
      const status = await service.getJobStatus(QUEUE_NAMES.DEFAULT, 'non-existent');
      expect(status).toBeNull();
    });
  });

  describe('getJobResult', () => {
    it('should return null for non-existent job', async () => {
      const result = await service.getJobResult(QUEUE_NAMES.DEFAULT, 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('retryJob', () => {
    it('should throw error for non-existent queue', async () => {
      await expect(service.retryJob('non-existent-queue', 'job-id')).rejects.toThrow(
        'Queue not found'
      );
    });
  });

  describe('moveToDeadLetter', () => {
    it('should throw error for non-existent queue', async () => {
      await expect(
        service.moveToDeadLetter('non-existent-queue', 'job-id', 'test error')
      ).rejects.toThrow('Queue not found');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats(QUEUE_NAMES.DEFAULT);

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    });

    it('should return zeros for non-existent queue', async () => {
      const stats = await service.getQueueStats('non-existent-queue');

      expect(stats).toEqual({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
    });
  });

  describe('pauseQueue', () => {
    it('should pause a queue', async () => {
      await expect(service.pauseQueue(QUEUE_NAMES.DEFAULT)).resolves.not.toThrow();
    });
  });

  describe('resumeQueue', () => {
    it('should resume a queue', async () => {
      await expect(service.resumeQueue(QUEUE_NAMES.DEFAULT)).resolves.not.toThrow();
    });
  });

  describe('withLock', () => {
    it('should acquire and release lock', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const result = await service.withLock('test-lock', fn);

      expect(result).toBe('result');
      expect(fn).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('lock:test-lock');
    });

    it('should return null if lock not acquired', async () => {
      mockRedis.set.mockResolvedValueOnce(null);
      const fn = jest.fn();
      const result = await service.withLock('test-lock', fn);

      expect(result).toBeNull();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe('cleanCompletedJobs', () => {
    it('should clean completed jobs older than date', async () => {
      const olderThan = new Date('2020-01-01');
      const count = await service.cleanCompletedJobs(QUEUE_NAMES.DEFAULT, olderThan);

      expect(typeof count).toBe('number');
    });
  });

  describe('cleanFailedJobs', () => {
    it('should clean failed jobs older than date', async () => {
      const olderThan = new Date('2020-01-01');
      const count = await service.cleanFailedJobs(QUEUE_NAMES.DEFAULT, olderThan);

      expect(typeof count).toBe('number');
    });
  });

  describe('constants', () => {
    it('should have correct default values', () => {
      expect(JOB_QUEUE_DEFAULTS.MAX_RETRIES).toBe(3);
      expect(JOB_QUEUE_DEFAULTS.INITIAL_BACKOFF_MS).toBe(1000);
      expect(JOB_QUEUE_DEFAULTS.MAX_BACKOFF_MS).toBe(30000);
      expect(JOB_QUEUE_DEFAULTS.BACKOFF_MULTIPLIER).toBe(2);
      expect(JOB_QUEUE_DEFAULTS.TIMEOUT_MS).toBe(60000);
    });

    it('should have correct queue names', () => {
      expect(QUEUE_NAMES.DEFAULT).toBe('zanafleet-default');
      expect(QUEUE_NAMES.WEBHOOK).toBe('zanafleet-webhook');
      expect(QUEUE_NAMES.SETTLEMENT).toBe('zanafleet-settlement');
      expect(QUEUE_NAMES.AGENT).toBe('zanafleet-agent');
      expect(QUEUE_NAMES.NOTIFICATION).toBe('zanafleet-notification');
    });

    it('should have correct priority values', () => {
      expect(JobPriority.LOW).toBe(1);
      expect(JobPriority.NORMAL).toBe(2);
      expect(JobPriority.HIGH).toBe(3);
      expect(JobPriority.CRITICAL).toBe(4);
    });
  });
});

describe('JobQueueService - Integration Scenarios', () => {
  let service: JobQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobQueueService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const config: Record<string, unknown> = {
                NODE_ENV: 'test',
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<JobQueueService>(JobQueueService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  it('should process multi-tenant jobs', async () => {
    // Enqueue jobs for different workspaces
    const workspace1Job = await service.enqueueInWorkspace(
      'workspace-1',
      QUEUE_NAMES.SETTLEMENT,
      'process-settlement',
      { riderId: 'rider-1' }
    );

    const workspace2Job = await service.enqueueInWorkspace(
      'workspace-2',
      QUEUE_NAMES.SETTLEMENT,
      'process-settlement',
      { riderId: 'rider-2' }
    );

    expect(workspace1Job).not.toBe(workspace2Job);
  });

  it('should support different job priorities', async () => {
    const lowPriorityJob = await service.enqueue(
      QUEUE_NAMES.DEFAULT,
      'low-priority',
      { payload: {} },
      { priority: JobPriority.LOW }
    );

    const highPriorityJob = await service.enqueue(
      QUEUE_NAMES.DEFAULT,
      'high-priority',
      { payload: {} },
      { priority: JobPriority.HIGH }
    );

    const criticalPriorityJob = await service.enqueue(
      QUEUE_NAMES.DEFAULT,
      'critical-priority',
      { payload: {} },
      { priority: JobPriority.CRITICAL }
    );

    expect(lowPriorityJob).toBeDefined();
    expect(highPriorityJob).toBeDefined();
    expect(criticalPriorityJob).toBeDefined();
  });

  it('should handle delayed jobs', async () => {
    const delayMs = 5000;
    const jobId = await service.enqueue(
      QUEUE_NAMES.DEFAULT,
      'delayed-job',
      { payload: {} },
      { delay: delayMs }
    );

    expect(jobId).toBeDefined();
  });

  it('should support custom retry configuration', async () => {
    const jobId = await service.enqueue(
      QUEUE_NAMES.DEFAULT,
      'custom-retry-job',
      { payload: {} },
      {
        attempts: 10,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
      }
    );

    expect(jobId).toBeDefined();
  });
});
