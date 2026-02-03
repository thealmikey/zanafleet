import { ActorOnboardedEventV1 } from '@api/modules/actor/events/actor-onboarded.event';
import { ActorNeo4jProjection } from '@api/modules/actor/projections/actor-neo4j.projection';
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../event-bus.constants';
import { BaseEvent, SerializedEvent } from '../interfaces/base-event.interface';
import { EventLoggerService } from '../services/event-logger.service';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * ActorSubscriber
 *
 * NATS message handler for actor domain events.
 * Processes events and delegates to appropriate projections.
 */
@Injectable()
export class ActorSubscriber {
  private readonly logger = new Logger(ActorSubscriber.name);

  constructor(
    private readonly projection: ActorNeo4jProjection,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService
  ) {}

  @MessagePattern(NatsSubjects.Actor.ALL)
  async handleActorEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext
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
      if (data.eventType === 'ActorOnboardedEvent-V1') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const event: ActorOnboardedEventV1 = ActorOnboardedEventV1.fromJSON(
          data as unknown as Record<string, unknown>
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'ActorNeo4jProjection');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }
}
