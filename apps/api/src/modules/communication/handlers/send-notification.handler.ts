import { Injectable, Logger } from '@nestjs/common';
import { ICommandHandler, CommandHandler, EventBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import { MessagingService } from '../../../core/messaging/services/messaging.service';
import { SendNotificationCommand } from '../commands/send-notification.command';
import { NotificationEntity } from '../entities/notification.entity';
import { NotificationStatus } from '../dto/notification.enums';
import { NotificationSentEventV1 } from '../events/notification-sent.event';
import { NotificationFailedEventV1 } from '../events/notification-failed.event';
import { NotificationSkippedEventV1 } from '../events/notification-skipped.event';
import { PreferenceService } from '../services/preference.service';

/**
 * SendNotificationCommandHandler
 * Handles the SendNotificationCommand by rendering templates and dispatching
 * notifications through the appropriate channel via MessagingService
 */
@Injectable()
@CommandHandler(SendNotificationCommand)
export class SendNotificationCommandHandler implements ICommandHandler<SendNotificationCommand> {
  private readonly logger = new Logger(SendNotificationCommandHandler.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
    private readonly messagingService: MessagingService,
    private readonly eventBus: EventBus,
    private readonly preferenceService: PreferenceService,
  ) {}

  async execute(command: SendNotificationCommand): Promise<{ notificationId: string }> {
    const notificationId = uuidv4();
    const eventId = uuidv4();

    this.logger.log(
      `Processing notification command for recipient ${command.recipientId} via ${command.channel}`,
    );

    // Check if notifications are enabled for this recipient and channel
    const isEnabled = await this.preferenceService.isEnabled(
      command.recipientId,
      command.recipientType,
      command.channel,
      command.workspaceId,
    );

    if (!isEnabled) {
      const skippedEvent = new NotificationSkippedEventV1({
        eventId,
        notificationId,
        recipientId: command.recipientId,
        recipientType: command.recipientType,
        channel: command.channel,
        templateId: command.templateId,
        reason: 'PREFERENCE_DISABLED',
        workspaceId: command.workspaceId,
        correlationId: command.correlationId,
        causationId: command.causationId,
      });

      this.eventBus.publish(skippedEvent);
      this.logger.log(
        `Notification ${notificationId} skipped for recipient ${command.recipientId}: preferences disabled`,
      );

      return { notificationId };
    }

    try {
      const notification = this.notificationRepository.create({
        id: notificationId,
        channel: command.channel,
        recipientId: command.recipientId,
        recipientType: command.recipientType,
        status: NotificationStatus.PENDING,
        templateId: command.templateId,
        renderedSubject: this.renderTemplate('Welcome', command.variables),
        renderedBody: this.renderTemplate('Welcome to ZanaFleet', command.variables),
        workspaceId: command.workspaceId,
        correlationId: command.correlationId,
        causationId: command.causationId,
        attempts: 1,
      });

      const sendResult = await this.messagingService.send({
        channel: command.channel,
        recipient: command.recipientId,
        subject: notification.renderedSubject || '',
        body: notification.renderedBody,
        metadata: {
          notificationId,
          templateId: command.templateId,
          recipientType: command.recipientType,
        },
      });

      if (sendResult.success && sendResult.messageId) {
        notification.status = NotificationStatus.SENT;
        notification.sentAt = new Date();

        await this.notificationRepository.save(notification);

        const sentEvent = new NotificationSentEventV1({
          eventId,
          notificationId,
          recipientId: command.recipientId,
          recipientType: command.recipientType,
          channel: command.channel,
          templateId: command.templateId,
          messageId: sendResult.messageId,
          workspaceId: command.workspaceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        });

        this.eventBus.publish(sentEvent);
        this.logger.log(
          `Notification ${notificationId} sent successfully via ${command.channel}`,
        );
      } else {
        notification.status = NotificationStatus.FAILED;
        notification.failedAt = new Date();
        notification.error = sendResult.error || 'Unknown error';

        await this.notificationRepository.save(notification);

        const failedEvent = new NotificationFailedEventV1({
          eventId,
          notificationId,
          recipientId: command.recipientId,
          recipientType: command.recipientType,
          channel: command.channel,
          templateId: command.templateId,
          error: sendResult.error || 'Unknown error',
          attempts: notification.attempts,
          workspaceId: command.workspaceId,
          correlationId: command.correlationId,
          causationId: command.causationId,
        });

        this.eventBus.publish(failedEvent);
        this.logger.error(
          `Notification ${notificationId} failed: ${sendResult.error}`,
        );
      }

      return { notificationId };
    } catch (error) {
      this.logger.error(`Error processing notification command: ${error}`, error);

      const failedEvent = new NotificationFailedEventV1({
        eventId,
        notificationId,
        recipientId: command.recipientId,
        recipientType: command.recipientType,
        channel: command.channel,
        templateId: command.templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts: 1,
        workspaceId: command.workspaceId,
        correlationId: command.correlationId,
        causationId: command.causationId,
      });

      this.eventBus.publish(failedEvent);
      throw error;
    }
  }

  private renderTemplate(
    template: string,
    variables: Record<string, unknown>,
  ): string {
    let rendered = template;
    Object.entries(variables).forEach(([key, value]) => {
      rendered = rendered.replace(`{{${key}}}`, String(value));
    });
    return rendered;
  }
}
