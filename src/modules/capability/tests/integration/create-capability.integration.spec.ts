import { CommandBus, CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Neo4jService } from '../../../../core/neo4j';
import { CreateCapabilityCommand } from '../../commands/create-capability.command';
import { CapabilityEntity } from '../../entities/capability.entity';
import { CapabilityCreatedEventV1 } from '../../events/capability-created.event';
import { CreateCapabilityCommandHandler } from '../../handlers/create-capability.handler';
import {
  CapabilityNeo4jInitializer,
  CapabilityNeo4jProjection,
} from '../../projections/capability-neo4j.projection';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('CreateCapabilityCommand Integration', () => {
  let module!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let capabilityRepository!: Repository<CapabilityEntity>;
  let projection!: CapabilityNeo4jProjection;
  let initializer!: CapabilityNeo4jInitializer;
  let mockNeo4jSession: {
    run: jest.Mock;
    close: jest.Mock;
  };
  let publishedEvents: unknown[] = [];
  let moduleInitializationFailed = false;

  function createMockNeo4jService(): Partial<Neo4jService> {
    mockNeo4jSession = {
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    return {
      getSession: jest.fn().mockReturnValue(mockNeo4jSession),
    };
  }

  beforeAll(async () => {
    try {
      module = await Test.createTestingModule({
        imports: [
          CqrsModule,
          TypeOrmModule.forRoot({
            type: 'postgres',
            host: process.env.TEST_DB_HOST || 'localhost',
            port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
            username: process.env.TEST_DB_USER || 'test',
            password: process.env.TEST_DB_PASSWORD || 'test',
            database: process.env.TEST_DB_NAME || 'zanafleet_test',
            entities: [CapabilityEntity],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([CapabilityEntity]),
        ],
        providers: [
          CreateCapabilityCommandHandler,
          CapabilityNeo4jProjection,
          CapabilityNeo4jInitializer,
          {
            provide: Neo4jService,
            useFactory: createMockNeo4jService,
          },
        ],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      eventBus = module.get<EventBus>(EventBus);
      capabilityRepository = module.get<Repository<CapabilityEntity>>(
        getRepositoryToken(CapabilityEntity),
      );
      projection = module.get<CapabilityNeo4jProjection>(
        CapabilityNeo4jProjection,
      );
      initializer = module.get<CapabilityNeo4jInitializer>(
        CapabilityNeo4jInitializer,
      );

      commandBus.register([CreateCapabilityCommandHandler]);

      publishedEvents = [];
      jest.spyOn(eventBus, 'publish').mockImplementation((event: unknown) => {
        publishedEvents.push(event);
      });
    } catch (error) {
      console.warn(
        'Failed to initialize Capability integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error),
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Capability integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d). Neo4j is mocked for this suite.',
      );
    }
  });

  beforeEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    publishedEvents = [];
    mockNeo4jSession.run.mockClear();
    mockNeo4jSession.close.mockClear();

    await capabilityRepository.delete({});
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await module.close();
    }
  });

  describe('successful capability creation', () => {
    it('should persist capability entity to PostgreSQL', async () => {
      const command = new CreateCapabilityCommand({ name: 'manage_users' });

      const capabilityId = await commandBus.execute(command);

      expect(capabilityId).toBeDefined();
      expect(typeof capabilityId).toBe('string');

      const capability = await capabilityRepository.findOne({
        where: { id: capabilityId },
      });

      expect(capability).toBeDefined();
      expect(capability?.id).toBe(capabilityId);
      expect(capability?.name).toBe('manage_users');
      expect(capability?.createdAt).toBeInstanceOf(Date);
      expect(capability?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return a valid UUID identifier', async () => {
      const command = new CreateCapabilityCommand({ name: 'manage_roles' });

      const capabilityId = await commandBus.execute(command);

      expect(capabilityId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('event emission', () => {
    it('should emit CapabilityCreatedEventV1 with correct metadata', async () => {
      const command = new CreateCapabilityCommand({ name: 'manage_inventory' });

      const capabilityId = await commandBus.execute(command);

      expect(publishedEvents).toHaveLength(1);
      const event = publishedEvents[0] as CapabilityCreatedEventV1;

      expect(event).toBeInstanceOf(CapabilityCreatedEventV1);
      expect(event.capabilityId).toBe(capabilityId);
      expect(event.name).toBe('manage_inventory');
      expect(event.eventType).toBe('CapabilityCreatedEvent-V1');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.aggregateId).toBe(capabilityId);
      expect(event.aggregateType).toBe('Capability');
      expect(event.eventId).toBeDefined();
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });
  });

  describe('event serialization', () => {
    it('should serialize CapabilityCreatedEventV1 to JSON', async () => {
      const command = new CreateCapabilityCommand({ name: 'manage_reports' });

      await commandBus.execute(command);

      const event = publishedEvents[0] as CapabilityCreatedEventV1;
      const json = event.toJSON();

      expect(json.eventType).toBe('CapabilityCreatedEvent-V1');
      expect(json.eventVersion).toBe('1.0.0');
      expect(json.aggregateType).toBe('Capability');
      expect(typeof json.eventId).toBe('string');
      expect(typeof json.occurredAt).toBe('string');
      expect(typeof json.createdAt).toBe('string');
      expect(json.name).toBe('manage_reports');
    });

    it('should deserialize CapabilityCreatedEventV1 from JSON', () => {
      const originalEvent = new CapabilityCreatedEventV1({
        eventId: uuidv4(),
        capabilityId: uuidv4(),
        name: 'manage_billing',
        createdAt: new Date('2024-01-15T10:00:00.000Z'),
        occurredAt: new Date('2024-01-15T10:00:00.000Z'),
        correlationId: uuidv4(),
        causationId: uuidv4(),
      });

      const json = originalEvent.toJSON();
      const deserialized = CapabilityCreatedEventV1.fromJSON(json);

      expect(deserialized.eventId).toBe(originalEvent.eventId);
      expect(deserialized.capabilityId).toBe(originalEvent.capabilityId);
      expect(deserialized.name).toBe(originalEvent.name);
      expect(deserialized.createdAt.toISOString()).toBe(
        originalEvent.createdAt.toISOString(),
      );
      expect(deserialized.occurredAt.toISOString()).toBe(
        originalEvent.occurredAt.toISOString(),
      );
      expect(deserialized.correlationId).toBe(originalEvent.correlationId);
      expect(deserialized.causationId).toBe(originalEvent.causationId);
    });
  });

  describe('Neo4j projection', () => {
    beforeEach(() => {
      if (moduleInitializationFailed) {
        return;
      }
      mockNeo4jSession.run.mockClear();
      mockNeo4jSession.close.mockClear();
    });

    it('should project capability node with correct parameters', async () => {
      const capabilityId = uuidv4();
      const createdAt = new Date('2024-02-20T12:00:00.000Z');
      const occurredAt = new Date('2024-02-20T12:05:00.000Z');
      const event = new CapabilityCreatedEventV1({
        eventId: uuidv4(),
        capabilityId,
        name: 'manage_access',
        createdAt,
        occurredAt,
      });

      await projection.handle(event);

      expect(mockNeo4jSession.run).toHaveBeenCalledTimes(1);
      const [query, params] = mockNeo4jSession.run.mock.calls[0] as [
        string,
        Record<string, unknown>,
      ];

      expect(query).toContain('MERGE (capability:Capability {id: $capabilityId})');
      expect(query).toContain('capability.name = $name');
      expect(query).toContain('capability.createdAt = datetime($createdAt)');
      expect(query).toContain('capability.updatedAt = datetime($updatedAt)');

      expect(params.capabilityId).toBe(capabilityId);
      expect(params.name).toBe('manage_access');
      expect(params.createdAt).toBe(createdAt.toISOString());
      expect(params.updatedAt).toBe(occurredAt.toISOString());

      expect(mockNeo4jSession.close).toHaveBeenCalledTimes(1);
    });

    it('should close the session when projection fails', async () => {
      mockNeo4jSession.run.mockRejectedValueOnce(
        new Error('Neo4j projection failure'),
      );

      const event = new CapabilityCreatedEventV1({
        eventId: uuidv4(),
        capabilityId: uuidv4(),
        name: 'manage_devices',
        createdAt: new Date(),
        occurredAt: new Date(),
      });

      await expect(projection.handle(event)).rejects.toThrow(
        'Neo4j projection failure',
      );
      expect(mockNeo4jSession.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Neo4j initializer', () => {
    beforeEach(() => {
      if (moduleInitializationFailed) {
        return;
      }
      mockNeo4jSession.run.mockClear();
      mockNeo4jSession.close.mockClear();
    });

    it('should create unique constraint on Capability.id', async () => {
      await initializer.initialize();

      const constraintCall = mockNeo4jSession.run.mock.calls.find((call) =>
        (call[0] as string).includes('capability_id_unique'),
      );

      expect(constraintCall).toBeDefined();
      expect(constraintCall?.[0]).toContain('CREATE CONSTRAINT');
      expect(constraintCall?.[0]).toContain('REQUIRE capability.id IS UNIQUE');
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });

    it('should create index on Capability.name', async () => {
      await initializer.initialize();

      const indexCall = mockNeo4jSession.run.mock.calls.find((call) =>
        (call[0] as string).includes('capability_name_index'),
      );

      expect(indexCall).toBeDefined();
      expect(indexCall?.[0]).toContain('CREATE INDEX');
      expect(indexCall?.[0]).toContain('ON (capability.name)');
      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });
  });
});
