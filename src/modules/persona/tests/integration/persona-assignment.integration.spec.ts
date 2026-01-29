import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandBus, CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Neo4jService } from '../../../../core/neo4j';
import { ActorType } from '../../../actor/dto/actor.enums';
import { ActorEntity } from '../../../actor/entities/actor.entity';
import { OrganizationStatus, OrganizationType } from '../../../organization/dto/organization.enums';
import { OrganizationEntity } from '../../../organization/entities/organization.entity';
import { WorkspaceStatus, WorkspaceType } from '../../../workspace/dto/workspace.enums';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { AssignPersonaToActorCommand } from '../../commands/assign-persona-to-actor.command';
import { CreatePersonaCommand } from '../../commands/create-persona.command';
import { ActorPersonaEntity } from '../../entities/actor-persona.entity';
import { PersonaEntity } from '../../entities/persona.entity';
import { PersonaAssignedToActorEventV1 } from '../../events/persona-assigned-to-actor.event';
import { AssignPersonaToActorCommandHandler } from '../../handlers/assign-persona-to-actor.handler';
import { CreatePersonaCommandHandler } from '../../handlers/create-persona.handler';

/**
 * Integration tests for Persona assignment flow.
 *
 * Validates the command → event pipeline for persona assignments:
 * 1. Foreign key validation for actor, workspace, and persona entities.
 * 2. Additive persona assignment behavior for actors within a workspace.
 * 3. Duplicate assignment rejection with ConflictException handling.
 * 4. Persistence and event emission for successful assignments.
 *
 * Requires Docker services: Postgres (Neo4j interactions are mocked).
 * Run: docker-compose -f docker-compose.test.yml up -d
 */
const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

function createMockNeo4jService(): Partial<Neo4jService> {
  return {
    getSession: jest.fn().mockReturnValue({
      run: jest.fn().mockResolvedValue({ records: [] }),
      close: jest.fn().mockResolvedValue(undefined),
    }),
  };
}

