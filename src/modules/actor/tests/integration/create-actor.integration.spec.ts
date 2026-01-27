import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandBus, CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Neo4jService } from '../../../../core/neo4j';
import { v4 as uuidv4 } from 'uuid';

import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { CreateActorCommand } from '../../commands/create-actor.command';
import { ActorType } from '../../dto/actor.enums';
import { ActorEntity } from '../../entities/actor.entity';
import { ActorOnboardedEventV1 } from '../../events/actor-onboarded.event';
import { CreateActorCommandHandler } from '../../handlers/create-actor.handler';
import {
  ActorNeo4jInitializer,
  ActorNeo4jProjection,
} from '../../projections/actor-neo4j.projection';

/**
 * Integration tests for Actor creation flow
 *
 * Tests the full command → event → projection flow:
 * 1. Workspace validation
 * 2. Role validation against workspace.roleTemplates
 * 3. Entity persistence
 * 4. Event emission
 * 5. Neo4j projection
 *
 * Requires Docker services: Postgres, Neo4j
 * Run: docker-compose -f docker-compose.test.yml up -d
 */
const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('CreateActorCommand Integration', () => {
  let module!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let actorRepository!: Repository<ActorEntity>;
  let workspaceRepository!: Repository<WorkspaceEntity>;
  let mockNeo4jSession!: {
    run: jest.Mock;
    close: jest.Mock;
  };
  let publishedEvents: unknown[] = [];
  let moduleInitializationFailed = false;

  // Test fixture IDs
  const roleTemplateId1 = uuidv4();
  const roleTemplateId2 = uuidv4();
  const invalidRoleId = uuidv4();
  let testWorkspaceId: string;
  let testOrgId: string;

  /**
   * Creates a mock Neo4j service for testing projections
   */
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
            entities: [ActorEntity, WorkspaceEntity],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([ActorEntity, WorkspaceEntity]),
        ],
        providers: [
          CreateActorCommandHandler,
          ActorNeo4jProjection,
          ActorNeo4jInitializer,
          {
            provide: Neo4jService,
            useFactory: createMockNeo4jService,
          },
        ],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      eventBus = module.get<EventBus>(EventBus);
      actorRepository = module.get<Repository<ActorEntity>>(
        getRepositoryToken(ActorEntity),
      );
      workspaceRepository = module.get<Repository<WorkspaceEntity>>(
        getRepositoryToken(WorkspaceEntity),
      );

      // Register command handlers with the command bus
      commandBus.register([CreateActorCommandHandler]);

      // Capture published events
      publishedEvents = [];
      jest.spyOn(eventBus, 'publish').mockImplementation((event: unknown) => {
        publishedEvents.push(event);
      });
    } catch (error) {
      console.warn(
        'Failed to initialize Actor integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error),
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Actor integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d). Neo4j is mocked for this suite.',
      );
    }
  });

  beforeEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    // Reset state
    publishedEvents = [];
    mockNeo4jSession.run.mockClear();
    mockNeo4jSession.close.mockClear();

    // Clean up database
    if (actorRepository) {
      await actorRepository.delete({});
    }
    if (workspaceRepository) {
      await workspaceRepository.delete({});
    }

    // Create test workspace with roleTemplates
    testWorkspaceId = uuidv4();
    testOrgId = uuidv4();

    const workspaceEntity = new WorkspaceEntity();
    workspaceEntity.id = testWorkspaceId;
    workspaceEntity.orgId = testOrgId;
    workspaceEntity.name = 'Test Workspace';
    workspaceEntity.roleTemplates = [roleTemplateId1, roleTemplateId2];
    workspaceEntity.createdAt = new Date();
    workspaceEntity.updatedAt = new Date();

    if (workspaceRepository) {
      await workspaceRepository.save(workspaceEntity);
    }
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await module.close();
    }
  });

  describe('workspace validation', () => {
    it('should fail when workspace does not exist', async () => {
      const nonExistentWorkspaceId = uuidv4();
      const command = new CreateActorCommand({
        type: ActorType.Rider,
        workspaceId: nonExistentWorkspaceId,
        roles: [roleTemplateId1],
        linkedWallets: [],
      });

      await expect(commandBus.execute(command)).rejects.toThrow(
        NotFoundException,
      );
      await expect(commandBus.execute(command)).rejects.toThrow(
        `Workspace with ID ${nonExistentWorkspaceId} does not exist`,
      );

      // Verify no actor was persisted
      const actors = await actorRepository.find();
      expect(actors).toHaveLength(0);

      // Verify no event was emitted
      expect(publishedEvents).toHaveLength(0);
    });
  });

  describe('role validation', () => {
    it('should fail when roles are not in workspace.roleTemplates', async () => {
      const command = new CreateActorCommand({
        type: ActorType.Business,
        workspaceId: testWorkspaceId,
        roles: [invalidRoleId],
        linkedWallets: [],
      });

      await expect(commandBus.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(commandBus.execute(command)).rejects.toThrow(
        `The following roles are not valid for workspace ${testWorkspaceId}: ${invalidRoleId}`,
      );

      // Verify no actor was persisted
      const actors = await actorRepository.find();
      expect(actors).toHaveLength(0);

      // Verify no event was emitted
      expect(publishedEvents).toHaveLength(0);
    });

    it('should fail when some roles are valid and some are invalid', async () => {
      const command = new CreateActorCommand({
        type: ActorType.SaccoAdmin,
        workspaceId: testWorkspaceId,
        roles: [roleTemplateId1, invalidRoleId],
        linkedWallets: [],
      });

      await expect(commandBus.execute(command)).rejects.toThrow(
        BadRequestException,
      );

      // Verify no actor was persisted
      const actors = await actorRepository.find();
      expect(actors).toHaveLength(0);
    });

    it('should succeed with empty roles array', async () => {
      const command = new CreateActorCommand({
        type: ActorType.Internal,
        workspaceId: testWorkspaceId,
        roles: [],
        linkedWallets: [],
      });

      const actorId = await commandBus.execute(command);

      expect(actorId).toBeDefined();
      expect(typeof actorId).toBe('string');

      const actor = await actorRepository.findOne({ where: { id: actorId } });
      expect(actor).toBeDefined();
      expect(actor?.roles).toEqual([]);
    });
  });

  describe('successful actor creation', () => {
    it('should persist actor entity to PostgreSQL', async () => {
      const walletId = uuidv4();
      const command = new CreateActorCommand({
        type: ActorType.Rider,
        workspaceId: testWorkspaceId,
        roles: [roleTemplateId1, roleTemplateId2],
        linkedWallets: [walletId],
      });

      const actorId = await commandBus.execute(command);

      // Verify actor was persisted
      const actor = await actorRepository.findOne({ where: { id: actorId } });

      expect(actor).toBeDefined();
      expect(actor?.id).toBe(actorId);
      expect(actor?.type).toBe(ActorType.Rider);
      expect(actor?.workspaceId).toBe(testWorkspaceId);
      expect(actor?.roles).toEqual([roleTemplateId1, roleTemplateId2]);
      expect(actor?.linkedWallets).toEqual([walletId]);
      expect(actor?.createdAt).toBeInstanceOf(Date);
      expect(actor?.updatedAt).toBeInstanceOf(Date);
    });

    it('should emit ActorOnboardedEventV1', async () => {
      const command = new CreateActorCommand({
        type: ActorType.Business,
        workspaceId: testWorkspaceId,
        roles: [roleTemplateId1],
        linkedWallets: [],
      });

      const actorId = await commandBus.execute(command);

      // Verify event was emitted
      expect(publishedEvents).toHaveLength(1);

      const event = publishedEvents[0] as ActorOnboardedEventV1;
      expect(event).toBeInstanceOf(ActorOnboardedEventV1);
      expect(event.eventType).toBe('ActorOnboardedEvent-V1');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.actorId).toBe(actorId);
      expect(event.type).toBe(ActorType.Business);
      expect(event.workspaceId).toBe(testWorkspaceId);
      expect(event.roles).toEqual([roleTemplateId1]);
      expect(event.linkedWallets).toEqual([]);
      expect(event.aggregateId).toBe(actorId);
      expect(event.aggregateType).toBe('Actor');
      expect(event.eventId).toBeDefined();
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.createdAt).toBeInstanceOf(Date);
    });

    it('should return valid UUID as actorId', async () => {
      const command = new CreateActorCommand({
        type: ActorType.AIService,
        workspaceId: testWorkspaceId,
        roles: [roleTemplateId1],
        linkedWallets: [],
      });

      const actorId = await commandBus.execute(command);

      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(actorId).toMatch(uuidRegex);
    });

    it('should handle all ActorType enum values', async () => {
      const actorTypes = Object.values(ActorType);

      for (const actorType of actorTypes) {
        const command = new CreateActorCommand({
          type: actorType,
          workspaceId: testWorkspaceId,
          roles: [roleTemplateId1],
          linkedWallets: [],
        });

        const actorId = await commandBus.execute(command);
        const actor = await actorRepository.findOne({ where: { id: actorId } });

        expect(actor?.type).toBe(actorType);
      }
    });
  });

  describe('Neo4j projection', () => {
    let projection: ActorNeo4jProjection;

    beforeEach(() => {
      if (moduleInitializationFailed) {
        return;
      }
      projection = module.get<ActorNeo4jProjection>(ActorNeo4jProjection);
    });

    it('should create Actor node with MEMBER_OF relationship', async () => {
      const actorId = uuidv4();
      const event = new ActorOnboardedEventV1({
        eventId: uuidv4(),
        actorId,
        type: ActorType.Rider,
        roles: [roleTemplateId1],
        workspaceId: testWorkspaceId,
        linkedWallets: [],
        createdAt: new Date(),
        occurredAt: new Date(),
      });

      await projection.handle(event);

      // Verify Neo4j session was used
      expect(mockNeo4jSession.run).toHaveBeenCalledTimes(1);

      // Verify the Cypher query contains MERGE for Actor and MEMBER_OF relationship
      const cypherCall = mockNeo4jSession.run.mock.calls[0];
      const query = cypherCall[0] as string;
      const params = cypherCall[1] as Record<string, unknown>;

      expect(query).toContain('MERGE (actor:Actor {id: $actorId})');
      expect(query).toContain('actor.type = $type');
      expect(query).toContain('actor.workspaceId = $workspaceId');
      expect(query).toContain('MATCH (workspace:Workspace {id: $workspaceId})');
      expect(query).toContain('MERGE (actor)-[:MEMBER_OF]->(workspace)');

      // Verify parameters
      expect(params.actorId).toBe(actorId);
      expect(params.type).toBe(ActorType.Rider);
      expect(params.workspaceId).toBe(testWorkspaceId);

      // Verify session was closed
      expect(mockNeo4jSession.close).toHaveBeenCalledTimes(1);
    });

    it('should include datetime properties in Neo4j node', async () => {
      const actorId = uuidv4();
      const createdAt = new Date('2024-01-15T10:30:00Z');
      const event = new ActorOnboardedEventV1({
        eventId: uuidv4(),
        actorId,
        type: ActorType.Internal,
        roles: [],
        workspaceId: testWorkspaceId,
        linkedWallets: [],
        createdAt,
        occurredAt: new Date(),
      });

      await projection.handle(event);

      const params = mockNeo4jSession.run.mock.calls[0][1] as Record<
        string,
        unknown
      >;

      expect(params.createdAt).toBe(createdAt.toISOString());
      expect(params.updatedAt).toBeDefined();
    });

    it('should handle projection errors gracefully', async () => {
      mockNeo4jSession.run.mockRejectedValueOnce(
        new Error('Neo4j connection failed'),
      );

      const event = new ActorOnboardedEventV1({
        eventId: uuidv4(),
        actorId: uuidv4(),
        type: ActorType.Business,
        roles: [roleTemplateId1],
        workspaceId: testWorkspaceId,
        linkedWallets: [],
        createdAt: new Date(),
        occurredAt: new Date(),
      });

      await expect(projection.handle(event)).rejects.toThrow(
        'Neo4j connection failed',
      );

      // Verify session was still closed
      expect(mockNeo4jSession.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Neo4j initializer', () => {
    let initializer: ActorNeo4jInitializer;

    beforeEach(() => {
      if (moduleInitializationFailed) {
        return;
      }
      initializer = module.get<ActorNeo4jInitializer>(ActorNeo4jInitializer);
      mockNeo4jSession.run.mockClear();
      mockNeo4jSession.close.mockClear();
    });

    it('should create unique constraint on Actor.id', async () => {
      await initializer.initialize();

      const calls = mockNeo4jSession.run.mock.calls;
      const constraintCall = calls.find((call) =>
        (call[0] as string).includes('actor_id_unique'),
      );

      expect(constraintCall).toBeDefined();
      expect(constraintCall?.[0]).toContain('CREATE CONSTRAINT');
      expect(constraintCall?.[0]).toContain('REQUIRE actor.id IS UNIQUE');
    });

    it('should create index on Actor.type', async () => {
      await initializer.initialize();

      const calls = mockNeo4jSession.run.mock.calls;
      const indexCall = calls.find((call) =>
        (call[0] as string).includes('actor_type_index'),
      );

      expect(indexCall).toBeDefined();
      expect(indexCall?.[0]).toContain('CREATE INDEX');
      expect(indexCall?.[0]).toContain('ON (actor.type)');
    });

    it('should create index on Actor.workspaceId', async () => {
      await initializer.initialize();

      const calls = mockNeo4jSession.run.mock.calls;
      const indexCall = calls.find((call) =>
        (call[0] as string).includes('actor_workspaceId_index'),
      );

      expect(indexCall).toBeDefined();
      expect(indexCall?.[0]).toContain('CREATE INDEX');
      expect(indexCall?.[0]).toContain('ON (actor.workspaceId)');
    });

    it('should close session after initialization', async () => {
      await initializer.initialize();

      expect(mockNeo4jSession.close).toHaveBeenCalled();
    });
  });

  describe('event serialization', () => {
    it('should serialize ActorOnboardedEventV1 to JSON correctly', async () => {
      const command = new CreateActorCommand({
        type: ActorType.Rider,
        workspaceId: testWorkspaceId,
        roles: [roleTemplateId1],
        linkedWallets: [],
      });

      await commandBus.execute(command);

      const event = publishedEvents[0] as ActorOnboardedEventV1;
      const json = event.toJSON();

      expect(json.eventType).toBe('ActorOnboardedEvent-V1');
      expect(json.eventVersion).toBe('1.0.0');
      expect(json.aggregateType).toBe('Actor');
      expect(typeof json.occurredAt).toBe('string');
      expect(typeof json.createdAt).toBe('string');
      expect(Array.isArray(json.roles)).toBe(true);
      expect(Array.isArray(json.linkedWallets)).toBe(true);
    });

    it('should deserialize ActorOnboardedEventV1 from JSON correctly', () => {
      const originalEvent = new ActorOnboardedEventV1({
        eventId: uuidv4(),
        actorId: uuidv4(),
        type: ActorType.Business,
        roles: [roleTemplateId1, roleTemplateId2],
        workspaceId: testWorkspaceId,
        linkedWallets: [uuidv4()],
        createdAt: new Date(),
        occurredAt: new Date(),
        correlationId: uuidv4(),
        causationId: uuidv4(),
      });

      const json = originalEvent.toJSON();
      const deserializedEvent = ActorOnboardedEventV1.fromJSON(json);

      expect(deserializedEvent.eventId).toBe(originalEvent.eventId);
      expect(deserializedEvent.actorId).toBe(originalEvent.actorId);
      expect(deserializedEvent.type).toBe(originalEvent.type);
      expect([...deserializedEvent.roles]).toEqual([...originalEvent.roles]);
      expect(deserializedEvent.workspaceId).toBe(originalEvent.workspaceId);
      expect([...deserializedEvent.linkedWallets]).toEqual([
        ...originalEvent.linkedWallets,
      ]);
      expect(deserializedEvent.correlationId).toBe(originalEvent.correlationId);
      expect(deserializedEvent.causationId).toBe(originalEvent.causationId);
    });
  });
});
