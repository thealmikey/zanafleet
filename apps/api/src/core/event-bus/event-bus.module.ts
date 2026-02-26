import { DynamicModule, Logger, Module } from '@nestjs/common';
import { ClientNats } from '@nestjs/microservices/client';

import { DEFAULT_NATS_URL, NATS_CLIENT } from './event-bus.constants';
import { EventBusService } from './event-bus.service';
import { DomainEventRouter } from './services/domain-event-router.service';
import { EventLoggerService } from './services/event-logger.service';
import { IdempotencyService } from './services/idempotency.service';
import { RetryService } from './services/retry.service';

/**
 * Configuration options for the Event Bus module
 */
export interface EventBusModuleOptions {
  natsUrl?: string;
  isGlobal?: boolean;
}

/**
 * Mock NATS client for sandbox mode
 */
class MockNatsClient {
  private readonly logger = new Logger('MockNatsClient');

  async connect(): Promise<void> {
    this.logger.log('Mock NATS client connected (sandbox mode)');
  }

  emit(_subject: string, _data: unknown): { pipe: () => unknown } {
    this.logger.debug(`Mock NATS emit (sandbox mode): ${_subject}`);
    return {
      pipe: () => ({ subscribe: () => ({}) }),
    };
  }

  close(): void {
    this.logger.log('Mock NATS client closed (sandbox mode)');
  }
}

/**
 * EventBusModule
 *
 * NestJS module that configures NATS transport for the event bus.
 * Provides services for publishing events with idempotency and retry logic.
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     EventBusModule.forRoot({
 *       natsUrl: process.env.NATS_URL,
 *       isGlobal: true,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class EventBusModule {
  /**
   * Configures the Event Bus module with NATS connection options
   * @param options - Module configuration options
   * @returns Dynamic module configuration
   */
  static forRoot(options: EventBusModuleOptions = {}): DynamicModule {
    const natsUrl = options.natsUrl || process.env.NATS_URL || DEFAULT_NATS_URL;

    return {
      module: EventBusModule,
      global: true,
      providers: [
        {
          provide: NATS_CLIENT,
          useFactory: () => {
            const client = new ClientNats({
              servers: [natsUrl],
              maxReconnectAttempts: 10,
              reconnectTimeWait: 1000,
            });
            return client;
          },
        },
        EventBusService,
        IdempotencyService,
        RetryService,
        EventLoggerService,
        DomainEventRouter,
      ],
      exports: [
        EventBusService,
        NATS_CLIENT,
        IdempotencyService,
        RetryService,
        EventLoggerService,
        DomainEventRouter,
      ],
    };
  }

  /**
   * Registers the Event Bus module for feature modules
   * Uses the same NATS client configured in forRoot
   */
  static forFeature(): DynamicModule {
    return {
      module: EventBusModule,
      providers: [
        EventBusService,
        IdempotencyService,
        RetryService,
        EventLoggerService,
        DomainEventRouter,
      ],
      exports: [
        EventBusService,
        NATS_CLIENT,
        IdempotencyService,
        RetryService,
        EventLoggerService,
        DomainEventRouter,
      ],
    };
  }
}
