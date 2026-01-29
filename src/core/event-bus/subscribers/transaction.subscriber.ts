import { Injectable, Logger } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, NatsContext } from '@nestjs/microservices';

import { TransactionCreatedEventV1 } from '../../../modules/transaction/events/transaction-created.event';
import { TransactionNeo4jProjection } from '../../../modules/transaction/projections/transaction-neo4j.projection';
import { NatsSubjects } from '../event-bus.constants';
import { SerializedEvent } from '../interfaces/base-event.interface';
import { EventLoggerService } from '../services/event-logger.service';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * TransactionSubscriber
 *
 * NATS message handler for transaction domain events.
 * Processes events and delegates to appropriate projections.
 */
@Injectable()
export class TransactionSubscriber {
  private readonly logger = new Logger(TransactionSubscriber.name);

  constructor(
    private readonly projection: TransactionNeo4jProjection,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService,
  ) {}

  @MessagePattern(NatsSubjects.Transaction.ALL)
  async handleTransactionEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
  ): Promise<void> {
    const subject = context.getSubject();
    this.logger.debug(`Received event on subject: ${subject}`);

    if (this.idempotencyService.isProcessed(data.eventId)) {
      this.eventLogger.logSkipped(data as unknown as TransactionCreatedEventV1, 'duplicate');
      return;
    }

    this.idempotencyService.markAsProcessed(data.eventId);
    this.eventLogger.logReceive(data as unknown as TransactionCreatedEventV1, subject);

    try {
      if (data.eventType === 'TransactionCreatedEvent-V1') {
        const eventData = {
          eventId: data.eventId,
          transactionId: (data.payload ).transactionId as string,
          sourceWalletId: (data.payload ).sourceWalletId as string,
          destinationWalletId: (data.payload ).destinationWalletId as string,
          amount: (data.payload ).amount as number,
          type: (data.payload ).type as string,
          status: (data.payload ).status as string,
          linkedEventId: (data.payload ).linkedEventId as string | null | undefined,
          occurredAt: data.occurredAt,
          correlationId: data.correlationId,
          causationId: data.causationId,
        };
        const event = TransactionCreatedEventV1.fromJSON(eventData as Parameters<typeof TransactionCreatedEventV1.fromJSON>[0]);
        await this.projection.handle(event);
        this.eventLogger.logProcessed(event, TransactionNeo4jProjection.name);
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as TransactionCreatedEventV1, error as Error);
      throw error;
    }
  }
}
