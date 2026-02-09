import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { buildSubjectFromEventType } from '../event-bus.constants';
import { EventBusService } from '../event-bus.service';
import { BaseEvent } from '../interfaces/base-event.interface';

import { EventLoggerService } from './event-logger.service';
import { IdempotencyService } from './idempotency.service';

/**
 * Event filter for matching events by aggregate type and/or event type
 */
export interface EventFilter {
  /** Filter by aggregate type (e.g., 'Actor', 'Delivery') */
  aggregateType?: string | string[];
  /** Filter by event type pattern (supports wildcards like 'Actor.*' or exact match) */
  eventType?: string | string[];
}

/**
 * Context for event correlation and causation tracking
 */
export interface EventContext {
  /** Correlation ID for tracing related events across services */
  correlationId?: string;
  /** ID of the command/event that caused this event */
  causationId?: string;
}

/**
 * Envelope wrapping a domain event with routing metadata
 */
export interface DomainEventEnvelope<T extends BaseEvent = BaseEvent> {
  /** The wrapped event */
  event: T;
  /** Normalized event type following <Module>.<Entity>.<Action>V<Number> format */
  normalizedType: string;
  /** Timestamp when the envelope was created */
  envelopedAt: Date;
  /** Correlation ID for distributed tracing */
  correlationId: string;
  /** Causation ID linking to parent event/command */
  causationId?: string;
  /** Original NATS subject for routing */
  subject: string;
}

/**
 * Subscriber callback type
 */
export type EventSubscriberCallback<T extends BaseEvent = BaseEvent> = (
  envelope: DomainEventEnvelope<T>
) => Promise<void>;

/**
 * Registered subscriber with filter and handler
 */
export interface RegisteredSubscriber {
  id: string;
  filter: EventFilter;
  handler: EventSubscriberCallback;
}

/**
 * DomainEventRouter
 *
 * Service for routing domain events to local subscribers with correlation tracking.
 * Provides event envelope creation, normalization, and local pub/sub capabilities.
 *
 * Features:
 * - Event envelope creation with correlation/causation tracking
 * - Event type normalization to standard format
 * - Local subscriber registration with filter-based matching
 * - Wildcard pattern support in event type filters
 * - Integration with EventBusService for NATS publishing
 *
 * Usage:
 * ```typescript
 * // Subscribe to events
 * const unsubscribe = router.subscribe(
 *   { aggregateType: 'Actor', eventType: 'Actor*' },
 *   async (envelope) => {
 *     console.log('Received:', envelope.normalizedType);
 *   }
 * );
 *
 * // Publish and route an event
 * await router.publishAndRoute(event, { correlationId: 'req-123' });
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */
@Injectable()
export class DomainEventRouter {
  private readonly logger = new Logger(DomainEventRouter.name);
  private readonly subscribers: Map<string, RegisteredSubscriber> = new Map();

  constructor(
    private readonly eventBusService: EventBusService,
    private readonly _idempotencyService: IdempotencyService,
    private readonly _eventLogger: EventLoggerService
  ) {}

  /**
   * Register a subscriber for events matching the filter
   * @param filter - Event filter criteria
   * @param handler - Callback to handle matching events
   * @returns Unsubscribe function
   */
  subscribe(filter: EventFilter, handler: EventSubscriberCallback): () => void {
    const subscriberId = uuidv4();
    this.subscribers.set(subscriberId, { id: subscriberId, filter, handler });
    this.logger.debug(
      `Registered subscriber ${subscriberId} with filter: ${JSON.stringify(filter)}`
    );

    return () => {
      this.subscribers.delete(subscriberId);
      this.logger.debug(`Unregistered subscriber ${subscriberId}`);
    };
  }

  /**
   * Create an event envelope with correlation/causation tracking
   * @param event - The domain event to wrap
   * @param context - Optional correlation/causation context
   * @returns Event envelope with routing metadata
   */
  createEnvelope<T extends BaseEvent>(event: T, context?: EventContext): DomainEventEnvelope<T> {
    const correlationId = context?.correlationId ?? event.correlationId ?? uuidv4();
    const causationId = context?.causationId ?? event.causationId;
    const normalizedType = this.normalizeEventType(event.eventType, event.aggregateType);
    const subject = buildSubjectFromEventType(event.eventType);

    return {
      event,
      normalizedType,
      envelopedAt: new Date(),
      correlationId,
      causationId,
      subject,
    };
  }

