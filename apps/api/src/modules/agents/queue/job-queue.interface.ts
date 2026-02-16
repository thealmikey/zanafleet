// =============================================================================
// Job Queue Interface - Abstraction over BullMQ/Temporal
// Supports: retry, backoff, idempotency key, correlationId, dead-letter
// =============================================================================

import { BackgroundJob } from '../types';

/**
 * Job status
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}

/**
 * Job queue options
 */
export interface JobQueueOptions {
  name: string;
  concurrency?: number;
  limiter?: {
    max: number;
    duration: number;
  };
}

/**
 * Processed job result
 */
export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Job Queue Interface
 * Abstracts over BullMQ, Temporal, or custom implementation
 */
export interface JobQueue {
  /**
   * Initialize the queue
   */
  initialize(): Promise<void>;

  /**
   * Enqueue a background job
   */
  enqueue(job: BackgroundJob): Promise<void>;

  /**
   * Process jobs with a handler
   */
  process(handler: (job: BackgroundJob) => Promise<JobResult>): void;

  /**
   * Get job status
   */
  getStatus(jobId: string): Promise<JobStatus | null>;

  /**
   * Retry a failed job
   */
  retry(jobId: string): Promise<void>;

  /**
   * Move job to dead letter
   */
  moveToDeadLetter(jobId: string, reason: string): Promise<void>;

  /**
   * Clean up completed jobs
   */
  cleanOlderThan(date: Date): Promise<number>;
}

/**
 * BullMQ-based implementation
 */
export class BullMQJobQueue implements JobQueue {
  private options: JobQueueOptions;

  constructor(options: JobQueueOptions) {
    this.options = options;
  }

  async initialize(): Promise<void> {
    // Would initialize BullMQ connection
  }

  async enqueue(_job: BackgroundJob): Promise<void> {
    // Would use BullMQ to add job to queue
    // Includes: idempotencyKey, retryPolicy, correlationId
  }

  process(_handler: (job: BackgroundJob) => Promise<JobResult>): void {
    // Would set up BullMQ worker with handler
  }

  async getStatus(_jobId: string): Promise<JobStatus | null> {
    // Would query BullMQ for job status
    return null;
  }

  async retry(_jobId: string): Promise<void> {
    // Would retry the job
  }

  async moveToDeadLetter(_jobId: string, _reason: string): Promise<void> {
    // Would move to dead letter queue
  }

  async cleanOlderThan(_date: Date): Promise<number> {
    // Would clean old completed jobs
    return 0;
  }
}
