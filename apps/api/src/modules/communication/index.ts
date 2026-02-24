export { CommunicationModule } from './communication.module';

export { SendNotificationCommand } from './commands/send-notification.command';

export { NotificationChannel, NotificationStatus, RecipientType } from './dto/notification.enums';
export {
  SendNotificationDto,
  SendNotificationDtoSchema,
  validateSendNotificationDto,
} from './dto/send-notification.dto';

export { NotificationEntity } from './entities/notification.entity';
export { TemplateEntity } from './entities/template.entity';
export { NotificationPreferenceEntity } from './entities/preference.entity';

export { NotificationSentEventV1 } from './events/notification-sent.event';
export { NotificationFailedEventV1 } from './events/notification-failed.event';
export { NotificationSkippedEventV1 } from './events/notification-skipped.event';
export { PreferenceUpdatedEventV1 } from './events/preference-updated.event';

export { SendNotificationCommandHandler } from './handlers/send-notification.handler';
export { NotificationNeo4jProjection } from './projections/notification-neo4j.projection';
export { TemplateService, RenderedMessage, ValidationResult } from './services/template.service';
export { PreferenceService } from './services/preference.service';