  /**
   * Publish an event via the event bus and route to matching subscribers
   * @param event - The domain event to publish
   * @param context - Optional correlation/causation context
   * @returns The created event envelope
   */
  async publishAndRoute<T extends BaseEvent>(
    event: T,
    context?: EventContext
  ): Promise<DomainEventEnvelope<T>> {
    const envelope = this.createEnvelope(event, context);

    const enrichedEvent = {
      ...event,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId,
    } as T;

    await this.eventBusService.publishEvent(enrichedEvent);

    await this.routeToSubscribers(envelope);

    this.logger.debug(
      `Published and routed event: ${envelope.normalizedType} (correlationId: ${envelope.correlationId})`
    );

    return envelope;
  }

  /**
   * Route an incoming event to matching local subscribers
   * Used for processing events received from NATS
   * @param event - The domain event to route
   * @param context - Optional correlation/causation context
   */
  async routeEvent<T extends BaseEvent>(event: T, context?: EventContext): Promise<void> {
    const envelope = this.createEnvelope(event, context);
    await this.routeToSubscribers(envelope);
  }

  /**
   * Normalize event type to standard format: <Module>.<Entity>.<Action>V<Number>
   * @param eventType - The event type string (e.g., 'ActorOnboardedEvent-V1')
   * @param aggregateType - Optional aggregate type for module inference
   * @returns Normalized event type (e.g., 'Actor.Actor.OnboardedV1')
   *
   * @example
   * normalizeEventType('ActorOnboardedEvent-V1') // 'Actor.Actor.OnboardedV1'
   * normalizeEventType('OrganizationCreatedEvent-V1') // 'Organization.Organization.CreatedV1'
   * normalizeEventType('DeliveryScheduledEvent-V1', 'Delivery') // 'Delivery.Delivery.ScheduledV1'
   */
  normalizeEventType(eventType: string, aggregateType?: string): string {
    const match = eventType.match(/^(\w+?)([A-Z][a-z]+(?:[A-Z][a-z]+)*)Event-V(\d+)$/);

    if (match) {
      const [, entity, action, version] = match;
      const module = aggregateType ?? entity;
      return `${module}.${entity}.${action}V${version}`;
    }

    if (eventType.includes('.')) {
      return eventType;
    }

    const module = aggregateType ?? 'Unknown';
    return `${module}.${module}.${eventType}`;
  }

  /**
   * Get all registered subscribers
   * @returns Array of registered subscribers
   */
  getSubscribers(): RegisteredSubscriber[] {
    return Array.from(this.subscribers.values());
  }

  /**
   * Get subscriber count
   * @returns Number of registered subscribers
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Check if an event matches a filter
   * @param event - The event to check
   * @param filter - The filter criteria
   * @returns True if the event matches the filter
   */
  matchesFilter(event: BaseEvent, filter: EventFilter): boolean {
    if (filter.aggregateType) {
      const aggregateTypes = Array.isArray(filter.aggregateType)
        ? filter.aggregateType
        : [filter.aggregateType];

      if (!aggregateTypes.includes(event.aggregateType)) {
        return false;
      }
    }

    if (filter.eventType) {
      const eventTypes = Array.isArray(filter.eventType)
        ? filter.eventType
        : [filter.eventType];

      const matches = eventTypes.some((pattern) => {
        if (pattern.includes('*')) {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(event.eventType);
        }
        return pattern === event.eventType;
      });

      if (!matches) {
        return false;
      }
    }

    return true;
  }

  /**
   * Route envelope to all matching subscribers
   * Executes handlers in parallel and logs failures
   */
  private async routeToSubscribers<T extends BaseEvent>(
    envelope: DomainEventEnvelope<T>
  ): Promise<void> {
    const matchingSubscribers = Array.from(this.subscribers.values()).filter((sub) =>
      this.matchesFilter(envelope.event, sub.filter)
    );

    if (matchingSubscribers.length === 0) {
      this.logger.debug(`No subscribers matched for event: ${envelope.normalizedType}`);
      return;
    }

    this.logger.debug(
      `Routing event ${envelope.normalizedType} to ${matchingSubscribers.length} subscriber(s)`
    );

    const results = await Promise.allSettled(
      matchingSubscribers.map(async (sub) => {
        try {
          await sub.handler(envelope as DomainEventEnvelope);
        } catch (error) {
          this.logger.error(
            `Subscriber ${sub.id} failed to handle event ${envelope.normalizedType}: ${(error as Error).message}`
          );
          throw error;
        }
      })
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.warn(
        `${failures.length}/${matchingSubscribers.length} subscribers failed for event ${envelope.normalizedType}`
      );
    }
  }
}
