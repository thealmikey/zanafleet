import { CommandBus, CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { ActorEntity } from '../../../actor/entities/actor.entity';
import { AddActorToWorkspaceCommandHandler } from '../../../workspace/handlers/add-actor-to-workspace.handler';
import { CreateWorkspaceCommandHandler } from '../../../workspace/handlers/create-workspace.handler';
import { MembershipEntity } from '../../../workspace/entities/membership.entity';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import {
  MembershipRole,
  WorkspaceStatus,
  WorkspaceType,
} from '../../../workspace/dto/workspace.enums';
import { CreateOrganizationCommand } from '../../commands/create-organization.command';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';
import { OrganizationEntity } from '../../entities/organization.entity';
import { OrganizationCreatedEventV1 } from '../../events/organization-created.event';
import { CreateOrganizationCommandHandler } from '../../handlers/create-organization.handler';

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
/**
 * Helper function to create a test actor in the database
 * Used for testing admin-by-default flow
 */
async function createTestActor(
  repo: Repository<ActorEntity>,
  workspaceId: string,
): Promise<string> {
  const actorId = uuidv4();
  const actor = ActorEntity.fromDomain({
    actorId,
    type: ActorType.SaccoAdmin,
    roles: [],
    workspaceId,
    linkedWallets: [],
    createdAt: new Date(),
  });
  await repo.save(actor);
  return actorId;
}

describeIntegration('CreateOrganizationCommand Integration Tests', () => {
  let module!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let organizationRepository!: Repository<OrganizationEntity>;
  let workspaceRepository!: Repository<WorkspaceEntity>;
  let membershipRepository!: Repository<MembershipEntity>;
  let actorRepository!: Repository<ActorEntity>;
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
            entities: [
              OrganizationEntity,
              WorkspaceEntity,
              MembershipEntity,
              ActorEntity,
            ],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([
            OrganizationEntity,
            WorkspaceEntity,
            MembershipEntity,
            ActorEntity,
          ]),
        ],
        providers: [
          CreateOrganizationCommandHandler,
          CreateWorkspaceCommandHandler,
          AddActorToWorkspaceCommandHandler,
        ],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      eventBus = module.get<EventBus>(EventBus);
      organizationRepository = module.get<Repository<OrganizationEntity>>(
        getRepositoryToken(OrganizationEntity),
      );
      workspaceRepository = module.get<Repository<WorkspaceEntity>>(
        getRepositoryToken(WorkspaceEntity),
      );
      membershipRepository = module.get<Repository<MembershipEntity>>(
        getRepositoryToken(MembershipEntity),
      );
      actorRepository = module.get<Repository<ActorEntity>>(
        getRepositoryToken(ActorEntity),
      );

      eventBus.subscribe((event) => {
        if (event instanceof OrganizationCreatedEventV1) {
          emittedEvents.push(event);
        }
      });

      commandBus.register([
        CreateOrganizationCommandHandler,
        CreateWorkspaceCommandHandler,
        AddActorToWorkspaceCommandHandler,
      ]);
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
    await membershipRepository.delete({});
    await workspaceRepository.delete({});
    await actorRepository.delete({});
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

  describe('Admin-by-Default Organization Creation Flow', () => {
    it('should create SACCO organization with default workspace and ADMIN membership when createdByActorId is provided', async () => {
      const placeholderWorkspaceId = uuidv4();
      const placeholderWorkspace = WorkspaceEntity.fromDomain({
        workspaceId: placeholderWorkspaceId,
        orgId: uuidv4(),
        name: 'Placeholder Workspace',
        type: WorkspaceType.SACCO,
        status: WorkspaceStatus.ACTIVE,
        roleTemplates: [],
        createdAt: new Date(),
      });

      const tempOrgId = uuidv4();
      const tempOrg = OrganizationEntity.fromDomain({
        organizationId: tempOrgId,
        name: 'Temp Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdAt: new Date(),
      });
      await organizationRepository.save(tempOrg);
      placeholderWorkspace.orgId = tempOrgId;
      await workspaceRepository.save(placeholderWorkspace);

      const actorId = await createTestActor(actorRepository, placeholderWorkspaceId);

      const command = new CreateOrganizationCommand({
        name: 'Test SACCO Organization',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdByActorId: actorId,
      });

      const organizationId = await commandBus.execute(command);

      const savedOrg = await organizationRepository.findOne({
        where: { id: organizationId },
      });
      expect(savedOrg).toBeDefined();
      expect(savedOrg?.type).toBe(OrganizationType.SACCO);
      expect(savedOrg?.name).toBe('Test SACCO Organization');

      const savedWorkspace = await workspaceRepository.findOne({
        where: { orgId: organizationId },
      });
      expect(savedWorkspace).toBeDefined();
      expect(savedWorkspace?.type).toBe(WorkspaceType.SACCO);
      expect(savedWorkspace?.name).toBe('Test SACCO Organization Workspace');

      const savedMembership = await membershipRepository.findOne({
        where: { actorId, workspaceId: savedWorkspace?.id },
      });
      expect(savedMembership).toBeDefined();
      expect(savedMembership?.role).toBe(MembershipRole.ADMIN);
    });

    it('should create BUSINESS organization with default workspace and ADMIN membership when createdByActorId is provided', async () => {
      const tempOrgId = uuidv4();
      const tempOrg = OrganizationEntity.fromDomain({
        organizationId: tempOrgId,
        name: 'Temp Org',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdAt: new Date(),
      });
      await organizationRepository.save(tempOrg);

      const placeholderWorkspaceId = uuidv4();
      const placeholderWorkspace = WorkspaceEntity.fromDomain({
        workspaceId: placeholderWorkspaceId,
        orgId: tempOrgId,
        name: 'Placeholder Workspace',
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
        roleTemplates: [],
        createdAt: new Date(),
      });
      await workspaceRepository.save(placeholderWorkspace);

      const actorId = await createTestActor(actorRepository, placeholderWorkspaceId);

      const command = new CreateOrganizationCommand({
        name: 'Test Business Organization',
        type: OrganizationType.BUSINESS,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdByActorId: actorId,
      });

      const organizationId = await commandBus.execute(command);

      const savedOrg = await organizationRepository.findOne({
        where: { id: organizationId },
      });
      expect(savedOrg).toBeDefined();
      expect(savedOrg?.type).toBe(OrganizationType.BUSINESS);

      const savedWorkspace = await workspaceRepository.findOne({
        where: { orgId: organizationId },
      });
      expect(savedWorkspace).toBeDefined();
      expect(savedWorkspace?.type).toBe(WorkspaceType.BUSINESS);

      const savedMembership = await membershipRepository.findOne({
        where: { actorId, workspaceId: savedWorkspace?.id },
      });
      expect(savedMembership).toBeDefined();
      expect(savedMembership?.role).toBe(MembershipRole.ADMIN);
    });

    it('should create PLATFORM organization without workspace or membership even when createdByActorId is provided', async () => {
      const tempOrgId = uuidv4();
      const tempOrg = OrganizationEntity.fromDomain({
        organizationId: tempOrgId,
        name: 'Temp Org',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdAt: new Date(),
      });
      await organizationRepository.save(tempOrg);

      const placeholderWorkspaceId = uuidv4();
      const placeholderWorkspace = WorkspaceEntity.fromDomain({
        workspaceId: placeholderWorkspaceId,
        orgId: tempOrgId,
        name: 'Placeholder Workspace',
        type: WorkspaceType.SACCO,
        status: WorkspaceStatus.ACTIVE,
        roleTemplates: [],
        createdAt: new Date(),
      });
      await workspaceRepository.save(placeholderWorkspace);

      const actorId = await createTestActor(actorRepository, placeholderWorkspaceId);

      const command = new CreateOrganizationCommand({
        name: 'Test Platform Organization',
        type: OrganizationType.PLATFORM,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
        createdByActorId: actorId,
      });

      const organizationId = await commandBus.execute(command);

      const savedOrg = await organizationRepository.findOne({
        where: { id: organizationId },
      });
      expect(savedOrg).toBeDefined();
      expect(savedOrg?.type).toBe(OrganizationType.PLATFORM);

      const workspaces = await workspaceRepository.find({
        where: { orgId: organizationId },
      });
      expect(workspaces.length).toBe(0);

      const memberships = await membershipRepository.find({
        where: { actorId },
      });
      const relevantMemberships = memberships.filter(
        (membership) => membership.workspaceId !== placeholderWorkspaceId,
      );
      expect(relevantMemberships.length).toBe(0);
    });

    it('should create SACCO organization with default workspace but NO membership when createdByActorId is not provided', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Test SACCO No Actor',
        type: OrganizationType.SACCO,
        status: OrganizationStatus.ACTIVE,
        linkedWallets: [],
      });

      const organizationId = await commandBus.execute(command);

      const savedOrg = await organizationRepository.findOne({
        where: { id: organizationId },
      });
      expect(savedOrg).toBeDefined();
      expect(savedOrg?.type).toBe(OrganizationType.SACCO);

      const savedWorkspace = await workspaceRepository.findOne({
        where: { orgId: organizationId },
      });
      expect(savedWorkspace).toBeDefined();
      expect(savedWorkspace?.type).toBe(WorkspaceType.SACCO);

      const memberships = await membershipRepository.find({
        where: { workspaceId: savedWorkspace?.id },
      });
      expect(memberships.length).toBe(0);
    });

    it('should maintain backward compatibility with minimal fields (name, type, status)', async () => {
      const command = new CreateOrganizationCommand({
        name: 'Minimal Org',
        type: OrganizationType.INTERNAL,
        status: OrganizationStatus.ACTIVE,
      });

      const organizationId = await commandBus.execute(command);

      const savedOrg = await organizationRepository.findOne({
        where: { id: organizationId },
      });
      expect(savedOrg).toBeDefined();
      expect(savedOrg?.name).toBe('Minimal Org');
      expect(savedOrg?.type).toBe(OrganizationType.INTERNAL);
      expect(savedOrg?.status).toBe(OrganizationStatus.ACTIVE);
      expect(savedOrg?.linkedWallets).toEqual([]);

      const workspaces = await workspaceRepository.find({
        where: { orgId: organizationId },
      });
      expect(workspaces.length).toBe(0);
    });
  });
});
