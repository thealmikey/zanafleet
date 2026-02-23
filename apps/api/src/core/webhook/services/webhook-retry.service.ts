import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

import { RetryDefaults } from '../../event-bus/event-bus.constants';
import { JobPriority, JobQueueService, QUEUE_NAMES } from '../../job-queue';
import { WebhookDeliveryLog, WebhookDeliveryStatus } from '../entities/webhook-delivery-log.entity';

/**
 * Options for webhook retry behavior
 */
export interface WebhookRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  multiplier?: number;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * WebhookRetryService
 *
 * Handles exponential backoff retry logic for failed webhook deliveries.
 * Default configuration: max 3 retries with delays of 1s, 2s, 4s.
 */
@Injectable()
export class WebhookRetryService {
  private readonly logger = new Logger(WebhookRetryService.name);

  constructor(
    @InjectRepository(WebhookDeliveryLog)
    private readonly deliveryLogRepository: Repository<WebhookDeliveryLog>,
    private readonly jobQueueService: JobQueueService
  ) {}

  /**
   * Schedule a retry for a failed webhook delivery
   * @param deliveryLogId - The ID of the delivery log to retry
   * @param options - Retry configuration options
   */
  async scheduleRetry(deliveryLogId: string, options: WebhookRetryOptions = {}): Promise<void> {
    const maxRetries = options.maxRetries ?? RetryDefaults.MAX_RETRIES;
    const baseDelayMs = options.baseDelayMs ?? RetryDefaults.BASE_DELAY_MS;
    const multiplier = options.multiplier ?? RetryDefaults.MULTIPLIER;

    const deliveryLog = await this.deliveryLogRepository.findOne({
      where: { id: deliveryLogId },
    });

    if (!deliveryLog) {
      this.logger.error(`Delivery log not found: ${deliveryLogId}`);
      return;
    }

    const nextAttemptNumber = deliveryLog.attemptNumber + 1;

    if (nextAttemptNumber > maxRetries) {
      this.logger.warn(`Max retries (${maxRetries}) exceeded for delivery: ${deliveryLogId}`);
      await this.deliveryLogRepository.update(deliveryLogId, {
        status: WebhookDeliveryStatus.FAILED,
        nextRetryAt: null,
      });
      return;
    }

    const delayMs = this.calculateDelay(deliveryLog.attemptNumber, baseDelayMs, multiplier);

    const nextRetryAt = new Date(Date.now() + delayMs);

    await this.deliveryLogRepository.update(deliveryLogId, {
      attemptNumber: nextAttemptNumber,
      nextRetryAt,
      status: WebhookDeliveryStatus.RETRIED,
    });

    this.logger.log(
      `Scheduled retry ${nextAttemptNumber}/${maxRetries} for delivery ${deliveryLogId} in ${delayMs}ms`
    );

    // Use BullMQ for production-ready delayed job execution
    await this.jobQueueService.enqueue(
      QUEUE_NAMES.WEBHOOK,
      'webhook-retry',
      {
        payload: {
          deliveryLogId,
          attemptNumber: nextAttemptNumber,
        },
      },
      {
        delay: delayMs,
        priority: JobPriority.HIGH,
        attempts: 1, // Don't retry the retry job itself
      }
    );
  }

  /**
   * Get pending retries that need to be executed
   * @param limit - Maximum number of retries to fetch
   * @returns Array of delivery logs pending retry
   */
  async getPendingRetries(limit: number = 100): Promise<WebhookDeliveryLog[]> {
    const now = new Date();
    return this.deliveryLogRepository.find({
      where: {
        status: WebhookDeliveryStatus.RETRIED,
        nextRetryAt: LessThanOrEqual(now),
      },
      take: limit,
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Calculate the delay for a given attempt using exponential backoff
   * @param attempt - The current attempt number (0-indexed)
   * @param baseDelayMs - The base delay in milliseconds
   * @param multiplier - The exponential multiplier
   * @returns The delay in milliseconds
   */
  calculateDelay(attempt: number, baseDelayMs: number, multiplier: number): number {
    return baseDelayMs * Math.pow(multiplier, attempt);
  }

  /**
   * Returns the sequence of delays for the configured retry attempts
   * Useful for testing and documentation
   */
  getDelaySequence(
    maxRetries: number = RetryDefaults.MAX_RETRIES,
    baseDelayMs: number = RetryDefaults.BASE_DELAY_MS,
    multiplier: number = RetryDefaults.MULTIPLIER
  ): number[] {
    const delays: number[] = [];
    for (let i = 0; i < maxRetries; i++) {
      delays.push(this.calculateDelay(i, baseDelayMs, multiplier));
    }
    return delays;
  }

  /**
   * Mark a delivery as failed with error message
   * @param deliveryLogId - The ID of the delivery log
   * @param errorMessage - The error message
   */
  async markAsFailed(deliveryLogId: string, errorMessage: string): Promise<void> {
    await this.deliveryLogRepository.update(deliveryLogId, {
      status: WebhookDeliveryStatus.FAILED,
      errorMessage,
      nextRetryAt: null,
    });
  }

  /**
   * Mark a delivery as succeeded
   * @param deliveryLogId - The ID of the delivery log
   * @param responseStatus - HTTP response status code
   * @param responseBody - HTTP response body
   */
  async markAsSuccess(
    deliveryLogId: string,
    responseStatus: number,
    responseBody?: string
  ): Promise<void> {
    await this.deliveryLogRepository.update(deliveryLogId, {
      status: WebhookDeliveryStatus.SUCCESS,
      responseStatus,
      responseBody,
      deliveredAt: new Date(),
      nextRetryAt: null,
    });
  }
}
