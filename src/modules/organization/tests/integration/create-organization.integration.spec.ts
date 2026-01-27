import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, EventBus, CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateOrganizationCommand } from '../../commands/create-organization.command';
import { OrganizationCreatedEventV1 } from '../../events/organization-created.event';
import { CreateOrganizationCommandHandler } from '../../handlers/create-organization.handler';
import { OrganizationEntity } from '../../entities/organization.entity';
import { OrganizationType, OrganizationStatus } from '../../dto/organization.enums';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

/**
 * Integration Tests: CreateOrganizationCommand End-to-End
 * 
 * Test flow:
 * 1. Command is executed via CommandBus
 * 2. CommandHandler persists to PostgreSQL
 * 3. OrganizationCreatedEvent-V1 is emitted
 * 4. Neo4j projection handler receives event (mocked)
 * 5. Verify: No duplicate events, deterministic behavior
 * 
 * Prerequisites:
 * - TypeORM with test database (SQLite or PostgreSQL test DB)
 * - NestJS CQRS module
 * - Mock NATS/EventBus
 */
describeIntegration('CreateOrganizationCommand Integration Tests', () => {
  let module!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let organizationRepository!: Repository<OrganizationEntity>;
  let emittedEvents: OrganizationCreatedEventV1[] = [];
  let moduleInitializationFailed = false;

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
            entities: [OrganizationEntity],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([OrganizationEntity]),
        ],
        providers: [CreateOrganizationCommandHandler],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      eventBus = module.get<EventBus>(EventBus);
      organizationRepository = module.get<Repository<OrganizationEntity>>(
        getRepositoryToken(OrganizationEntity),
      );

      eventBus.subscribe((event) => {
        if (event instanceof OrganizationCreatedEventV1) {
          emittedEvents.push(event);
        }
      });

      commandBus.register([CreateOrganizationCommandHandler]);
    } catch (error) {
      console.warn(
        'Failed to initialize Organization integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error),
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Organization integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d).',
      );
    }
  });

  afterEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    emittedEvents = [];
    await organizationRepository.delete({});
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await module.close();
    }
  });

  describe('Complete Command Flow', () => {
    it('should execute command, persist to DB, and emit event', async () => {
      // Arrange
      const command = new CreateOrganizationCommand({
        name: 'Integration Test Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      // Act
      const organizationId = await commandBus.execute(command);

      // Assert
      expect(organizationId).toBeDefined();
      expect(typeof organizationId).toBe('string');

      // Verify database persistence
      const savedOrg = await organizationRepository.findOne({
        where: { id: organizationId },
      });
      expect(savedOrg).toBeDefined();
      expect(savedOrg?.name).toBe('Integration Test Org');
      expect(savedOrg?.type).toBe(OrganizationType.SACCO);
      expect(savedOrg?.status).toBe(OrganizationStatus.ACTIVE);

      // Verify event emission
      expect(emittedEvents.length).toBe(1);
      const event = emittedEvents[0];
      expect(event.organizationId).toBe(organizationId);
      expect(event.eventType).toBe('OrganizationCreatedEvent-V1');
      expect(event.name).toBe('Integration Test Org');
    });

    it('should persist linkedWallets to database', async () => {
      // Arrange
      const walletIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ];
      const command = new CreateOrganizationCommand({
        name: 'Org With Wallets',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: walletIds,
      });

      // Act
      const organizationId = await commandBus.execute(command);

      // Assert
      const savedOrg = await organizationRepository.findOne({
        where: { id: organizationId },
      });
      expect(savedOrg?.linkedWallets).toEqual(walletIds);
    });

    it('should emit event with correct metadata', async () => {
      // Arrange
      const command = new CreateOrganizationCommand({
        name: 'Metadata Test Org',
        type: OrganizationType.PLATFORM,
        status: OrganizationStatus.PILOT,
        linkedWallets: [],
      });

      // Act
      const organizationId = await commandBus.execute(command);

      // Assert
      const event = emittedEvents[0];
      expect(event.eventId).toBeDefined();
      expect(event.aggregateId).toBe(organizationId);
      expect(event.aggregateType).toBe('Organization');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.createdAt).toBeInstanceOf(Date);
    });

    it('should not emit duplicate events', async () => {
      // Arrange
      const command = new CreateOrganizationCommand({
        name: 'No Duplicates Org',
        type: OrganizationType.INTERNAL,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      // Act
      await commandBus.execute(command);

      // Assert
      expect(emittedEvents.length).toBe(1);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should produce same event for same input (within test scope)', async () => {
      // Arrange
      const command1 = new CreateOrganizationCommand({
        name: 'Deterministic Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      // Act
      await commandBus.execute(command1);
      const event1 = emittedEvents[0];

      emittedEvents = [];

      const command2 = new CreateOrganizationCommand({
        name: 'Deterministic Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      await commandBus.execute(command2);
      const event2 = emittedEvents[0];

      // Assert
      // Events have same properties (but different IDs and timestamps)
      expect(event1.name).toBe(event2.name);
      expect(event1.type).toBe(event2.type);
      expect(event1.status).toBe(event2.status);
      expect(event1.linkedWallets).toEqual(event2.linkedWallets);
    });

    it('should create unique organizations with different IDs', async () => {
      // Arrange
      const command1 = new CreateOrganizationCommand({
        name: 'Org A',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      const command2 = new CreateOrganizationCommand({
        name: 'Org B',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.PILOT,
        linkedWallets: [],
      });

      // Act
      const id1 = await commandBus.execute(command1);
      const id2 = await commandBus.execute(command2);

      // Assert
      expect(id1).not.toBe(id2);
      expect(emittedEvents.length).toBe(2);
      expect(emittedEvents[0].organizationId).toBe(id1);
      expect(emittedEvents[1].organizationId).toBe(id2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database constraints gracefully', async () => {
      // Arrange
      const command = new CreateOrganizationCommand({
        name: 'Error Handling Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      // Act
      const organizationId = await commandBus.execute(command);
      emittedEvents = [];

      // Try to insert same ID (should fail in real scenario with unique constraint)
      // For now, verify that command creates new org with new ID
      const command2 = new CreateOrganizationCommand({
        name: 'Another Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      const organizationId2 = await commandBus.execute(command2);

      // Assert
      expect(organizationId).not.toBe(organizationId2);
      expect(emittedEvents.length).toBe(1);
    });
  });

  describe('Event Immutability', () => {
    it('should create immutable event', async () => {
      // Arrange
      const command = new CreateOrganizationCommand({
        name: 'Immutable Test',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: ['550e8400-e29b-41d4-a716-446655440000'],
      });

      // Act
      await commandBus.execute(command);
      const event = emittedEvents[0];

      // Assert - linkedWallets should be frozen
      expect(() => {
        (event.linkedWallets as string[]).push('550e8400-e29b-41d4-a716-446655440001');
      }).toThrow();
    });

    it('should serialize and deserialize event correctly', async () => {
      // Arrange
      const command = new CreateOrganizationCommand({
        name: 'Serialization Test',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.PILOT,
        linkedWallets: ['550e8400-e29b-41d4-a716-446655440000'],
      });

      // Act
      await commandBus.execute(command);
      const originalEvent = emittedEvents[0];
      const serialized = originalEvent.toJSON();
      const deserialized = OrganizationCreatedEventV1.fromJSON(serialized);

      // Assert
      expect(deserialized.organizationId).toBe(originalEvent.organizationId);
      expect(deserialized.name).toBe(originalEvent.name);
      expect(deserialized.type).toBe(originalEvent.type);
      expect(deserialized.status).toBe(originalEvent.status);
      expect(deserialized.linkedWallets).toEqual(originalEvent.linkedWallets);
      expect(deserialized.eventType).toBe('OrganizationCreatedEvent-V1');
    });
  });
});
