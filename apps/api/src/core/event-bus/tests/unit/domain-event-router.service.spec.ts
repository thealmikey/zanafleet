import { Test, TestingModule } from '@nestjs/testing';

import { EventBusService } from '../../event-bus.service';
import { BaseEvent } from '../../interfaces/base-event.interface';
import { DomainEventRouter, EventFilter } from '../../services/domain-event-router.service';
import { EventLoggerService } from '../../services/event-logger.service';
import { IdempotencyService } from '../../services/idempotency.service';

describe('DomainEventRouter', () => {
  let router: DomainEventRouter;
  let eventBusService: jest.Mocked<EventBusService>;

  const createMockEvent = (overrides: Partial<BaseEvent> = {}): BaseEvent => ({
    eventId: 'test-event-id',
    eventType: 'ActorOnboardedEvent-V1',
    eventVersion: '1.0.0',
    occurredAt: new Date('2024-01-01T00:00:00Z'),
    aggregateId: 'actor-123',
    aggregateType: 'Actor',
    ...overrides,
  });

  beforeEach(async () => {
    const mockEventBusService = {
      publishEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockIdempotencyService = {
      isProcessed: jest.fn().mockReturnValue(false),
      markAsProcessed: jest.fn(),
    };

    const mockEventLoggerService = {
      logPublish: jest.fn(),
      logReceive: jest.fn(),
      logProcessed: jest.fn(),
      logSkipped: jest.fn(),
      logFailed: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainEventRouter,
        { provide: EventBusService, useValue: mockEventBusService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
        { provide: EventLoggerService, useValue: mockEventLoggerService },
      ],
    }).compile();

    router = module.get<DomainEventRouter>(DomainEventRouter);
    eventBusService = module.get(EventBusService);
  });

  describe('normalizeEventType', () => {
    it('should normalize ActorOnboardedEvent-V1 to Actor.Actor.OnboardedV1', () => {
      const result = router.normalizeEventType('ActorOnboardedEvent-V1');
      expect(result).toBe('Actor.Actor.OnboardedV1');
    });

    it('should normalize OrganizationCreatedEvent-V1 to Organization.Organization.CreatedV1', () => {
      const result = router.normalizeEventType('OrganizationCreatedEvent-V1');
      expect(result).toBe('Organization.Organization.CreatedV1');
    });

    it('should normalize DeliveryScheduledEvent-V1 with aggregateType to Delivery.Delivery.ScheduledV1', () => {
      const result = router.normalizeEventType('DeliveryScheduledEvent-V1', 'Delivery');
      expect(result).toBe('Delivery.Delivery.ScheduledV1');
    });

    it('should preserve already normalized event types', () => {
      const result = router.normalizeEventType('Actor.Actor.OnboardedV1');
      expect(result).toBe('Actor.Actor.OnboardedV1');
    });

    it('should handle unknown format with fallback', () => {
      const result = router.normalizeEventType('UnknownEvent', 'Custom');
      expect(result).toBe('Custom.Custom.UnknownEvent');
    });
  });

  describe('createEnvelope', () => {
    it('should create envelope with all required fields', () => {
      const event = createMockEvent();
      const envelope = router.createEnvelope(event);

      expect(envelope.event).toBe(event);
      expect(envelope.normalizedType).toBe('Actor.Actor.OnboardedV1');
      expect(envelope.envelopedAt).toBeInstanceOf(Date);
      expect(envelope.correlationId).toBeDefined();
      expect(envelope.subject).toBe('actor.events.onboarded-v1');
    });

    it('should use provided correlationId from context', () => {
      const event = createMockEvent();
      const envelope = router.createEnvelope(event, { correlationId: 'custom-correlation-id' });

      expect(envelope.correlationId).toBe('custom-correlation-id');
    });

    it('should use event correlationId if no context provided', () => {
      const event = createMockEvent({ correlationId: 'event-correlation-id' });
      const envelope = router.createEnvelope(event);

      expect(envelope.correlationId).toBe('event-correlation-id');
    });

    it('should include causationId when provided', () => {
      const event = createMockEvent();
      const envelope = router.createEnvelope(event, { causationId: 'parent-event-id' });

      expect(envelope.causationId).toBe('parent-event-id');
    });

    it('should generate new correlationId when none provided', () => {
      const event = createMockEvent();
      const envelope = router.createEnvelope(event);

      expect(envelope.correlationId).toBeDefined();
      expect(typeof envelope.correlationId).toBe('string');
      expect(envelope.correlationId.length).toBeGreaterThan(0);
    });
  });

  describe('matchesFilter', () => {
    it('should match when no filter is specified', () => {
      const event = createMockEvent();
      const filter: EventFilter = {};

      expect(router.matchesFilter(event, filter)).toBe(true);
    });

    it('should match by aggregateType', () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const filter: EventFilter = { aggregateType: 'Actor' };

      expect(router.matchesFilter(event, filter)).toBe(true);
    });

    it('should not match when aggregateType differs', () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const filter: EventFilter = { aggregateType: 'Delivery' };

      expect(router.matchesFilter(event, filter)).toBe(false);
    });

    it('should match by exact eventType', () => {
      const event = createMockEvent({ eventType: 'ActorOnboardedEvent-V1' });
      const filter: EventFilter = { eventType: 'ActorOnboardedEvent-V1' };

      expect(router.matchesFilter(event, filter)).toBe(true);
    });

    it('should match by eventType wildcard pattern', () => {
      const event = createMockEvent({ eventType: 'ActorOnboardedEvent-V1' });
      const filter: EventFilter = { eventType: 'Actor*' };

      expect(router.matchesFilter(event, filter)).toBe(true);
    });

    it('should match when aggregateType is in array', () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const filter: EventFilter = { aggregateType: ['Actor', 'Delivery'] };

      expect(router.matchesFilter(event, filter)).toBe(true);
    });

    it('should match when eventType is in array', () => {
      const event = createMockEvent({ eventType: 'ActorOnboardedEvent-V1' });
      const filter: EventFilter = { eventType: ['ActorOnboardedEvent-V1', 'ActorUpdatedEvent-V1'] };

      expect(router.matchesFilter(event, filter)).toBe(true);
    });

    it('should require both aggregateType and eventType to match', () => {
      const event = createMockEvent({ aggregateType: 'Actor', eventType: 'ActorOnboardedEvent-V1' });
      const filter: EventFilter = { aggregateType: 'Actor', eventType: 'DeliveryCreatedEvent-V1' };

      expect(router.matchesFilter(event, filter)).toBe(false);
    });

    it('should not match when eventType array does not contain event type', () => {
      const event = createMockEvent({ eventType: 'ActorDeletedEvent-V1' });
      const filter: EventFilter = { eventType: ['ActorOnboardedEvent-V1', 'ActorUpdatedEvent-V1'] };

      expect(router.matchesFilter(event, filter)).toBe(false);
    });

    it('should not match when aggregateType array does not contain aggregate type', () => {
      const event = createMockEvent({ aggregateType: 'Wallet' });
      const filter: EventFilter = { aggregateType: ['Actor', 'Delivery'] };

      expect(router.matchesFilter(event, filter)).toBe(false);
    });
  });

  describe('subscribe', () => {
    it('should register a subscriber and return unsubscribe function', () => {
      const handler = jest.fn();
      const filter: EventFilter = { aggregateType: 'Actor' };

      const unsubscribe = router.subscribe(filter, handler);

      expect(router.getSubscriberCount()).toBe(1);
      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe when unsubscribe function is called', () => {
      const handler = jest.fn();
      const filter: EventFilter = { aggregateType: 'Actor' };

      const unsubscribe = router.subscribe(filter, handler);
      expect(router.getSubscriberCount()).toBe(1);

      unsubscribe();
      expect(router.getSubscriberCount()).toBe(0);
    });

    it('should support multiple subscribers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      router.subscribe({ aggregateType: 'Actor' }, handler1);
      router.subscribe({ aggregateType: 'Delivery' }, handler2);

      expect(router.getSubscriberCount()).toBe(2);
    });

    it('should allow same handler with different filters', () => {
      const handler = jest.fn();

      router.subscribe({ aggregateType: 'Actor' }, handler);
      router.subscribe({ aggregateType: 'Delivery' }, handler);

      expect(router.getSubscriberCount()).toBe(2);
    });
  });

  describe('publishAndRoute', () => {
    it('should publish event via EventBusService', async () => {
      const event = createMockEvent();

      await router.publishAndRoute(event);

      expect(eventBusService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: event.eventId,
          correlationId: expect.any(String),
        })
      );
    });

    it('should route event to matching subscribers', async () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const handler = jest.fn().mockResolvedValue(undefined);

      router.subscribe({ aggregateType: 'Actor' }, handler);
      await router.publishAndRoute(event);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ eventId: event.eventId }),
          normalizedType: 'Actor.Actor.OnboardedV1',
        })
      );
    });

    it('should not route to non-matching subscribers', async () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const handler = jest.fn().mockResolvedValue(undefined);

      router.subscribe({ aggregateType: 'Delivery' }, handler);
      await router.publishAndRoute(event);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should return the event envelope', async () => {
      const event = createMockEvent();

      const envelope = await router.publishAndRoute(event);

      expect(envelope.event).toEqual(expect.objectContaining({ eventId: event.eventId }));
      expect(envelope.normalizedType).toBe('Actor.Actor.OnboardedV1');
    });

    it('should route to multiple matching subscribers', async () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      router.subscribe({ aggregateType: 'Actor' }, handler1);
      router.subscribe({ aggregateType: 'Actor' }, handler2);
      await router.publishAndRoute(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should enrich event with correlationId from context', async () => {
      const event = createMockEvent();

      await router.publishAndRoute(event, { correlationId: 'custom-correlation' });

      expect(eventBusService.publishEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: 'custom-correlation',
        })
      );
    });
  });

  describe('routeEvent', () => {
    it('should route event to matching subscribers without publishing', async () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const handler = jest.fn().mockResolvedValue(undefined);

      router.subscribe({ aggregateType: 'Actor' }, handler);
      await router.routeEvent(event);

      expect(handler).toHaveBeenCalled();
      expect(eventBusService.publishEvent).not.toHaveBeenCalled();
    });

    it('should not call any subscriber when no match', async () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const handler = jest.fn().mockResolvedValue(undefined);

      router.subscribe({ aggregateType: 'Delivery' }, handler);
      await router.routeEvent(event);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getSubscribers', () => {
    it('should return all registered subscribers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      router.subscribe({ aggregateType: 'Actor' }, handler1);
      router.subscribe({ aggregateType: 'Delivery' }, handler2);

      const subscribers = router.getSubscribers();

      expect(subscribers).toHaveLength(2);
      expect(subscribers[0]).toHaveProperty('id');
      expect(subscribers[0]).toHaveProperty('filter');
      expect(subscribers[0]).toHaveProperty('handler');
    });

    it('should return empty array when no subscribers', () => {
      const subscribers = router.getSubscribers();

      expect(subscribers).toHaveLength(0);
    });
  });

  describe('getSubscriberCount', () => {
    it('should return 0 when no subscribers', () => {
      expect(router.getSubscriberCount()).toBe(0);
    });

    it('should return correct count after subscribing', () => {
      router.subscribe({ aggregateType: 'Actor' }, jest.fn());
      router.subscribe({ aggregateType: 'Delivery' }, jest.fn());
      router.subscribe({ aggregateType: 'Wallet' }, jest.fn());

      expect(router.getSubscriberCount()).toBe(3);
    });

    it('should return correct count after unsubscribing', () => {
      const unsub1 = router.subscribe({ aggregateType: 'Actor' }, jest.fn());
      router.subscribe({ aggregateType: 'Delivery' }, jest.fn());

      unsub1();

      expect(router.getSubscriberCount()).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should continue routing to other subscribers when one fails', async () => {
      const event = createMockEvent({ aggregateType: 'Actor' });
      const failingHandler = jest.fn().mockRejectedValue(new Error('Handler failed'));
      const successHandler = jest.fn().mockResolvedValue(undefined);

      router.subscribe({ aggregateType: 'Actor' }, failingHandler);
      router.subscribe({ aggregateType: 'Actor' }, successHandler);

      await router.publishAndRoute(event);

      expect(failingHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });
  });
});
