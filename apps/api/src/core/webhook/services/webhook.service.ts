import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { FindOptionsWhere, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { MetricsService } from '../../metrics/metrics.service';
import {
  CreateSubscriptionDto,
  DeliveryLogResponseDto,
  ListQueryDto,
  SubscriptionResponseDto,
  WebhookEventDto,
} from '../dto/webhook.dto';
import { WebhookDeliveryLog, WebhookDeliveryStatus } from '../entities/webhook-delivery-log.entity';
import { WebhookSubscription } from '../entities/webhook-subscription.entity';
import { WebhookRetryService } from './webhook-retry.service';
import { WebhookSignatureService } from './webhook-signature.service';

/**
 * WebhookService
 *
 * Core service for managing webhook subscriptions and dispatching events.
 * Implements TenantScopedRepository pattern for workspace isolation.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

  constructor(
    @InjectRepository(WebhookSubscription)
    private readonly subscriptionRepository: Repository<WebhookSubscription>,
    @InjectRepository(WebhookDeliveryLog)
    private readonly deliveryLogRepository: Repository<WebhookDeliveryLog>,
    private readonly signatureService: WebhookSignatureService,
    private readonly retryService: WebhookRetryService,
    private readonly metricsService: MetricsService
  ) {}

  /**
   * Create a new webhook subscription
   * @param workspaceId - The workspace ID
   * @param dto - Subscription creation data
   * @returns Created subscription
   */
  async subscribe(
    workspaceId: string,
    dto: CreateSubscriptionDto
  ): Promise<SubscriptionResponseDto> {
    // Generate a secret for HMAC signing
    const secret = crypto.randomBytes(32).toString('hex');

    const subscription = this.subscriptionRepository.create({
      id: uuidv4(),
      workspaceId,
      url: dto.url,
      events: dto.events,
      secret,
      name: dto.name,
      description: dto.description,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.subscriptionRepository.save(subscription);
    this.logger.log(`Created webhook subscription ${saved.id} for workspace ${workspaceId}`);

    return SubscriptionResponseDto.fromEntity(saved);
  }

  /**
   * Unsubscribe (delete) a webhook subscription
   * @param workspaceId - The workspace ID
   * @param subscriptionId - The subscription ID to delete
   */
  async unsubscribe(workspaceId: string, subscriptionId: string): Promise<void> {
    const result = await this.subscriptionRepository.delete({
      id: subscriptionId,
      workspaceId,
    });

    if (result.affected === 0) {
      throw new NotFoundException(
        `Subscription ${subscriptionId} not found in workspace ${workspaceId}`
      );
    }

    this.logger.log(`Deleted webhook subscription ${subscriptionId} from workspace ${workspaceId}`);
  }

  /**
   * List webhook subscriptions for a workspace
   * @param workspaceId - The workspace ID
   * @param query - Query parameters for pagination
   * @returns Array of subscriptions
   */
  async listByWorkspace(
    workspaceId: string,
    query: ListQueryDto
  ): Promise<{
    data: Omit<SubscriptionResponseDto, 'secret'>[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await this.subscriptionRepository.findAndCount({
      where: { workspaceId } as FindOptionsWhere<WebhookSubscription>,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: subscriptions.map((s) => SubscriptionResponseDto.fromEntityWithoutSecret(s)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single subscription by ID
   * @param workspaceId - The workspace ID
   * @param subscriptionId - The subscription ID
   * @returns Subscription details
   */
  async getSubscription(
    workspaceId: string,
    subscriptionId: string
  ): Promise<Omit<SubscriptionResponseDto, 'secret'>> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId, workspaceId } as FindOptionsWhere<WebhookSubscription>,
    });

    if (!subscription) {
      throw new NotFoundException(
        `Subscription ${subscriptionId} not found in workspace ${workspaceId}`
      );
    }

    return SubscriptionResponseDto.fromEntityWithoutSecret(subscription);
  }

  /**
   * Find all active subscriptions matching an event type
   * @param eventType - The event type to match
   * @param workspaceId - Optional workspace ID for filtering
   * @returns Array of matching subscriptions
   */
  async findSubscriptionsForEvent(
    eventType: string,
    workspaceId?: string
  ): Promise<WebhookSubscription[]> {
    const whereConditions: FindOptionsWhere<WebhookSubscription> = {
      isActive: true,
    };

    if (workspaceId) {
      whereConditions.workspaceId = workspaceId;
    }

    const subscriptions = await this.subscriptionRepository.find({
      where: whereConditions,
    });

    // Filter by event type (check if event type is in the subscription's events array)
    return subscriptions.filter((sub) => {
      // Check for exact match or wildcard
      return (
        sub.events.includes(eventType) ||
        sub.events.includes('*') ||
        sub.events.some((e) => {
          // Support wildcards like "payment.events.*" or "*.created"
          if (e.includes('*')) {
            const pattern = e.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(eventType);
          }
          return false;
        })
      );
    });
  }

  /**
   * Dispatch an event to all matching subscriptions
   * @param event - The event to dispatch
   */
  async dispatchEvent(event: WebhookEventDto): Promise<void> {
    const subscriptions = await this.findSubscriptionsForEvent(event.eventType, event.workspaceId);

    if (subscriptions.length === 0) {
      this.logger.debug(`No subscriptions found for event ${event.eventType}`);
      return;
    }

    this.logger.log(
      `Dispatching event ${event.eventType} to ${subscriptions.length} subscriptions`
    );

    const payload = {
      eventId: event.eventId ?? uuidv4(),
      eventType: event.eventType,
      occurredAt: event.occurredAt ?? new Date(),
      workspaceId: event.workspaceId,
      data: event.payload,
    };

    // Dispatch to each subscription concurrently
    await Promise.allSettled(
      subscriptions.map((sub) => this.dispatchToSubscription(sub, event.eventType, payload))
    );
  }

  /**
   * Dispatch an event to a specific subscription
   * @param subscription - The subscription to dispatch to
   * @param eventType - The event type
   * @param payload - The payload to send
   */
  async dispatchToSubscription(
    subscription: WebhookSubscription,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<void> {
    // Create delivery log entry
    const deliveryLog = this.deliveryLogRepository.create({
      id: uuidv4(),
      subscriptionId: subscription.id,
      workspaceId: subscription.workspaceId,
      eventType,
      payload,
      attemptNumber: 1,
      status: WebhookDeliveryStatus.PENDING,
    });

    await this.deliveryLogRepository.save(deliveryLog);

    try {
      const result = await this.executeHttpRequest(subscription.url, payload, subscription.secret);

      // Update delivery log with success
      await this.retryService.markAsSuccess(deliveryLog.id, result.status, result.body);

      this.logger.log(`Successfully delivered ${eventType} to subscription ${subscription.id}`);

      // Record metrics
      this.metricsService.incrementEventsPublished(eventType, 'webhook');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check if we should retry
      const shouldRetry = this.shouldRetry(error);

      if (shouldRetry) {
        await this.retryService.scheduleRetry(deliveryLog.id);
        this.logger.warn(`Scheduled retry for failed delivery ${deliveryLog.id}: ${errorMessage}`);
      } else {
        await this.retryService.markAsFailed(deliveryLog.id, errorMessage);
        this.logger.error(
          `Failed to deliver ${eventType} to subscription ${subscription.id}: ${errorMessage}`
        );

        // Record metrics for failed delivery
        this.metricsService.incrementEventsPublishedFailed(eventType, 'webhook');
      }
    }
  }

  /**
   * Execute HTTP request to webhook endpoint
   */
  private async executeHttpRequest(
    url: string,
    payload: Record<string, unknown>,
    secret: string
  ): Promise<{ status: number; body: string }> {
    const headers = this.signatureService.generateHeaders(payload, secret);
    const payloadString = JSON.stringify(payload);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      const body = await response.text();
      clearTimeout(timeoutId);

      return {
        status: response.status,
        body: body.substring(0, 10000), // Limit stored response body
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      // Retry on network errors, timeouts
      const retryableErrors = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ENETUNREACH',
        'fetch failed',
        'abort',
      ];

      return retryableErrors.some((err) => error.message.toLowerCase().includes(err.toLowerCase()));
    }
    return false;
  }

  /**
   * List delivery logs for a workspace
   * @param workspaceId - The workspace ID
   * @param query - Query parameters
   * @returns Array of delivery logs
   */
  async listDeliveries(
    workspaceId: string,
    query: ListQueryDto
  ): Promise<{ data: DeliveryLogResponseDto[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const whereConditions: FindOptionsWhere<WebhookDeliveryLog> = {
      workspaceId,
    };

    if (query.status) {
      whereConditions.status = query.status as WebhookDeliveryStatus;
    }

    if (query.eventType) {
      whereConditions.eventType = query.eventType;
    }

    if (query.subscriptionId) {
      whereConditions.subscriptionId = query.subscriptionId;
    }

    const [logs, total] = await this.deliveryLogRepository.findAndCount({
      where: whereConditions,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: logs.map((log) => DeliveryLogResponseDto.fromEntity(log)),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single delivery log by ID
   * @param workspaceId - The workspace ID
   * @param deliveryId - The delivery log ID
   * @returns Delivery log details
   */
  async getDelivery(workspaceId: string, deliveryId: string): Promise<DeliveryLogResponseDto> {
    const log = await this.deliveryLogRepository.findOne({
      where: { id: deliveryId, workspaceId } as FindOptionsWhere<WebhookDeliveryLog>,
    });

    if (!log) {
      throw new NotFoundException(`Delivery ${deliveryId} not found in workspace ${workspaceId}`);
    }

    return DeliveryLogResponseDto.fromEntity(log);
  }

  /**
   * Retry a failed delivery
   * @param workspaceId - The workspace ID
   * @param deliveryId - The delivery log ID
   */
  async retryDelivery(workspaceId: string, deliveryId: string): Promise<void> {
    const log = await this.deliveryLogRepository.findOne({
      where: { id: deliveryId, workspaceId } as FindOptionsWhere<WebhookDeliveryLog>,
    });

    if (!log) {
      throw new NotFoundException(`Delivery ${deliveryId} not found in workspace ${workspaceId}`);
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: { id: log.subscriptionId } as FindOptionsWhere<WebhookSubscription>,
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription ${log.subscriptionId} not found`);
    }

    // Reset for retry
    await this.deliveryLogRepository.update(deliveryId, {
      attemptNumber: 1,
      status: WebhookDeliveryStatus.PENDING,
      responseStatus: null,
      responseBody: null,
      errorMessage: null,
    });

    // Dispatch again
    await this.dispatchToSubscription(subscription, log.eventType, log.payload);
  }
}
