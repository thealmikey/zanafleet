import { RoleCreatedEventV1 } from '@api/modules/role/events/role-created.event';
import { RoleNeo4jProjection } from '@api/modules/role/projections/role-neo4j.projection';
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../event-bus.constants';
import { BaseEvent, SerializedEvent } from '../interfaces/base-event.interface';
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
    private readonly eventLogger: EventLoggerService
  ) {}

  @MessagePattern(NatsSubjects.Role.ALL)
  async handleRoleEvent(
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
      if (data.eventType === 'RoleCreatedEvent-V1') {
        const eventData = {
          eventId: data.eventId,
          roleId: data.payload.roleId as string,
          name: data.payload.name as string,
          permissions: data.payload.permissions as string[],
          scope: data.payload.scope as string,
          createdAt: data.payload.createdAt as string,
          occurredAt: data.occurredAt,
          correlationId: data.correlationId,
          causationId: data.causationId,
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const event: RoleCreatedEventV1 = RoleCreatedEventV1.fromJSON(
          eventData as Parameters<typeof RoleCreatedEventV1.fromJSON>[0]
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'RoleNeo4jProjection');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }
}
