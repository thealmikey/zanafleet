import { Module, Provider } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';

import { EventBusModule } from '../../core/event-bus/event-bus.module';
import { MessagingModule } from '../../core/messaging/messaging.module';

import { NotificationsController } from './controllers/notifications.controller';
import { NotificationDispatchCoordinator } from './coordinators/notification-dispatch.coordinator';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationPreferenceEntity } from './entities/preference.entity';
import { TemplateEntity } from './entities/template.entity';
import { SendNotificationCommandHandler } from './handlers/send-notification.handler';
import { NotificationNeo4jProjection } from './projections/notification-neo4j.projection';
import { ChannelProviderRegistry } from './providers/channel-provider.interface';
import { createNoOpProviders } from './providers/noop-channel.provider';
import { MessageBuilderService } from './services/message-builder.service';
import { PreferenceService } from './services/preference.service';
import { TemplateService } from './services/template.service';
import { CommunicationSubscriber } from './subscribers/communication.subscriber';
import { NotificationSubscriber } from './subscribers/notification.subscriber';

// Check sandbox mode at module load time
const isSandBoxMode = process.env.USE_IN_MEMORY_DB === 'true';

/**
 * Creates a mock repository for sandbox mode
 */
function createMockRepository<T = unknown>(): Record<string, unknown> {
  return {
    save: async (entity: T): Promise<T> => entity,
    find: async (): Promise<T[]> => [],
    findOne: async (): Promise<T | null> => null,
    findOneBy: async (): Promise<T | null> => null,
    create: (data: Partial<T>): T => data as T,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    merge: (entity: T, ...updates: any[]): T => ({ ...entity, ...Object.assign({}, ...updates) }),
    delete: async (): Promise<{ affected: number }> => ({ affected: 1 }),
    createQueryBuilder: () => null,
    manager: { save: async (entity: T): Promise<T> => entity },
  };
}

/**
 * Creates fallback providers for TypeORM entities in sandbox mode
 */
function createTypeOrmFallbackProviders(...entities: (new () => unknown)[]): Provider[] {
  if (!isSandBoxMode) return [];
  return entities.map(entity => ({
    provide: getRepositoryToken(entity),
    useValue: createMockRepository(),
  }));
}

/**
 * Conditionally get TypeORM imports based on sandbox mode
 */
function getTypeOrmImports() {
  if (isSandBoxMode) {
    console.log('[DEBUG] CommunicationModule: Skipping TypeOrmModule.forFeature() in sandbox mode');
    return [];
  }
  return [TypeOrmModule.forFeature([NotificationEntity, TemplateEntity, NotificationPreferenceEntity])];
}

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
    EventBusModule.forFeature(),
    ...getTypeOrmImports(),
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
    ...createTypeOrmFallbackProviders(NotificationEntity, TemplateEntity, NotificationPreferenceEntity),
    {
      provide: 'NO_OP_PROVIDERS',
      useFactory: (registry: ChannelProviderRegistry) => {
        const providers = createNoOpProviders();
        providers.forEach((provider) => registry.register(provider));
        return providers;
      },
      inject: [ChannelProviderRegistry],
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
