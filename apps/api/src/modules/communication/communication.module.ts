import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { MessagingModule } from '../../core/messaging/messaging.module';

import { NotificationEntity } from './entities/notification.entity';
import { TemplateEntity } from './entities/template.entity';
import { SendNotificationCommandHandler } from './handlers/send-notification.handler';
import { TemplateService } from './services/template.service';
import { CommunicationSubscriber } from './subscribers/communication.subscriber';

/**
 * CommunicationModule
 * Provides notification and messaging capabilities for the application
 * Integrates with MessagingService for multi-channel message delivery
 * Subscribes to domain events to trigger notifications
 * Manages notification templates with variable interpolation and workspace branding
 */
@Module({
  imports: [
    CqrsModule,
    MessagingModule,
    EventBusModule.forFeature(),
    TypeOrmModule.forFeature([NotificationEntity, TemplateEntity]),
  ],
  providers: [SendNotificationCommandHandler, TemplateService, CommunicationSubscriber],
  exports: [TemplateService],
})
export class CommunicationModule {}
