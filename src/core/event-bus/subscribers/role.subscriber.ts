import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';

import { RoleCreatedEventV1 } from '../../../modules/role/events/role-created.event';
import { RoleNeo4jProjection } from '../../../modules/role/projections/role-neo4j.projection';
import { NatsSubjects } from '../event-bus.constants';
import { SerializedEvent } from '../interfaces/base-event.interface';
import { EventLoggerService } from '../services/event-logger.service';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * RoleSubscriber
 *
 * NATS message handler for role domain events.
 * Processes events and delegates to appropriate projections.
 */
@Injectable()
export class RoleSubscriber {
  private readonly logger = new Logger(RoleSubscriber.name);

  constructor(
    private readonly projection: RoleNeo4jProjection,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService,
  ) {}

  @MessagePattern(NatsSubjects.Role.ALL)
  async handleRoleEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received event on subject: ${subject}`);

    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as RoleCreatedEventV1, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as RoleCreatedEventV1, subject);

    try {
      if (data.eventType === 'RoleCreatedEvent-V1') {
        const eventData = {
          eventId: data.eventId,
          roleId: (data.payload ).roleId as string,
          name: (data.payload ).name as string,
          permissions: (data.payload ).permissions as string[],
          scope: (data.payload ).scope as string,
          createdAt: data.payload.createdAt as string,
          occurredAt: data.occurredAt,
          correlationId: data.correlationId,
          causationId: data.causationId,
        };
        const event = RoleCreatedEventV1.fromJSON(eventData as Parameters<typeof RoleCreatedEventV1.fromJSON>[0]);
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event, RoleNeo4jProjection.name);
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as RoleCreatedEventV1, error as Error);
      throw error;
    }
  }
}
