import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { NATS_CLIENT, DEFAULT_NATS_URL } from './event-bus.constants';
import { EventBusService } from './event-bus.service';
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
      global: options.isGlobal ?? false,
      imports: [
        ClientsModule.register([
          {
            name: NATS_CLIENT,
            transport: Transport.NATS,
            options: {
              servers: [natsUrl],
              maxReconnectAttempts: 10,
              reconnectTimeWait: 1000,
            },
          },
        ]),
      ],
      providers: [EventBusService, IdempotencyService, RetryService, EventLoggerService],
      exports: [EventBusService, IdempotencyService, RetryService, EventLoggerService],
    };
  }

  /**
   * Registers the Event Bus module for feature modules
   * Uses the same NATS client configured in forRoot
   */
  static forFeature(): DynamicModule {
    return {
      module: EventBusModule,
      providers: [IdempotencyService, RetryService, EventLoggerService],
      exports: [IdempotencyService, RetryService, EventLoggerService],
    };
  }
}
