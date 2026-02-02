import { NotFoundException } from '@nestjs/common';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { EventBusService } from '../../../../core/event-bus';
import { OrganizationType, OrganizationStatus } from '../../../organization/dto/organization.enums';
import { OrganizationEntity } from '../../../organization/entities/organization.entity';
import { WorkspaceType, WorkspaceStatus } from '../../../workspace/dto/workspace.enums';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { ActorController } from '../../controllers/actor.controller';
import { ActorType } from '../../dto/actor.enums';
import { CreateActorDto } from '../../dto/create-actor.dto';
import { UpdateActorDto } from '../../dto/update-actor.dto';
import { ActorEntity } from '../../entities/actor.entity';
import { ActorOnboardedEventV1 } from '../../events/actor-onboarded.event';
import { ActorUpdatedEventV1 } from '../../events/actor-updated.event';
import { CreateActorCommandHandler } from '../../handlers/create-actor.handler';
import { UpdateActorCommandHandler } from '../../handlers/update-actor.handler';

/**
 * Integration test for Actor CRUD operations via ActorController.
 * Verifies persistence in PostgreSQL and event emission.
 */

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('ActorController (Integration)', () => {
  let module: TestingModule;
  let controller: ActorController;
  let actorRepository: Repository<ActorEntity>;
  let workspaceRepository: Repository<WorkspaceEntity>;
  let organizationRepository: Repository<OrganizationEntity>;
  let eventBus: EventBus;
  let dataSource: DataSource;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CqrsModule,
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'zanafleet_test',
          entities: [ActorEntity, WorkspaceEntity, OrganizationEntity],
          synchronize: true, // Only for integration tests
          logging: false,
        }),
        TypeOrmModule.forFeature([ActorEntity, WorkspaceEntity, OrganizationEntity]),
      ],
      controllers: [ActorController],
      providers: [
        CreateActorCommandHandler,
        UpdateActorCommandHandler,
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<ActorController>(ActorController);
    actorRepository = module.get<Repository<ActorEntity>>(getRepositoryToken(ActorEntity));
    workspaceRepository = module.get<Repository<WorkspaceEntity>>(
      getRepositoryToken(WorkspaceEntity)
    );
    organizationRepository = module.get<Repository<OrganizationEntity>>(
      getRepositoryToken(OrganizationEntity)
    );
    eventBus = module.get<EventBus>(EventBus);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    if (dataSource) {
      await dataSource.destroy();
    }
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    // Clear tables in correct order to respect foreign keys
    await actorRepository.delete({});
    await workspaceRepository.delete({});
    await organizationRepository.delete({});
    jest.clearAllMocks();
  });

  /**
   * Helper to create prerequisite Organization and Workspace
   */
  async function createPrerequisites(): Promise<{ orgId: string; workspaceId: string }> {
    const orgId = uuidv4();
    const org = OrganizationEntity.fromDomain({
      organizationId: orgId,
      name: 'Integration Test Org',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
      createdAt: new Date(),
    });
    await organizationRepository.save(org);

    const workspaceId = uuidv4();
    const workspace = WorkspaceEntity.fromDomain({
      workspaceId,
      orgId,
      name: 'Integration Test Workspace',
      type: WorkspaceType.BUSINESS,
      status: WorkspaceStatus.ACTIVE,
      roleTemplates: [],
      createdAt: new Date(),
    });
    await workspaceRepository.save(workspace);

    return { orgId, workspaceId };
  }

  describe('CRUD Operations', () => {
    it('should create, find, and update an actor successfully', async () => {
      const { workspaceId } = await createPrerequisites();
      const roles = [uuidv4()];
      const linkedWallets = [uuidv4()];

      // 1. Create Actor via Controller
      const createDto: CreateActorDto = {
        type: ActorType.Rider,
        email: 'test-actor@example.com',
        username: 'test-actor-user',
        password: 'plaintext-password-for-test',
        workspaceId,
        roles,
        linkedWallets,
      };

      const eventSpy = jest.spyOn(eventBus, 'publish');

      const createResult = await controller.create(createDto);
      const { actorId } = createResult;

      expect(actorId).toBeDefined();

      // Verify persistence after create
      const persistedAfterCreate = await actorRepository.findOne({ where: { id: actorId } });
      expect(persistedAfterCreate).toBeDefined();
      expect(persistedAfterCreate?.type).toBe(ActorType.Rider);
      expect(persistedAfterCreate?.workspaceId).toBe(workspaceId);
      expect(persistedAfterCreate?.roles).toEqual(roles);
      expect(persistedAfterCreate?.linkedWallets).toEqual(linkedWallets);

      // Verify event emission for creation (internal CQRS bus)
      expect(eventSpy).toHaveBeenCalledWith(expect.any(ActorOnboardedEventV1));

      // 2. Read Actor (findOne) via Controller
      const readResult = await controller.findOne(actorId);
      expect(readResult.actorId).toBe(actorId);
      expect(readResult.type).toBe(ActorType.Rider);
      expect(readResult.workspaceId).toBe(workspaceId);
      expect(readResult.roles).toEqual(roles);

      // 3. Update Actor via Controller
      const updatedRoles = [uuidv4(), uuidv4()];
      const updatedWallets = [uuidv4()];
      const updateDto: UpdateActorDto = {
        roles: updatedRoles,
        linkedWallets: updatedWallets,
      };

      const updateResult = await controller.update(actorId, updateDto);
      expect(updateResult.actorId).toBe(actorId);
      expect(updateResult.roles).toEqual(updatedRoles);
      expect(updateResult.linkedWallets).toEqual(updatedWallets);

      // Verify persistence after update
      const persistedAfterUpdate = await actorRepository.findOne({ where: { id: actorId } });
      expect(persistedAfterUpdate?.roles).toEqual(updatedRoles);
      expect(persistedAfterUpdate?.linkedWallets).toEqual(updatedWallets);

      // Verify event emission for update (internal CQRS bus)
      expect(eventSpy).toHaveBeenCalledWith(expect.any(ActorUpdatedEventV1));
    });

    it('should throw NotFoundException when finding a non-existent actor', async () => {
      const nonExistentId = uuidv4();
      await expect(controller.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when updating a non-existent actor', async () => {
      const nonExistentId = uuidv4();
      await expect(controller.update(nonExistentId, { roles: [uuidv4()] })).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
