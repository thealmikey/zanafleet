import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessagingModule } from '../../core/messaging/messaging.module';

import { NotificationsController } from './controllers/notifications.controller';
import { NotificationDispatchCoordinator } from './coordinators/notification-dispatch.coordinator';
import { NotificationChannel } from './dto/notification.enums';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationPreferenceEntity } from './entities/preference.entity';
import { TemplateEntity } from './entities/template.entity';
import { SendNotificationCommandHandler } from './handlers/send-notification.handler';
import { NotificationNeo4jProjection } from './projections/notification-neo4j.projection';
import { ChannelProviderRegistry } from './providers/channel-provider.interface';
import { NoOpChannelProvider } from './providers/noop-channel.provider';
import { MessageBuilderService } from './services/message-builder.service';
import { PreferenceService } from './services/preference.service';
import { TemplateService } from './services/template.service';
import { CommunicationSubscriber } from './subscribers/communication.subscriber';
import { NotificationSubscriber } from './subscribers/notification.subscriber';

/**
 * CommunicationModule
 * Provides notification and messaging capabilities for the application
 * Integrates with MessagingService for multi-channel message delivery
 * Subscribes to domain events to trigger notifications
 * Manages notification templates with variable interpolation and workspace branding
 * Maintains Neo4j graph projections for real-time notification visibility
 * Supports multi-channel dispatch via ChannelProvider abstraction
 */
@Module({
  imports: [
    CqrsModule,
    MessagingModule,

    TypeOrmModule.forFeature([NotificationEntity, TemplateEntity, NotificationPreferenceEntity]),
  ],
  controllers: [NotificationsController],
  providers: [
    SendNotificationCommandHandler,
    TemplateService,
    PreferenceService,
    MessageBuilderService,
    CommunicationSubscriber,
    NotificationNeo4jProjection,
    NotificationSubscriber,
    NotificationDispatchCoordinator,
    ChannelProviderRegistry,
    // No-op providers for each channel using useFactory for dependency injection
    {
      provide: 'NOOP_SMS_PROVIDER',
      useFactory: () => new NoOpChannelProvider(NotificationChannel.SMS),
    },
    {
      provide: 'NOOP_EMAIL_PROVIDER',
      useFactory: () => new NoOpChannelProvider(NotificationChannel.EMAIL),
    },
    {
      provide: 'NOOP_PUSH_PROVIDER',
      useFactory: () => new NoOpChannelProvider(NotificationChannel.PUSH),
    },
    {
      provide: 'NOOP_WHATSAPP_PROVIDER',
      useFactory: () => new NoOpChannelProvider(NotificationChannel.WHATSAPP),
    },
  ],
  exports: [
    TemplateService,
    PreferenceService,
    NotificationDispatchCoordinator,
    ChannelProviderRegistry,
  ],
})
export class CommunicationModule {}
