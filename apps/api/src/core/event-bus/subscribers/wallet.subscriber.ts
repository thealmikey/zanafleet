import { WalletCreatedEventV1 } from '@api/modules/wallet/events/wallet-created.event';
import { WalletCreditedEventV1 } from '@api/modules/wallet/events/wallet-credited.event';
import { WalletDebitedEventV1 } from '@api/modules/wallet/events/wallet-debited.event';
import { WalletNeo4jProjection } from '@api/modules/wallet/projections/wallet-neo4j.projection';
import { Injectable, Logger } from '@nestjs/common';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../event-bus.constants';
import { BaseEvent, SerializedEvent } from '../interfaces/base-event.interface';
import { EventLoggerService } from '../services/event-logger.service';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * WalletSubscriber
 *
 * NATS message handler for wallet domain events.
 * Processes events and delegates to appropriate projections.
 */
@Injectable()
export class WalletSubscriber {
  private readonly logger = new Logger(WalletSubscriber.name);

  constructor(
    private readonly projection: WalletNeo4jProjection,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService
  ) {}

  @MessagePattern(NatsSubjects.Wallet.ALL)
  async handleWalletEvent(
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
      switch (data.eventType) {
        case 'WalletCreatedEvent-V1': {
          const eventData = {
            eventId: data.eventId,
            walletId: data.payload.walletId as string,
            ownerId: data.payload.ownerId as string,
            ownerType: data.payload.ownerType as string,
            type: data.payload.type as string,
            currency: data.payload.currency as string,
            createdAt: data.payload.createdAt as string,
            occurredAt: data.occurredAt,
            correlationId: data.correlationId,
            causationId: data.causationId,
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const event: WalletCreatedEventV1 = WalletCreatedEventV1.fromJSON(
            eventData as Parameters<typeof WalletCreatedEventV1.fromJSON>[0]
          );
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          await this.projection.handle(event);
          this.eventLogger.logProcessed(event as unknown as BaseEvent, 'WalletNeo4jProjection');
          break;
        }
        case 'WalletCreditedEvent-V1': {
          const eventData = {
            eventId: data.eventId,
            walletId: data.payload.walletId as string,
            amount: data.payload.amount as number,
            newBalance: data.payload.newBalance as number,
            reference: data.payload.reference as string | undefined,
            occurredAt: data.occurredAt,
            correlationId: data.correlationId,
            causationId: data.causationId,
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const event: WalletCreditedEventV1 = WalletCreditedEventV1.fromJSON(
            eventData as Parameters<typeof WalletCreditedEventV1.fromJSON>[0]
          );
          const walletId = eventData.walletId;
          const amount = String(eventData.amount);
          this.logger.log(`Wallet credited event processed: ${walletId}, amount: ${amount}`);
          this.eventLogger.logProcessed(event as unknown as BaseEvent, 'WalletCreditedHandler');
          break;
        }
        case 'WalletDebitedEvent-V1': {
          const eventData = {
            eventId: data.eventId,
            walletId: data.payload.walletId as string,
            amount: data.payload.amount as number,
            newBalance: data.payload.newBalance as number,
            reference: data.payload.reference as string | undefined,
            occurredAt: data.occurredAt,
            correlationId: data.correlationId,
            causationId: data.causationId,
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const event: WalletDebitedEventV1 = WalletDebitedEventV1.fromJSON(
            eventData as Parameters<typeof WalletDebitedEventV1.fromJSON>[0]
          );
          const walletId = eventData.walletId;
          const amount = String(eventData.amount);
          this.logger.log(`Wallet debited event processed: ${walletId}, amount: ${amount}`);
          this.eventLogger.logProcessed(event as unknown as BaseEvent, 'WalletDebitedHandler');
          break;
        }
        default:
          this.logger.warn(`Unknown wallet event type: ${data.eventType}`);
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }
}
