import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';
import { WorkspaceNeo4jProjection } from '../../../modules/workspace/projections/workspace-neo4j.projection';
import { WorkspaceCreatedEventV1 } from '../../../modules/workspace/events/workspace-created.event';
import { IdempotencyService } from '../services/idempotency.service';
import { EventLoggerService } from '../services/event-logger.service';
import { NatsSubjects } from '../event-bus.constants';
import { SerializedEvent } from '../interfaces/base-event.interface';

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
    private readonly eventLogger: EventLoggerService,
  ) {}

  @MessagePattern(NatsSubjects.Workspace.ALL)
  async handleWorkspaceEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received event on subject: ${subject}`);

    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as WorkspaceCreatedEventV1, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as WorkspaceCreatedEventV1, subject);

    try {
      if (data.eventType === 'WorkspaceCreatedEvent-V1') {
        const event = WorkspaceCreatedEventV1.fromJSON(data);
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event, WorkspaceNeo4jProjection.name);
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as WorkspaceCreatedEventV1, error as Error);
      throw error;
    }
  }
}
