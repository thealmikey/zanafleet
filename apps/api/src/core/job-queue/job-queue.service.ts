// =============================================================================
// Job Queue Service - BullMQ Implementation
// Multi-tenant aware background job processing with retry, DLQ, and locking
// =============================================================================

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FlowJob,
  FlowProducer,
  Job,
  JobsOptions,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from 'bullmq';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

import {
  JOB_QUEUE_DEFAULTS,
  JobPriority,
  LOCK_CONFIG,
  QUEUE_NAMES,
  RATE_LIMIT_CONFIG,
} from './job-queue.constants';

/**
 * Multi-tenant job data structure
 */
export interface TenantJobData {
  workspaceId: string;
  organizationId?: string;
  actorId?: string;
  correlationId?: string;
  idempotencyKey?: string;
}

/**
 * Base job data structure
 */
export interface JobData {
  tenant?: TenantJobData;
  payload: Record<string, unknown>;
  metadata?: {
    source?: string;
    userId?: string;
    sessionId?: string;
  };
}

/**
 * Job result structure
 */
export interface JobQueueResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  attempts: number;
  durationMs?: number;
}

/**
 * Job status enumeration
 */
export const enum JobStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRY = 'retry',
  DELAYED = 'delayed',
}

/**
 * Distributed lock interface
 */
export interface DistributedLock {
  acquire(key: string, ttlMs?: number): Promise<boolean>;
  release(key: string): Promise<void>;
  renew(key: string, ttlMs?: number): Promise<boolean>;
}

/**
 * Job options for enqueueing
 */
export interface EnqueueOptions {
  priority?: JobPriority;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay?: number;
  };
  timeout?: number;
  jobId?: string;
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

/**
 * JobQueueService
 *
 * Production-ready BullMQ implementation with:
 * - Multi-tenant workspace isolation
 * - Exponential backoff retry
 * - Dead letter queue for failed jobs
 * - Distributed locking for cron jobs
 * - Flow orchestration for job chains
 */
