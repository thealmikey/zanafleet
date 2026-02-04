import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { BaseEvent, SerializedEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { EventLoggerService } from '../../../core/event-bus/services/event-logger.service';
import { IdempotencyService } from '../../../core/event-bus/services/idempotency.service';
import { NotificationNeo4jProjection } from '../projections/notification-neo4j.projection';
import { NotificationSentEventV1 } from '../events/notification-sent.event';
import { NotificationFailedEventV1 } from '../events/notification-failed.event';
import { NotificationSkippedEventV1 } from '../events/notification-skipped.event';

/**
 * NotificationSubscriber
 *
 * NATS message handler for notification domain events.
 * Processes notification events and updates Neo4j graph projections.
 * Maintains real-time visibility of notification state and relationships.
 */
@Injectable()
export class NotificationSubscriber {
  private readonly logger = new Logger(NotificationSubscriber.name);

  constructor(
    private readonly projection: NotificationNeo4jProjection,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService,
  ) {}

  @MessagePattern(NatsSubjects.Notification.ALL)
  async handleNotificationEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received event on subject: ${subject}`);

    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as BaseEvent, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as BaseEvent, subject);

    try {
      if (data.eventType === 'NotificationSentEvent-V1') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const event: NotificationSentEventV1 = NotificationSentEventV1.fromJSON(
          data as unknown as Parameters<typeof NotificationSentEventV1.fromJSON>[0],
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'NotificationNeo4jProjection');
      } else if (data.eventType === 'NotificationFailedEvent-V1') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const event: NotificationFailedEventV1 = NotificationFailedEventV1.fromJSON(
          data as unknown as Parameters<typeof NotificationFailedEventV1.fromJSON>[0],
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'NotificationNeo4jProjection');
      } else if (data.eventType === 'NotificationSkippedEvent-V1') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const event: NotificationSkippedEventV1 = NotificationSkippedEventV1.fromJSON(
          data as unknown as Parameters<typeof NotificationSkippedEventV1.fromJSON>[0],
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'NotificationNeo4jProjection');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }
}
