import { NotFoundException } from '@nestjs/common';
import { CommandBus, CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { OrganizationType, OrganizationStatus } from '../../../organization/dto/organization.enums';
import { OrganizationEntity } from '../../../organization/entities/organization.entity';
import { CreateWorkspaceCommand } from '../../commands/create-workspace.command';
import { WorkspaceType, WorkspaceStatus } from '../../dto/workspace.enums';
import { WorkspaceEntity } from '../../entities/workspace.entity';
import { WorkspaceCreatedEventV1 } from '../../events/workspace-created.event';
import { CreateWorkspaceCommandHandler } from '../../handlers/create-workspace.handler';

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('CreateWorkspaceCommand Integration', () => {
  let module!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let workspaceRepository!: Repository<WorkspaceEntity>;
  let organizationRepository!: Repository<OrganizationEntity>;
  let dataSource!: DataSource;

  let testOrgId!: string;
  const publishedEvents: unknown[] = [];
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
            entities: [WorkspaceEntity, OrganizationEntity],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([WorkspaceEntity, OrganizationEntity]),
        ],
        providers: [CreateWorkspaceCommandHandler],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      eventBus = module.get<EventBus>(EventBus);
      workspaceRepository = module.get<Repository<WorkspaceEntity>>(
        getRepositoryToken(WorkspaceEntity)
      );
      organizationRepository = module.get<Repository<OrganizationEntity>>(
        getRepositoryToken(OrganizationEntity)
      );
      dataSource = module.get<DataSource>(DataSource);

      commandBus.register([CreateWorkspaceCommandHandler]);

      jest.spyOn(eventBus, 'publish').mockImplementation((event) => {
        publishedEvents.push(event);
      });
    } catch (error) {
      console.warn(
        'Failed to initialize Workspace integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error)
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach((): void => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Workspace integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d).'
      );
    }
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await dataSource.destroy();
      await module.close();
    }
  });

  beforeEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    publishedEvents.length = 0;

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
  });

  afterEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    await workspaceRepository.delete({});
    await organizationRepository.delete({});
  });

  describe('organization validation', () => {
    it('should throw NotFoundException when organization does not exist', async () => {
      const nonExistentOrgId = uuidv4();
      const command = new CreateWorkspaceCommand({
        name: 'Test Workspace',
        orgId: nonExistentOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      await expect(commandBus.execute(command)).rejects.toThrow(NotFoundException);
      await expect(commandBus.execute(command)).rejects.toThrow(
        `Organization with ID '${nonExistentOrgId}' does not exist`
      );
    });

    it('should not emit event when organization does not exist', async () => {
      const nonExistentOrgId = uuidv4();
      const command = new CreateWorkspaceCommand({
        name: 'Test Workspace',
        orgId: nonExistentOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      try {
        await commandBus.execute(command);
      } catch {
        // Expected to throw
      }

      expect(publishedEvents).toHaveLength(0);
    });

    it('should not persist workspace when organization does not exist', async () => {
      const nonExistentOrgId = uuidv4();
      const command = new CreateWorkspaceCommand({
        name: 'Test Workspace',
        orgId: nonExistentOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      try {
        await commandBus.execute(command);
      } catch {
        // Expected to throw
      }

      const workspaces = await workspaceRepository.find();
      expect(workspaces).toHaveLength(0);
    });
  });

  describe('successful workspace creation', () => {
    it('should create workspace when organization exists', async () => {
      const command = new CreateWorkspaceCommand({
        name: 'My Workspace',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      const workspaceId = await commandBus.execute(command);

      expect(workspaceId).toBeDefined();
      expect(typeof workspaceId).toBe('string');
      expect(workspaceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should persist WorkspaceEntity in database', async () => {
      const command = new CreateWorkspaceCommand({
        name: 'Persisted Workspace',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: ['550e8400-e29b-41d4-a716-446655440001'],
      });

      const workspaceId = await commandBus.execute(command);

      const entity = await workspaceRepository.findOne({
        where: { id: workspaceId },
      });

      expect(entity).toBeDefined();
      expect(entity!.name).toBe('Persisted Workspace');
      expect(entity!.orgId).toBe(testOrgId);
      expect(entity!.roleTemplates).toEqual(['550e8400-e29b-41d4-a716-446655440001']);
      expect(entity!.status).toBe(WorkspaceStatus.ACTIVE);
      expect(entity!.createdAt).toBeInstanceOf(Date);
      expect(entity!.updatedAt).toBeInstanceOf(Date);
    });

    it('should persist workspace with empty roleTemplates', async () => {
      const command = new CreateWorkspaceCommand({
        name: 'Empty Templates Workspace',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      const workspaceId = await commandBus.execute(command);

      const entity = await workspaceRepository.findOne({
        where: { id: workspaceId },
      });

      expect(entity).toBeDefined();
      expect(entity!.roleTemplates).toEqual([]);
    });
  });

  describe('event emission', () => {
    it('should emit WorkspaceCreatedEventV1 on success', async () => {
      const command = new CreateWorkspaceCommand({
        name: 'Event Test Workspace',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      await commandBus.execute(command);

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toBeInstanceOf(WorkspaceCreatedEventV1);
    });

    it('should emit event with correct payload', async () => {
      const roleTemplates = ['660e8400-e29b-41d4-a716-446655440001'];
      const command = new CreateWorkspaceCommand({
        name: 'Payload Test Workspace',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates,
      });

      const workspaceId = await commandBus.execute(command);

      expect(publishedEvents).toHaveLength(1);
      const event = publishedEvents[0] as WorkspaceCreatedEventV1;

      expect(event.workspaceId).toBe(workspaceId);
      expect(event.name).toBe('Payload Test Workspace');
      expect(event.orgId).toBe(testOrgId);
      expect(event.roleTemplates).toEqual(roleTemplates);
      expect(event.eventType).toBe('WorkspaceCreatedEvent-V1');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.aggregateType).toBe('Workspace');
      expect(event.aggregateId).toBe(workspaceId);
      expect(event.eventId).toBeDefined();
      expect(event.createdAt).toBeInstanceOf(Date);
      expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('should emit event with immutable roleTemplates array', async () => {
      const command = new CreateWorkspaceCommand({
        name: 'Immutable Test',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: ['770e8400-e29b-41d4-a716-446655440001'],
      });

      await commandBus.execute(command);

      const event = publishedEvents[0] as WorkspaceCreatedEventV1;

      expect(Object.isFrozen(event.roleTemplates)).toBe(true);
    });
  });

  describe('multiple workspace creation', () => {
    it('should create multiple workspaces for same organization', async () => {
      const command1 = new CreateWorkspaceCommand({
        name: 'Workspace One',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });
      const command2 = new CreateWorkspaceCommand({
        name: 'Workspace Two',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      const id1 = await commandBus.execute(command1);
      const id2 = await commandBus.execute(command2);

      expect(id1).not.toBe(id2);

      const workspaces = await workspaceRepository.find({
        where: { orgId: testOrgId },
      });
      expect(workspaces).toHaveLength(2);
    });

    it('should emit separate events for each workspace', async () => {
      const command1 = new CreateWorkspaceCommand({
        name: 'Event Workspace One',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });
      const command2 = new CreateWorkspaceCommand({
        name: 'Event Workspace Two',
        orgId: testOrgId,
        type: WorkspaceType.BUSINESS,
        roleTemplates: [],
      });

      await commandBus.execute(command1);
      await commandBus.execute(command2);

      expect(publishedEvents).toHaveLength(2);

      const event1 = publishedEvents[0] as WorkspaceCreatedEventV1;
      const event2 = publishedEvents[1] as WorkspaceCreatedEventV1;

      expect(event1.eventId).not.toBe(event2.eventId);
      expect(event1.workspaceId).not.toBe(event2.workspaceId);
    });
  });
});
