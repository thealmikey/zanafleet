import { Test, TestingModule } from '@nestjs/testing';
import { CqrsModule, EventBus } from '@nestjs/cqrs';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { NotFoundException } from '@nestjs/common';

import { WorkspaceController } from '../../controllers/workspace.controller';
import { WorkspaceEntity } from '../../entities/workspace.entity';
import { WorkspaceType, WorkspaceStatus } from '../../dto/workspace.enums';
import { CreateWorkspaceDto } from '../../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../../dto/update-workspace.dto';
import { WorkspaceCreatedEventV1 } from '../../events/workspace-created.event';
import { WorkspaceUpdatedEventV1 } from '../../events/workspace-updated.event';
import { CreateWorkspaceCommandHandler } from '../../handlers/create-workspace.handler';
import { UpdateWorkspaceCommandHandler } from '../../handlers/update-workspace.handler';
import { OrganizationEntity } from '../../../organization/entities/organization.entity';
import { OrganizationType, OrganizationStatus } from '../../../organization/dto/organization.enums';
import { EventBusService } from '../../../../core/event-bus';

/**
 * Integration test for Workspace CRUD operations via WorkspaceController.
 * Verifies persistence in PostgreSQL and event emission.
 */

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('WorkspaceController (Integration)', () => {
  let module: TestingModule;
  let controller: WorkspaceController;
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
          entities: [WorkspaceEntity, OrganizationEntity],
          synchronize: true, // Only for integration tests
          logging: false,
        }),
        TypeOrmModule.forFeature([WorkspaceEntity, OrganizationEntity]),
      ],
      controllers: [WorkspaceController],
      providers: [
        CreateWorkspaceCommandHandler,
        UpdateWorkspaceCommandHandler,
        {
          provide: EventBusService,
          useValue: {
            publish: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<WorkspaceController>(WorkspaceController);
    workspaceRepository = module.get<Repository<WorkspaceEntity>>(getRepositoryToken(WorkspaceEntity));
    organizationRepository = module.get<Repository<OrganizationEntity>>(getRepositoryToken(OrganizationEntity));
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
    // Clear tables in correct order to respect foreign keys (none yet, but good practice)
    await workspaceRepository.delete({});
    await organizationRepository.delete({});
    jest.clearAllMocks();
  });

  /**
   * Helper to create prerequisite Organization
   */
  async function createPrerequisiteOrganization(): Promise<string> {
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
    return orgId;
  }

  describe('CRUD Operations', () => {
    it('should create, find, and update a workspace successfully', async () => {
      const orgId = await createPrerequisiteOrganization();
      const roleTemplates = [uuidv4()];

      // 1. Create Workspace via Controller
      const createDto: CreateWorkspaceDto = {
        name: 'New Integration Workspace',
        orgId,
        type: WorkspaceType.BUSINESS,
        status: WorkspaceStatus.ACTIVE,
        roleTemplates,
      };

      const eventSpy = jest.spyOn(eventBus, 'publish');

      const createResult = await controller.create(createDto);
      const { workspaceId } = createResult;

      expect(workspaceId).toBeDefined();

      // Verify persistence after create
      const persistedAfterCreate = await workspaceRepository.findOne({ where: { id: workspaceId } });
      expect(persistedAfterCreate).toBeDefined();
      expect(persistedAfterCreate?.name).toBe(createDto.name);
      expect(persistedAfterCreate?.orgId).toBe(orgId);
      expect(persistedAfterCreate?.type).toBe(WorkspaceType.BUSINESS);
      expect(persistedAfterCreate?.status).toBe(WorkspaceStatus.ACTIVE);
      expect(persistedAfterCreate?.roleTemplates).toEqual(roleTemplates);
      
      // Verify event emission for creation (internal CQRS bus)
      expect(eventSpy).toHaveBeenCalledWith(expect.any(WorkspaceCreatedEventV1));

      // 2. Read Workspace (findOne) via Controller
      const readResult = await controller.findOne(workspaceId);
      expect(readResult.workspaceId).toBe(workspaceId);
      expect(readResult.name).toBe(createDto.name);
      expect(readResult.orgId).toBe(orgId);
      expect(readResult.type).toBe(WorkspaceType.BUSINESS);

      // 3. Update Workspace via Controller
      const updatedName = 'Updated Workspace Name';
      const updatedRoleTemplates = [uuidv4(), uuidv4()];
      const updateDto: UpdateWorkspaceDto = {
        name: updatedName,
        roleTemplates: updatedRoleTemplates,
      };

      const updateResult = await controller.update(workspaceId, updateDto);
      expect(updateResult.workspaceId).toBe(workspaceId);
      expect(updateResult.name).toBe(updatedName);

      // Verify persistence after update
      const persistedAfterUpdate = await workspaceRepository.findOne({ where: { id: workspaceId } });
      expect(persistedAfterUpdate?.name).toBe(updatedName);
      expect(persistedAfterUpdate?.roleTemplates).toEqual(updatedRoleTemplates);

      // Verify event emission for update (internal CQRS bus)
      expect(eventSpy).toHaveBeenCalledWith(expect.any(WorkspaceUpdatedEventV1));
    });

    it('should throw NotFoundException when finding a non-existent workspace', async () => {
      const nonExistentId = uuidv4();
      await expect(controller.findOne(nonExistentId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when updating a non-existent workspace', async () => {
      const nonExistentId = uuidv4();
      await expect(controller.update(nonExistentId, { name: 'New Name' })).rejects.toThrow(NotFoundException);
    });
  });
});