@Injectable()
export class JobQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobQueueService.name);
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private flowProducer: FlowProducer | null = null;
  private redisConnection: Redis | null = null;
  private lock: DistributedLockHelper | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initializeConnection();
    await this.initializeDefaultQueues();
    this.lock = new DistributedLockHelper(this.redisConnection!);
    this.logger.log('JobQueueService initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
    this.logger.log('JobQueueService destroyed');
  }

  /**
   * Initialize Redis connection
   */
  private async initializeConnection(): Promise<void> {
    const connection = this.getRedisConnection();
    this.redisConnection = connection;
    await connection.ping();
    this.logger.log('Redis connection established for job queue');
  }

  /**
   * Get Redis connection instance
   */
  private getRedisConnection(): Redis {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    if (redisUrl) {
      return new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });
    }

    return new Redis({
      host,
      port,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }

  /**
   * Initialize default queues
   */
  private async initializeDefaultQueues(): Promise<void> {
    const defaultQueues = Object.values(QUEUE_NAMES) as unknown as string[];

    for (const queueName of defaultQueues) {
      await this.getOrCreateQueue(queueName);
    }

    this.flowProducer = new FlowProducer({
      connection: this.redisConnection!,
    });
  }

  /**
   * Get or create a queue
   */
  async getOrCreateQueue(name: string): Promise<Queue> {
    let queue = this.queues.get(name);

    if (!queue) {
      const queueOptions: QueueOptions = {
        connection: this.redisConnection!,
        defaultJobOptions: {
          attempts: JOB_QUEUE_DEFAULTS.MAX_RETRIES,
          backoff: {
            type: 'exponential',
            delay: JOB_QUEUE_DEFAULTS.INITIAL_BACKOFF_MS,
          },
          removeOnComplete: {
            age: JOB_QUEUE_DEFAULTS.CLEANUP_AGE_MS,
            count: 1000,
          },
          removeOnFail: {
            age: JOB_QUEUE_DEFAULTS.CLEANUP_AGE_MS,
            count: 5000,
          },
        },
      };

      queue = new Queue(name, queueOptions);
      this.queues.set(name, queue);
      this.logger.debug(`Created queue: ${name}`);
    }

    return queue;
  }

  /**
   * Enqueue a job with multi-tenant context
   */
  async enqueue<T extends JobData = JobData>(
    queueName: string,
    jobName: string,
    data: T,
    options: EnqueueOptions = {}
  ): Promise<string> {
    const queue = await this.getOrCreateQueue(queueName);
    const jobId = options.jobId || uuidv4();

    const jobOptions: JobsOptions = {
      priority: options.priority || JobPriority.NORMAL,
      delay: options.delay || 0,
      attempts: options.attempts || JOB_QUEUE_DEFAULTS.MAX_RETRIES,
      backoff: options.backoff || {
        type: 'exponential',
        delay: JOB_QUEUE_DEFAULTS.INITIAL_BACKOFF_MS,
      },
      jobId,
      removeOnComplete: options.removeOnComplete ?? {
        age: JOB_QUEUE_DEFAULTS.CLEANUP_AGE_MS,
        count: 1000,
      },
      removeOnFail: options.removeOnFail ?? {
        age: JOB_QUEUE_DEFAULTS.CLEANUP_AGE_MS,
        count: 5000,
      },
    };

    const job = await queue.add(jobName, data, jobOptions);
    this.logger.debug(`Enqueued job ${jobName} [${job.id}] to queue ${queueName}`);

    return job.id!;
  }

  /**
   * Enqueue a job with workspace isolation
   */
  async enqueueInWorkspace<T extends JobData = JobData>(
    workspaceId: string,
    queueName: string,
    jobName: string,
    payload: Record<string, unknown>,
    options: EnqueueOptions = {}
  ): Promise<string> {
    const jobData: JobData = {
      tenant: {
        workspaceId,
        idempotencyKey: options.jobId || uuidv4(),
      },
      payload,
    };

    return this.enqueue(queueName, jobName, jobData, options);
  }

  /**
   * Register a job processor
   */
  async process<T extends JobData = JobData, R = unknown>(
    queueName: string,
    processor: (job: {
      id: string;
      name: string;
      data: T;
      tenant?: TenantJobData;
    }) => Promise<JobQueueResult<R>>,
    concurrency: number = RATE_LIMIT_CONFIG.MAX_JOBS_PER_WORKER
  ): Promise<void> {
    const existingWorker = this.workers.get(queueName);
    if (existingWorker) {
      this.logger.warn(`Worker already exists for queue: ${queueName}`);
      return;
    }

    const workerOptions: WorkerOptions = {
      connection: this.redisConnection!,
      concurrency,
      limiter: {
        max: RATE_LIMIT_CONFIG.MAX_JOBS_PER_WORKER,
        duration: RATE_LIMIT_CONFIG.DURATION_MS,
      },
    };

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        const startTime = Date.now();
        const data = job.data as T;

        this.logger.debug(
          `Processing job ${job.name} [${job.id}] for workspace: ${
            data.tenant?.workspaceId || 'unknown'
          }`
        );

        try {
          const result = await processor({
            id: job.id!,
            name: job.name,
            data,
            tenant: data.tenant,
          });

          this.logger.debug(`Job ${job.name} [${job.id}] completed in ${Date.now() - startTime}ms`);

          return {
            ...result,
            attempts: job.attemptsMade,
            durationMs: Date.now() - startTime,
          };
        } catch (error) {
          this.logger.error(`Job ${job.name} [${job.id}] failed: ${(error as Error).message}`);
          throw error;
        }
      },
      workerOptions
    );

    worker.on('completed', (job: Job) => {
      this.logger.debug(`Job ${job.name} [${job.id}] completed`);
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      if (job) {
        this.logger.error(
          `Job ${job.name} [${job.id}] failed after ${job.attemptsMade} attempts: ${error.message}`
        );
      }
    });

    worker.on('error', (error: Error) => {
      this.logger.error(`Worker error: ${error.message}`);
    });

    this.workers.set(queueName, worker);
    this.logger.log(`Registered processor for queue: ${queueName}`);
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<JobStatus | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return state as JobStatus;
  }

  /**
   * Get job result
   */
  async getJobResult<R = unknown>(
    queueName: string,
    jobId: string
  ): Promise<JobQueueResult<R> | null> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const returnValue = await job.returnvalue;
    const failedReason = await job.failedReason;

    if (failedReason) {
      return {
        success: false,
        error: failedReason,
        attempts: job.attemptsMade,
      };
    }

    return {
      success: true,
      data: returnValue as R,
      attempts: job.attemptsMade,
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    await job.retry();
    this.logger.log(`Retrying job ${jobId} in queue ${queueName}`);
  }

  /**
   * Move job to dead letter queue
   */
  async moveToDeadLetter(queueName: string, jobId: string, reason?: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const dlqName = `${queueName}-dlq`;
    await this.getOrCreateQueue(dlqName);

    const dlqJob = await this.enqueue(dlqName, 'dead-letter', {
      originalQueue: queueName,
      originalJobId: jobId,
      originalJobName: job.name,
      originalData: job.data,
      reason: reason || job.failedReason || 'Unknown error',
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade,
    } as JobData & {
      originalQueue: string;
      originalJobId: string;
      originalJobName: string;
      originalData: Record<string, unknown>;
      reason: string;
      failedAt: string;
      attempts: number;
    });

    await job.remove();

    this.logger.warn(`Moved job ${jobId} to DLQ [${dlqJob}]: ${reason || job.failedReason}`);
  }

  /**
   * Clean completed jobs older than a date
   */
  async cleanCompletedJobs(queueName: string, olderThan: Date): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return 0;
    }

    const count = await queue.clean(olderThan.getTime(), 1000, 'completed');

    this.logger.debug(`Cleaned ${count.length} completed jobs from ${queueName}`);
    return count.length;
  }

  /**
   * Clean failed jobs older than a date
   */
  async cleanFailedJobs(queueName: string, olderThan: Date): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return 0;
    }

    const count = await queue.clean(olderThan.getTime(), 1000, 'failed');
    this.logger.debug(`Cleaned ${count.length} failed jobs from ${queueName}`);
    return count.length;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Create a flow (job chain)
   */
  async createFlow(flowJob: FlowJob): Promise<string[]> {
    if (!this.flowProducer) {
      throw new Error('FlowProducer not initialized');
    }

    const flow = await this.flowProducer.add(flowJob);
    const jobIds: string[] = [];

    // Extract job IDs from the flow tree
    const extractJobIds = (node: { job?: { id?: string }; children?: unknown[] }) => {
      if (node.job?.id) {
        jobIds.push(node.job.id);
      }
      if (node.children) {
        for (const child of node.children as unknown as { job?: { id?: string } }[]) {
          extractJobIds(child);
        }
      }
    };

    extractJobIds(flow as unknown as { job?: { id?: string }; children?: unknown[] });

    this.logger.debug(`Created flow with ${jobIds.length} jobs`);
    return jobIds;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      this.logger.log(`Paused queue: ${queueName}`);
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      this.logger.log(`Resumed queue: ${queueName}`);
    }
  }

  /**
   * Execute a function with distributed locking
   */
  async withLock<T>(lockName: string, fn: () => Promise<T>, ttlMs?: number): Promise<T | null> {
    if (!this.lock) {
      throw new Error('Lock not initialized');
    }

    const acquired = await this.lock.acquire(lockName, ttlMs);

    if (!acquired) {
      this.logger.warn(`Failed to acquire lock: ${lockName}`);
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.lock.release(lockName);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    for (const [, worker] of this.workers) {
      await worker.close();
    }
    this.workers.clear();

    for (const [, queue] of this.queues) {
      await queue.close();
    }
    this.queues.clear();

    if (this.flowProducer) {
      await this.flowProducer.close();
      this.flowProducer = null;
    }

    if (this.redisConnection) {
      await this.redisConnection.quit();
      this.redisConnection = null;
    }
  }
}

/**
 * Distributed lock helper class
 */
class DistributedLockHelper {
  constructor(private readonly redis: Redis) {}

  async acquire(key: string, ttlMs?: number): Promise<boolean> {
    const result = await this.redis.set(
      `lock:${key}`,
      uuidv4(),
      'EX',
      ttlMs || LOCK_CONFIG.DEFAULT_TTL_MS,
      'NX'
    );
    return result === 'OK';
  }

  async release(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }

  async renew(key: string, ttlMs?: number): Promise<boolean> {
    const result = await this.redis.expire(`lock:${key}`, ttlMs || LOCK_CONFIG.DEFAULT_TTL_MS);
    return result === 1;
  }
}
