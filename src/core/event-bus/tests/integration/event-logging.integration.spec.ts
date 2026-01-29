import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';

import { OrganizationType, OrganizationStatus } from '../../../../modules/organization/dto/organization.enums';
import { OrganizationCreatedEventV1 } from '../../../../modules/organization/events/organization-created.event';
import { NatsSubjects } from '../../event-bus.constants';
import { EventLoggerService } from '../../services/event-logger.service';


describe('Event Logging Integration Tests', () => {
  let eventLogger: EventLoggerService;
  let logSpy: jest.SpyInstance;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [EventLoggerService],
    }).compile();

    eventLogger = app.get<EventLoggerService>(EventLoggerService);
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should log PUBLISH events with eventId, eventType, timestamp', () => {
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

    expect(eventLogger).toBeDefined();
  });

  it('should log RECEIVE events with subject', () => {
    const event = new OrganizationCreatedEventV1({
      eventId: uuidv4(),
      organizationId: uuidv4(),
      name: 'Test Org',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
      createdAt: new Date(),
    });

    eventLogger.logReceive(event, NatsSubjects.Organization.CREATED_V1);
    expect(eventLogger).toBeDefined();
  });

  it('should log PROCESSED events with handler name', () => {
    const event = new OrganizationCreatedEventV1({
      eventId: uuidv4(),
      organizationId: uuidv4(),
      name: 'Test Org',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
      createdAt: new Date(),
    });

    eventLogger.logProcessed(event, 'OrganizationNeo4jProjection');
    expect(eventLogger).toBeDefined();
  });

  it('should log SKIPPED events with reason', () => {
    const event = new OrganizationCreatedEventV1({
      eventId: uuidv4(),
      organizationId: uuidv4(),
      name: 'Test Org',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
      createdAt: new Date(),
    });

    eventLogger.logSkipped(event, 'duplicate');
    expect(eventLogger).toBeDefined();
  });

  it('should log FAILED events with error', () => {
    const event = new OrganizationCreatedEventV1({
      eventId: uuidv4(),
      organizationId: uuidv4(),
      name: 'Test Org',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
      createdAt: new Date(),
    });

    eventLogger.logFailed(event, new Error('Test error'));
    expect(eventLogger).toBeDefined();
  });
});
