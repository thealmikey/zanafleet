import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessagingModule } from '../../core/messaging/messaging.module';
import { NotificationEntity } from './entities/notification.entity';
import { SendNotificationCommandHandler } from './handlers/send-notification.handler';

/**
 * CommunicationModule
 * Provides notification and messaging capabilities for the application
 * Integrates with MessagingService for multi-channel message delivery
 */
@Module({
  imports: [
    CqrsModule,
    MessagingModule,
    TypeOrmModule.forFeature([NotificationEntity]),
  ],
  providers: [SendNotificationCommandHandler],
  exports: [],
})
export class CommunicationModule {}
