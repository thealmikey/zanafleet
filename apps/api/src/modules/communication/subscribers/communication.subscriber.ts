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
}