describeIntegration('AssignPersonaToActorCommand Integration', () => {
  let testingModule!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let personaRepository!: Repository<PersonaEntity>;
  let actorPersonaRepository!: Repository<ActorPersonaEntity>;
  let actorRepository!: Repository<ActorEntity>;
  let workspaceRepository!: Repository<WorkspaceEntity>;
  let organizationRepository!: Repository<OrganizationEntity>;
  let publishedEvents: unknown[] = [];
  let moduleInitializationFailed = false;

  let testOrgId!: string;
  let testWorkspaceId!: string;
  let testActorId!: string;

  beforeAll(async () => {
    try {
      testingModule = await Test.createTestingModule({
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
              PersonaEntity,
              ActorPersonaEntity,
              ActorEntity,
              WorkspaceEntity,
              OrganizationEntity,
            ],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([
            PersonaEntity,
            ActorPersonaEntity,
            ActorEntity,
            WorkspaceEntity,
            OrganizationEntity,
          ]),
        ],
        providers: [
          CreatePersonaCommandHandler,
          AssignPersonaToActorCommandHandler,
          {
            provide: Neo4jService,
            useFactory: createMockNeo4jService,
          },
        ],
      }).compile();

      commandBus = testingModule.get<CommandBus>(CommandBus);
      eventBus = testingModule.get<EventBus>(EventBus);
      personaRepository = testingModule.get<Repository<PersonaEntity>>(
        getRepositoryToken(PersonaEntity)
      );
      actorPersonaRepository = testingModule.get<Repository<ActorPersonaEntity>>(
        getRepositoryToken(ActorPersonaEntity)
      );
      actorRepository = testingModule.get<Repository<ActorEntity>>(getRepositoryToken(ActorEntity));
      workspaceRepository = testingModule.get<Repository<WorkspaceEntity>>(
        getRepositoryToken(WorkspaceEntity)
      );
      organizationRepository = testingModule.get<Repository<OrganizationEntity>>(
        getRepositoryToken(OrganizationEntity)
      );

      commandBus.register([CreatePersonaCommandHandler, AssignPersonaToActorCommandHandler]);

      jest.spyOn(eventBus, 'publish').mockImplementation((event: unknown) => {
        publishedEvents.push(event);
      });
    } catch (error) {
      console.warn(
        'Failed to initialize Persona integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error)
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Persona integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d). Neo4j is mocked for this suite.'
      );
    }
  });

  beforeEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    publishedEvents = [];

    await actorPersonaRepository.delete({});
    await personaRepository.delete({});
    await actorRepository.delete({});
    await workspaceRepository.delete({});
    await organizationRepository.delete({});

    testOrgId = uuidv4();
    const organization = OrganizationEntity.fromDomain({
      organizationId: testOrgId,
      name: 'Test Organization',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
      createdAt: new Date(),
    });
    await organizationRepository.save(organization);

    testWorkspaceId = uuidv4();
    const workspace = WorkspaceEntity.fromDomain({
      workspaceId: testWorkspaceId,
      orgId: testOrgId,
      name: 'Test Workspace',
      type: WorkspaceType.BUSINESS,
      status: WorkspaceStatus.ACTIVE,
      roleTemplates: [],
      createdAt: new Date(),
    });
    await workspaceRepository.save(workspace);

    testActorId = uuidv4();
    const actor = ActorEntity.fromDomain({
      actorId: testActorId,
      type: ActorType.Rider,
      roles: [],
      workspaceId: testWorkspaceId,
      linkedWallets: [],
      createdAt: new Date(),
    });
    await actorRepository.save(actor);
  });

  afterEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    await actorPersonaRepository.delete({});
    await personaRepository.delete({});
    await actorRepository.delete({});
    await workspaceRepository.delete({});
    await organizationRepository.delete({});
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await testingModule.close();
    }
  });

  describe('entity validation', () => {
    it('should throw NotFoundException when actor does not exist', async () => {
      const personaId = await commandBus.execute(
        new CreatePersonaCommand({ name: 'Persona for missing actor' })
      );

      publishedEvents = [];

      const nonExistentActorId = uuidv4();

      expect.assertions(2);

      try {
        await commandBus.execute(
          new AssignPersonaToActorCommand({
            actorId: nonExistentActorId,
            workspaceId: testWorkspaceId,
            personaId,
          })
        );
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toBe(
          `Actor with ID '${nonExistentActorId}' does not exist`
        );
      }
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      const personaId = await commandBus.execute(
        new CreatePersonaCommand({ name: 'Persona for missing workspace' })
      );

      publishedEvents = [];

      const nonExistentWorkspaceId = uuidv4();

      expect.assertions(2);

      try {
        await commandBus.execute(
          new AssignPersonaToActorCommand({
            actorId: testActorId,
            workspaceId: nonExistentWorkspaceId,
            personaId,
          })
        );
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toBe(
          `Workspace with ID '${nonExistentWorkspaceId}' does not exist`
        );
      }
    });

    it('should throw NotFoundException when persona does not exist', async () => {
      const nonExistentPersonaId = uuidv4();

      publishedEvents = [];

      expect.assertions(2);

      try {
        await commandBus.execute(
          new AssignPersonaToActorCommand({
            actorId: testActorId,
            workspaceId: testWorkspaceId,
            personaId: nonExistentPersonaId,
          })
        );
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).message).toBe(
          `Persona with ID '${nonExistentPersonaId}' does not exist`
        );
      }
    });
  });

  describe('multiple personas assignment', () => {
    it('should allow assigning multiple different personas to same actor in same workspace', async () => {
      const personaIdA = await commandBus.execute(new CreatePersonaCommand({ name: 'Persona A' }));
      const personaIdB = await commandBus.execute(new CreatePersonaCommand({ name: 'Persona B' }));

      publishedEvents = [];

      await commandBus.execute(
        new AssignPersonaToActorCommand({
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId: personaIdA,
        })
      );
      await commandBus.execute(
        new AssignPersonaToActorCommand({
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId: personaIdB,
        })
      );

      const assignments = await actorPersonaRepository.find({
        where: { actorId: testActorId, workspaceId: testWorkspaceId },
      });

      expect(assignments).toHaveLength(2);

      const persistedPersonaIds = assignments.map((assignment) => assignment.personaId).sort();
      const expectedPersonaIds = [personaIdA, personaIdB].sort();

      expect(persistedPersonaIds).toEqual(expectedPersonaIds);
      expect(publishedEvents).toHaveLength(2);

      const assignmentEvents = publishedEvents.filter(
        (event): event is PersonaAssignedToActorEventV1 =>
          event instanceof PersonaAssignedToActorEventV1
      );

      expect(assignmentEvents).toHaveLength(2);

      const emittedPersonaIds = assignmentEvents.map((event) => event.personaId).sort();

      expect(emittedPersonaIds).toEqual(expectedPersonaIds);
    });
  });

  describe('duplicate assignment rejection', () => {
    it('should throw ConflictException when assigning same persona twice', async () => {
      const personaId = await commandBus.execute(
        new CreatePersonaCommand({ name: 'Duplicate Persona' })
      );

      publishedEvents = [];

      await commandBus.execute(
        new AssignPersonaToActorCommand({
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId,
        })
      );

      expect.assertions(3);

      try {
        await commandBus.execute(
          new AssignPersonaToActorCommand({
            actorId: testActorId,
            workspaceId: testWorkspaceId,
            personaId,
          })
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).message).toBe(
          'Persona is already assigned to this actor within the specified workspace'
        );
      }

      const assignments = await actorPersonaRepository.find();
      expect(assignments).toHaveLength(1);
    });

    it('should not emit event when duplicate assignment is rejected', async () => {
      const personaId = await commandBus.execute(
        new CreatePersonaCommand({ name: 'Duplicate Event Persona' })
      );

      publishedEvents = [];

      await commandBus.execute(
        new AssignPersonaToActorCommand({
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId,
        })
      );

      publishedEvents = [];

      expect.assertions(4);

      try {
        await commandBus.execute(
          new AssignPersonaToActorCommand({
            actorId: testActorId,
            workspaceId: testWorkspaceId,
            personaId,
          })
        );
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        expect((error as ConflictException).message).toBe(
          'Persona is already assigned to this actor within the specified workspace'
        );
      }

      const assignments = await actorPersonaRepository.find();
      expect(assignments).toHaveLength(1);
      expect(publishedEvents).toHaveLength(0);
    });
  });

  describe('successful assignment', () => {
    it('should persist ActorPersonaEntity to database', async () => {
      const personaId = await commandBus.execute(
        new CreatePersonaCommand({ name: 'Persistence Persona' })
      );

      publishedEvents = [];

      await commandBus.execute(
        new AssignPersonaToActorCommand({
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId,
        })
      );

      const entity = await actorPersonaRepository.findOne({
        where: {
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId,
        },
      });

      expect(entity).toBeDefined();
      expect(entity?.actorId).toBe(testActorId);
      expect(entity?.workspaceId).toBe(testWorkspaceId);
      expect(entity?.personaId).toBe(personaId);
      expect(entity?.assignedAt).toBeInstanceOf(Date);
    });

    it('should emit PersonaAssignedToActorEventV1', async () => {
      const personaId = await commandBus.execute(
        new CreatePersonaCommand({ name: 'Event Persona' })
      );

      publishedEvents = [];

      await commandBus.execute(
        new AssignPersonaToActorCommand({
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId,
        })
      );

      expect(publishedEvents).toHaveLength(1);

      const event = publishedEvents[0] as PersonaAssignedToActorEventV1;

      expect(event).toBeInstanceOf(PersonaAssignedToActorEventV1);
      expect(event.actorId).toBe(testActorId);
      expect(event.workspaceId).toBe(testWorkspaceId);
      expect(event.personaId).toBe(personaId);
      expect(event.assignedAt).toBeInstanceOf(Date);
      expect(event.occurredAt).toBeInstanceOf(Date);
      expect(event.eventType).toBe('PersonaAssignedToActorEvent-V1');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.aggregateType).toBe('ActorPersonaAssignment');
      expect(event.aggregateId).toBe(testActorId);
      expect(event.eventId).toBeDefined();
    });

    it('should return assignment IDs on success', async () => {
      const personaId = await commandBus.execute(
        new CreatePersonaCommand({ name: 'Return Persona' })
      );

      publishedEvents = [];

      const result = await commandBus.execute(
        new AssignPersonaToActorCommand({
          actorId: testActorId,
          workspaceId: testWorkspaceId,
          personaId,
        })
      );

      expect(result).toEqual({
        actorId: testActorId,
        workspaceId: testWorkspaceId,
        personaId,
      });
    });
  });
});
