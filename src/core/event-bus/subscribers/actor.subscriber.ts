import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { ActorNeo4jProjection } from '../../../modules/actor/projections/actor-neo4j.projection';
import { ActorOnboardedEventV1 } from '../../../modules/actor/events/actor-onboarded.event';
import { IdempotencyService } from '../services/idempotency.service';
import { EventLoggerService } from '../services/event-logger.service';
import { NatsSubjects } from '../event-bus.constants';
import { SerializedEvent } from '../interfaces/base-event.interface';

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
    private readonly eventLogger: EventLoggerService,
  ) {}

  @MessagePattern(NatsSubjects.Actor.ALL)
  async handleActorEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received event on subject: ${subject}`);

    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as ActorOnboardedEventV1, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as ActorOnboardedEventV1, subject);

    try {
      if (data.eventType === 'ActorOnboardedEvent-V1') {
        const event = ActorOnboardedEventV1.fromJSON(data as unknown as Record<string, unknown>);
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event, ActorNeo4jProjection.name);
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as ActorOnboardedEventV1, error as Error);
      throw error;
    }
  }
}
