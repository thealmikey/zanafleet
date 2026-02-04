import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, MessagePattern, NatsContext, Payload } from '@nestjs/microservices';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { BaseEvent, SerializedEvent } from '../../../core/event-bus/interfaces/base-event.interface';
import { EventLoggerService } from '../../../core/event-bus/services/event-logger.service';
import { IdempotencyService } from '../../../core/event-bus/services/idempotency.service';
import { ActorOnboardedEventV1 } from '../../actor/events/actor-onboarded.event';
import { SignUpFinalizedEventV1 } from '../../signup/events/signup-finalized.event';
import { SendNotificationCommand } from '../commands/send-notification.command';
import { NotificationChannel, RecipientType } from '../dto/notification.enums';
import { MessageBuilderService } from '../services/message-builder.service';

/**
 * CommunicationSubscriber
 * Listens to domain events (ActorOnboarded, SignUpFinalized) and triggers
 * notification commands through the command bus
 */
@Injectable()
export class CommunicationSubscriber {
  private readonly logger = new Logger(CommunicationSubscriber.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly idempotencyService: IdempotencyService,
    private readonly eventLogger: EventLoggerService,
    private readonly messageBuilder: MessageBuilderService,
  ) {}

  /**
   * Handles Actor events and dispatches notifications
   */
  @MessagePattern(NatsSubjects.Actor.ALL)
  async handleActorEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
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
        const jsonData = {
          ...data,
          ...data.payload,
        };
        const event = ActorOnboardedEventV1.fromJSON(
          jsonData as unknown as Parameters<typeof ActorOnboardedEventV1.fromJSON>[0],
        );

        const command = new SendNotificationCommand(
          event.actorId,
          RecipientType.ACTOR,
          NotificationChannel.EMAIL,
          'welcome',
          { username: event.username, email: event.email },
          event.workspaceId ?? '',
          event.correlationId,
          event.eventId,
        );

        await this.commandBus.execute(command);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'CommunicationSubscriber');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }

  /**
   * Handles SignUp events and dispatches notifications
   */
  @MessagePattern(NatsSubjects.SignUp.ALL)
  async handleSignUpEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
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
      if (data.eventType === 'SignUpFinalizedEvent-V1') {
        const jsonData = {
          ...data,
          ...data.payload,
        };
        const event = SignUpFinalizedEventV1.fromJSON(
          jsonData as unknown as Parameters<typeof SignUpFinalizedEventV1.fromJSON>[0],
        );

        const command = new SendNotificationCommand(
          event.actorId,
          RecipientType.ACTOR,
          NotificationChannel.EMAIL,
          'signup-confirmation',
          { sessionId: event.sessionId, workspaceId: event.workspaceId },
          event.workspaceId,
          event.correlationId,
          event.eventId,
        );

        await this.commandBus.execute(command);
        this.eventLogger.logProcessed(event as unknown as BaseEvent, 'CommunicationSubscriber');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }

  /**
   * Handles Order events and dispatches notifications
   */
  @MessagePattern(NatsSubjects.Order.ALL)
  async handleOrderEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
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
      if (data.eventType === 'Order.Order.CreatedV1') {
        const payload = data.payload as {
          businessId?: string;
          itemSummary?: string | null;
          scheduledTime?: string | Date | null;
          workspaceId?: string;
        };

        const businessId = payload.businessId;
        if (!businessId) {
          this.eventLogger.logSkipped(data as unknown as BaseEvent, 'missing businessId');
          return;
        }

        const message = this.messageBuilder.buildDeliveryMessage({
          order: { itemSummary: payload.itemSummary ?? null },
          delivery: { scheduledDropoffTime: payload.scheduledTime ?? null },
        });

        const workspaceId = (payload.workspaceId as string | undefined) ?? '';

        const command = new SendNotificationCommand(
          businessId,
          RecipientType.BUSINESS,
          NotificationChannel.SMS,
          'delivery-update',
          { message },
          workspaceId,
          data.correlationId,
          data.eventId,
        );

        await this.commandBus.execute(command);
        this.eventLogger.logProcessed(data as unknown as BaseEvent, 'CommunicationSubscriber');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }

  /**
   * Handles Delivery events and dispatches notifications
   */
  @MessagePattern(NatsSubjects.Delivery.ALL)
  async handleDeliveryEvent(
    @Payload() data: SerializedEvent,
    @Ctx() context: NatsContext,
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
      const supportedTypes = new Set<string>([
        'Delivery.Delivery.ScheduledV1',
        'Delivery.Delivery.AssignedV1',
        'Delivery.Delivery.PickedUpV1',
        'Delivery.Delivery.DeliveredV1',
      ]);

      if (supportedTypes.has(data.eventType)) {
        const payload = data.payload as {
          businessId?: string;
          itemSummary?: string | null;
          scheduledDropoffTime?: string | Date | null;
          workspaceId?: string;
        };

        const businessId = payload.businessId;
        if (!businessId) {
          this.eventLogger.logSkipped(data as unknown as BaseEvent, 'missing businessId');
          return;
        }

        const message = this.messageBuilder.buildDeliveryMessage({
          order: { itemSummary: payload.itemSummary ?? null },
          delivery: { scheduledDropoffTime: payload.scheduledDropoffTime ?? null },
        });

        const workspaceId = (payload.workspaceId as string | undefined) ?? '';

        const command = new SendNotificationCommand(
          businessId,
          RecipientType.BUSINESS,
          NotificationChannel.SMS,
          'delivery-update',
          { message },
          workspaceId,
          data.correlationId,
          data.eventId,
        );

        await this.commandBus.execute(command);
        this.eventLogger.logProcessed(data as unknown as BaseEvent, 'CommunicationSubscriber');
      }
    } catch (error) {
      this.idempotencyService.remove(data.eventId);
      this.eventLogger.logFailed(data as unknown as BaseEvent, error as Error);
      throw error;
    }
  }
}
