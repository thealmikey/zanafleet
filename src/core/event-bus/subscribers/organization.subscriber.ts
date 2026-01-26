import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { OrganizationNeo4jProjection } from '../../../modules/organization/projections/organization-neo4j.projection';
import { OrganizationCreatedEventV1 } from '../../../modules/organization/events/organization-created.event';
import { IdempotencyService } from '../services/idempotency.service';
import { EventLoggerService } from '../services/event-logger.service';
import { NatsSubjects } from '../event-bus.constants';
import { SerializedEvent } from '../interfaces/base-event.interface';

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
    this.logger.debug(`Received event on subject: ${subject}`);

    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as OrganizationCreatedEventV1, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as OrganizationCreatedEventV1, subject);

    try {
      if (data.eventType === 'OrganizationCreatedEvent-V1') {
        const event = OrganizationCreatedEventV1.fromJSON(data);
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event, OrganizationNeo4jProjection.name);
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as OrganizationCreatedEventV1, error as Error);
      throw error;
    }
  }
}
