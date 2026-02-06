import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import {
  OrganizationType,
  OrganizationStatus,
} from '../../../../modules/organization/dto/organization.enums';
import { OrganizationCreatedEventV1 } from '../../../../modules/organization/events/organization-created.event';
import { NatsSubjects, NATS_CLIENT } from '../../event-bus.constants';
import { EventBusService } from '../../event-bus.service';
import { EventLoggerService } from '../../services/event-logger.service';
import { IdempotencyService } from '../../services/idempotency.service';
import { RetryService } from '../../services/retry.service';

describe('EventBus Integration Tests', () => {
  let app: TestingModule;
  let eventBusService: EventBusService;
  let idempotencyService: IdempotencyService;
  let eventLogger: EventLoggerService;

  const mockNatsClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    emit: jest.fn().mockReturnValue(of(undefined)),
  };

  beforeEach(async () => {
    app = await Test.createTestingModule({
      providers: [
        EventBusService,
        IdempotencyService,
        EventLoggerService,
        RetryService,
        { provide: NATS_CLIENT, useValue: mockNatsClient },
      ],
    }).compile();

    eventBusService = app.get<EventBusService>(EventBusService);
    idempotencyService = app.get<IdempotencyService>(IdempotencyService);
    eventLogger = app.get<EventLoggerService>(EventLoggerService);
  });

  afterEach(() => {
    idempotencyService.clear();
    jest.clearAllMocks();
  });

  describe('Event Publishing', () => {
    it('should publish OrganizationCreatedEvent to NATS', async () => {
      const event = new OrganizationCreatedEventV1({
        eventId: uuidv4(),
        organizationId: uuidv4(),
        name: 'Test Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdAt: new Date(),
      });

      await eventBusService.publish(NatsSubjects.Organization.CREATED_V1, event);

      expect(mockNatsClient.emit).toHaveBeenCalledWith(
        NatsSubjects.Organization.CREATED_V1,
        expect.objectContaining({
          eventId: event.eventId,
          eventType: 'OrganizationCreatedEvent-V1',
        })
      );
    });

    it('should serialize event with correct format', () => {
      const event = new OrganizationCreatedEventV1({
        eventId: uuidv4(),
        organizationId: uuidv4(),
        name: 'Test Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdAt: new Date(),
      });

      const serialized = eventBusService.serializeEvent(event);

      expect(serialized).toHaveProperty('eventId');
      expect(serialized).toHaveProperty('eventType', 'OrganizationCreatedEvent-V1');
      expect(serialized).toHaveProperty('eventVersion', '1.0.0');
      expect(serialized).toHaveProperty('occurredAt');
      expect(serialized).toHaveProperty('aggregateId');
      expect(serialized).toHaveProperty('aggregateType', 'Organization');
    });
  });

  describe('Idempotency', () => {
    it('should skip duplicate events with same eventId', () => {
      const eventId = uuidv4();

      expect(idempotencyService.isProcessed(eventId)).toBe(false);
      idempotencyService.markAsProcessed(eventId);
      expect(idempotencyService.isProcessed(eventId)).toBe(true);
    });

    it('should use checkAndMark for atomic operation', () => {
      const eventId = uuidv4();

      expect(idempotencyService.checkAndMark(eventId)).toBe(false);
      expect(idempotencyService.checkAndMark(eventId)).toBe(true);
    });
  });

  describe('Event Logging', () => {
    it('should log event with correct format', () => {
      const logSpy = jest.spyOn(eventLogger, 'logPublish');
      const event = new OrganizationCreatedEventV1({
        eventId: uuidv4(),
        organizationId: uuidv4(),
        name: 'Test Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdAt: new Date(),
      });

      eventLogger.logPublish(event, NatsSubjects.Organization.CREATED_V1);

      expect(logSpy).toHaveBeenCalledWith(event, NatsSubjects.Organization.CREATED_V1);
    });
  });
});
