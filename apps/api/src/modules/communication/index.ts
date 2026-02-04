export { CommunicationModule } from './communication.module';

export { SendNotificationCommand } from './commands/send-notification.command';

export {
  NotificationChannel,
  NotificationStatus,
  RecipientType,
} from './dto/notification.enums';
export {
  SendNotificationDto,
  SendNotificationDtoSchema,
  validateSendNotificationDto,
} from './dto/send-notification.dto';

export { NotificationEntity } from './entities/notification.entity';
export { TemplateEntity } from './entities/template.entity';

export { NotificationSentEventV1 } from './events/notification-sent.event';
export { NotificationFailedEventV1 } from './events/notification-failed.event';
export { NotificationSkippedEventV1 } from './events/notification-skipped.event';

export { SendNotificationCommandHandler } from './handlers/send-notification.handler';
export { TemplateService, RenderedMessage, ValidationResult } from './services/template.service';
