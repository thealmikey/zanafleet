/**
 * Media Insight Subscriber
 *
 * Event subscriber for handling media insight events.
 * Processes MediaInsightGeneratedV1 and MediaInsightFailedV1 events.
 *
 * @module media-insight/subscribers
 */

import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../../../../core/event-bus/event-bus.constants';
import { BaseEvent, SerializedEvent } from '../../../../core/event-bus/interfaces/base-event.interface';
import { EventLoggerService } from '../../../../core/event-bus/services/event-logger.service';
import { IdempotencyService } from '../../../../core/event-bus/services/idempotency.service';
import { MediaInsightEvents } from '../events/media-insight.events';
import { IntelligenceSnapshotService } from '../services/intelligence-snapshot.service';
import type { MediaInsight } from '../interfaces';

/**
 * MediaInsightSubscriber
 *
 * NATS message handler for media insight domain events.
 * Processes events and updates the intelligence snapshot.
 *
 * Design principles:
 * - Never throws from event handlers - logs errors instead
 * - Updates snapshots asynchronously
 * - Maintains traceability via correlation IDs
 * - Uses idempotency to prevent duplicate processing
 */
@Injectable()
export class MediaInsightSubscriber {
  private readonly logger = new Logger(MediaInsightSubscriber.name);

  constructor(
    private readonly snapshotService: IntelligenceSnapshotService,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService,
  ) {}

  /**
   * Handle all media insight events.
   *
   * Routes events to appropriate handlers based on event type.
   *
   * @param data - The serialized event data
   * @param context - The NATS context
   */
  @MessagePattern(NatsSubjects.Movers.MediaInsight.ALL)
  async handleMediaInsightEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received event on subject: ${subject}`);

    // Check idempotency
    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as BaseEvent, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as BaseEvent, subject);

    try {
      switch (data.eventType) {
        case 'Movers.MediaInsight.GeneratedV1':
          await this.handleMediaInsightGenerated(data);
          break;
        case 'Movers.MediaInsight.FailedV1':
          await this.handleMediaInsightFailed(data);
          break;
        default:
          this.logger.warn(`Unknown event type: ${data.eventType}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process event ${data.eventId}: ${errorMessage}`);
      // Never throw from event handlers - just log the error
    }
  }

  /**
   * Handle MediaInsightGeneratedV1 event.
   *
   * Updates the intelligence snapshot with the new media insight data.
   *
   * @param data - The serialized event data
   */
  private async handleMediaInsightGenerated(data: SerializedEvent): Promise<void> {
    const orderId = data.aggregateId;
    const mediaInsight = data.payload.mediaInsight as MediaInsight;

    this.logger.debug(`Processing media insight for order ${orderId}`);

    try {
      // Store the media insight in snapshot
      await this.snapshotService.updateWithMediaInsight(orderId, mediaInsight);

      this.logger.debug(`Media insight stored for order ${orderId}`);

      // Reconstruct event for logging
      const event = new MediaInsightEvents.GeneratedV1({
        eventId: data.eventId,
        aggregateId: data.aggregateId,
        payload: data.payload as MediaInsightEvents.GeneratedV1['payload'],
        correlationId: data.correlationId ?? '',
        causationId: data.causationId ?? '',
      });
      this.eventLogger.logProcessed(event as unknown as BaseEvent, 'IntelligenceSnapshotService');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process media insight for order ${orderId}: ${errorMessage}`,
      );
      // Never throw from event handlers - just log the error
    }
  }

  /**
   * Handle MediaInsightFailedV1 event.
   *
   * Logs the failure for monitoring and alerting purposes.
   * Could trigger fallback logic or retry mechanisms in the future.
   *
   * @param data - The serialized event data
   */
  private async handleMediaInsightFailed(data: SerializedEvent): Promise<void> {
    const orderId = data.aggregateId;
    const errorCode = data.payload.errorCode as string;
    const errorMessage = data.payload.errorMessage as string;

    this.logger.warn(
      `Media insight failed for order ${orderId}: ${errorCode} - ${errorMessage}`,
    );

    // Could trigger alerting, fallback logic, or retry mechanisms here
    // For now, just log the failure for monitoring purposes

    // Reconstruct event for logging
    const event = new MediaInsightEvents.FailedV1({
      eventId: data.eventId,
      aggregateId: data.aggregateId,
      payload: data.payload as MediaInsightEvents.FailedV1['payload'],
      correlationId: data.correlationId ?? '',
      causationId: data.causationId ?? '',
    });
    this.eventLogger.logProcessed(event as unknown as BaseEvent, 'MediaInsightSubscriber');
  }
}
