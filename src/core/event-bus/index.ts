/**
 * Event Bus Module Public API
 *
 * Re-exports all public components of the event bus infrastructure.
 */

export { EventBusModule, EventBusModuleOptions } from './event-bus.module';
export { EventBusService, PublishOptions } from './event-bus.service';
export {
  NATS_CLIENT,
  DEFAULT_NATS_URL,
  NatsSubjects,
  ALL_EVENTS_SUBJECT,
  RetryDefaults,
  IdempotencyDefaults,
  buildSubjectFromEventType,
} from './event-bus.constants';
export {
  BaseEvent,
  SerializedEvent,
  isBaseEvent,
} from './interfaces/base-event.interface';
export { IdempotencyService } from './services/idempotency.service';
export { RetryService, RetryOptions, RetryResult } from './services/retry.service';
export {
  EventLoggerService,
  EventLogEntry,
} from './services/event-logger.service';
export {
  Idempotent,
  IdempotentHandler,
  withIdempotency,
  IDEMPOTENT_KEY,
} from './decorators/idempotent.decorator';
export * from './subscribers';
