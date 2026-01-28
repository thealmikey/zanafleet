import { Injectable, Logger } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  NatsContext,
  Payload,
} from '@nestjs/microservices';

import {
  OrganizationCreatedEventV1,
  OrganizationCreatedEventV1JSON,
} from '../../../modules/organization/events/organization-created.event';
import { OrganizationNeo4jProjection } from '../../../modules/organization/projections/organization-neo4j.projection';
import { NatsSubjects } from '../event-bus.constants';
import { BaseEvent, SerializedEvent } from '../interfaces/base-event.interface';
import { EventLoggerService } from '../services/event-logger.service';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * OrganizationSubscriber
 *
 * NATS message handler for organization domain events.
 * Processes events and delegates to appropriate projections.
 */
@Injectable()
export class OrganizationSubscriber {
  private readonly logger = new Logger(OrganizationSubscriber.name);

  constructor(
    private readonly projection: OrganizationNeo4jProjection,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService,
  ) {}

  @MessagePattern(NatsSubjects.Organization.ALL)
  async handleOrganizationEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received event on subject: ${String(subject)}`);

    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as BaseEvent, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as BaseEvent, subject);

    try {
      if (data.eventType === 'OrganizationCreatedEvent-V1') {
        const event = OrganizationCreatedEventV1.fromJSON(
          data as unknown as OrganizationCreatedEventV1JSON,
        );
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event, OrganizationNeo4jProjection.name);
      }
    } catch (error: unknown) {
      this.idempotencyService.remove(data.eventId);
      const err = error instanceof Error ? error : new Error(String(error));
      this.eventLogger.logFailed(data as unknown as BaseEvent, err);
      throw error;
    }
  }
}
