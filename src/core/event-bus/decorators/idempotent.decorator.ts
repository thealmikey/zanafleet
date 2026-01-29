import { SetMetadata } from '@nestjs/common';

import { BaseEvent } from '../interfaces/base-event.interface';
import { EventLoggerService } from '../services/event-logger.service';
import { IdempotencyService } from '../services/idempotency.service';

/**
 * Metadata key for idempotent decorator
 */
export const IDEMPOTENT_KEY = 'isIdempotent';

/**
 * Decorator to mark an event handler as idempotent.
 * Used in conjunction with IdempotentInterceptor.
 */
export const Idempotent = (): ClassDecorator & MethodDecorator =>
  SetMetadata(IDEMPOTENT_KEY, true);

/**
 * Creates a wrapper function that provides idempotency checking for event handlers.
 * This is a functional approach that can be used when decorators are not suitable.
 *
 * @param handler - The event handler function
 * @param idempotencyService - The idempotency service instance
 * @param eventLogger - Optional event logger for audit trail
 * @returns A wrapped handler that checks for duplicates
 */
export function withIdempotency<T extends BaseEvent>(
  handler: (event: T) => Promise<void>,
  idempotencyService: IdempotencyService,
  eventLogger?: EventLoggerService,
): (event: T) => Promise<void> {
  return async (event: T): Promise<void> => {
    if (idempotencyService.isProcessed(event.eventId)) {
      eventLogger?.logSkipped(event, 'duplicate');
      return;
    }

    idempotencyService.markAsProcessed(event.eventId);

    try {
      await handler(event);
    } catch (error) {
      idempotencyService.remove(event.eventId);
      throw error;
    }
  };
}

/**
 * Creates a class method decorator for idempotent event handling.
 * Automatically checks for duplicate events and skips processing.
 *
 * Usage:
 * ```typescript
 * @EventHandler(MyEvent)
 * class MyEventHandler {
 *   constructor(
 *     private idempotencyService: IdempotencyService,
 *     private eventLogger: EventLoggerService,
 *   ) {}
 *
 *   @IdempotentHandler('idempotencyService', 'eventLogger')
 *   async handle(event: MyEvent): Promise<void> {
 *     // Handler logic
 *   }
 * }
 * ```
 */
type AsyncEventHandler = (event: BaseEvent, ...args: unknown[]) => Promise<void>;

export function IdempotentHandler(
  idempotencyServiceKey = 'idempotencyService',
  eventLoggerKey?: string,
): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as AsyncEventHandler;

    descriptor.value = async function (
      this: Record<string, unknown>,
      event: BaseEvent,
      ...args: unknown[]
    ): Promise<void> {
      const idempotencyService = this[idempotencyServiceKey] as IdempotencyService;
      const eventLogger = eventLoggerKey
        ? (this[eventLoggerKey] as EventLoggerService)
        : undefined;

      if (!idempotencyService) {
        throw new Error(
          `IdempotencyService not found on '${idempotencyServiceKey}'. ` +
            'Ensure it is injected into the handler class.',
        );
      }

      if (idempotencyService.isProcessed(event.eventId)) {
        eventLogger?.logSkipped(event, 'duplicate');
        return;
      }

      idempotencyService.markAsProcessed(event.eventId);

      try {
        await originalMethod.call(this, event, ...args);
      } catch (error) {
        idempotencyService.remove(event.eventId);
        throw error;
      }
    };

    return descriptor;
  };
}
