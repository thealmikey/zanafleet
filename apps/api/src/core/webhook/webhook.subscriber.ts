import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../event-bus/event-bus.constants';
import { BaseEvent, SerializedEvent } from '../event-bus/interfaces/base-event.interface';
import { EventLoggerService } from '../event-bus/services/event-logger.service';
import { IdempotencyService } from '../event-bus/services/idempotency.service';
import { MetricsService } from '../metrics/metrics.service';
import { WebhookService } from './services/webhook.service';
import { WebhookEventDto } from './dto/webhook.dto';

/**
 * WebhookSubscriber
 *
 * NATS message handler that listens to domain events and dispatches
 * them to registered webhook subscriptions.
 *
 * Listens to:
 * - payment.events.* - Payment events
 * - delivery.events.* - Delivery events
 * - billing.events.* - Billing events
 * - settlement.events.* - Settlement events
 */
@Injectable()
export class WebhookSubscriber {
  private readonly logger = new Logger(WebhookSubscriber.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService,
    private readonly metricsService: MetricsService
  ) {}

  /**
   * Handle all payment events
   */
  @MessagePattern(NatsSubjects.Payment.ALL)
  async handlePaymentEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext
  ): Promise<void> {
    await this.handleEvent(data, context, 'payment');
  }

  /**
   * Handle all delivery events
   */
  @MessagePattern(NatsSubjects.Delivery.ALL)
  async handleDeliveryEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext
  ): Promise<void> {
    await this.handleEvent(data, context, 'delivery');
  }

  /**
   * Handle all billing events
   */
  @MessagePattern(NatsSubjects.Billing.ALL)
  async handleBillingEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext
  ): Promise<void> {
    await this.handleEvent(data, context, 'billing');
  }

  /**
   * Handle all settlement events
   */
  @MessagePattern(NatsSubjects.Settlement.ALL)
  async handleSettlementEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext
  ): Promise<void> {
    await this.handleEvent(data, context, 'settlement');
  }

  /**
   * Central event handler for all webhook dispatches
   */
  private async handleEvent(
    data: SerializedEvent,
    context: NatsContext,
    moduleName: string
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received ${moduleName} event on subject: ${String(subject)}`);

    // Check for idempotency
    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.logger.debug(`Event ${data.eventId} already processed, skipping`);
      this.eventLogger.logSkipped(data as unknown as BaseEvent, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as BaseEvent, subject);

    const startTime = Date.now();

    try {
      // Extract workspaceId from event payload
      // Most events have workspaceId in the payload, fallback to aggregateId for workspace-level events
      const workspaceId = this.extractWorkspaceId(data);

      // Build webhook event DTO
      const webhookEvent: WebhookEventDto = {
        eventType: data.eventType,
        workspaceId,
        payload: data.payload as Record<string, unknown>,
        eventId: data.eventId,
        occurredAt: new Date(data.occurredAt),
      };

      // Dispatch to webhook subscriptions
      await this.webhookService.dispatchEvent(webhookEvent);

      const duration = (Date.now() - startTime) / 1000;
      this.logger.log(`Processed ${data.eventType} webhook dispatch in ${duration}ms`);

      // Record metrics
      this.metricsService.incrementEventsConsumed(data.eventType, 'WebhookSubscriber', 'success');
      this.metricsService.observeEventConsumeDuration(
        data.eventType,
        'WebhookSubscriber',
        duration
      );

      this.eventLogger.logProcessed(data as unknown as BaseEvent, 'WebhookSubscriber');
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error(
        `Failed to process ${data.eventType} webhook dispatch: ${err.message}`,
        err.stack
      );

      // Record metrics for failed consumption
      this.metricsService.incrementEventsConsumed(data.eventType, 'WebhookSubscriber', 'error');
      this.metricsService.observeEventConsumeDuration(
        data.eventType,
        'WebhookSubscriber',
        duration
      );

      this.eventLogger.logFailed(data as unknown as BaseEvent, err);
      throw error;
    }
  }

  /**
   * Extract workspaceId from event data
   */
  private extractWorkspaceId(data: SerializedEvent): string {
    // First try to get from payload
    if (data.payload && typeof data.payload === 'object') {
      const payload = data.payload as Record<string, unknown>;

      if (payload.workspaceId && typeof payload.workspaceId === 'string') {
        return payload.workspaceId;
      }

      // Try common alternatives
      if (payload.organizationId && typeof payload.organizationId === 'string') {
        return payload.organizationId;
      }

      if (payload.tenantId && typeof payload.tenantId === 'string') {
        return payload.tenantId;
      }
    }

    // Fallback to aggregateId if it's a workspace-level entity
    if (data.aggregateType === 'Workspace' || data.aggregateType === 'Organization') {
      return data.aggregateId;
    }

    // If we can't determine workspace, log warning but still try to process
    this.logger.warn(
      `Could not extract workspaceId from event ${data.eventId}, using aggregateId as fallback`
    );
    return data.aggregateId;
  }
}
