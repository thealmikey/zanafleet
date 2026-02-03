import { WorkspaceCreatedEventV1 } from '@api/modules/workspace/events/workspace-created.event';
import { WorkspaceNeo4jProjection } from '@api/modules/workspace/projections/workspace-neo4j.projection';
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../event-bus.constants';
import { BaseEvent, SerializedEvent } from '../interfaces/base-event.interface';
import { EventLoggerService } from '../services/event-logger.service';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * WorkspaceSubscriber
 *
 * NATS message handler for workspace domain events.
 * Processes events and delegates to appropriate projections.
 */
@Injectable()
export class WorkspaceSubscriber {
  private readonly logger = new Logger(WorkspaceSubscriber.name);

  constructor(
    private readonly projection: WorkspaceNeo4jProjection,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService
  ) {}

  @MessagePattern(NatsSubjects.Workspace.ALL)
  async handleWorkspaceEvent(
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
      if (data.eventType === 'WorkspaceCreatedEvent-V1') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        const event: WorkspaceCreatedEventV1 = WorkspaceCreatedEventV1.fromJSON(
          data as unknown as Record<string, unknown>
        );
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'WorkspaceNeo4jProjection');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }
}
