import { CommandBus, CqrsModule, EventBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ActorType } from '../../../actor/dto/actor.enums';
import { ActorEntity } from '../../../actor/entities/actor.entity';
import { OrganizationStatus, OrganizationType } from '../../../organization/dto/organization.enums';
import { OrganizationEntity } from '../../../organization/entities/organization.entity';
import { ActorPersonaEntity } from '../../../persona/entities/actor-persona.entity';
import { PersonaEntity } from '../../../persona/entities/persona.entity';
import { WorkspaceStatus, WorkspaceType } from '../../../workspace/dto/workspace.enums';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { CreateRequirementCommand } from '../../commands/create-requirement.command';
import { EvaluateFormationCommand } from '../../commands/evaluate-formation.command';
import { SatisfyRequirementCommand } from '../../commands/satisfy-requirement.command';
import { FormationState, RequirementType } from '../../dto/formation.enums';
import { FormationStatusEntity } from '../../entities/formation-status.entity';
import { RequirementEntity } from '../../entities/requirement.entity';
import { CreateRequirementCommandHandler } from '../../handlers/create-requirement.handler';
import { EvaluateFormationCommandHandler } from '../../handlers/evaluate-formation.handler';
import { SatisfyRequirementCommandHandler } from '../../handlers/satisfy-requirement.handler';
import { FormationService } from '../../services/formation.service';

const describeIntegration = process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('Formation Module Integration', () => {
  let module!: TestingModule;
  let commandBus!: CommandBus;
  let eventBus!: EventBus;
  let formationService!: FormationService;
  let formationStatusRepository!: Repository<FormationStatusEntity>;
  let requirementRepository!: Repository<RequirementEntity>;
  let workspaceRepository!: Repository<WorkspaceEntity>;
  let organizationRepository!: Repository<OrganizationEntity>;
  let actorRepository!: Repository<ActorEntity>;
  let personaRepository!: Repository<PersonaEntity>;
  let actorPersonaRepository!: Repository<ActorPersonaEntity>;
  let dataSource!: DataSource;

  const entityType = 'Workspace';
  let moduleInitializationFailed = false;
  let publishedEvents: unknown[] = [];
  let publishSpy: jest.SpyInstance;
  let testOrgId!: string;

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
              FormationStatusEntity,
              RequirementEntity,
              WorkspaceEntity,
              OrganizationEntity,
              ActorEntity,
              PersonaEntity,
              ActorPersonaEntity,
            ],
            synchronize: true,
            dropSchema: true,
          }),
          TypeOrmModule.forFeature([
            FormationStatusEntity,
            RequirementEntity,
            WorkspaceEntity,
            OrganizationEntity,
            ActorEntity,
            PersonaEntity,
            ActorPersonaEntity,
          ]),
        ],
        providers: [
          FormationService,
          EvaluateFormationCommandHandler,
          CreateRequirementCommandHandler,
          SatisfyRequirementCommandHandler,
        ],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      eventBus = module.get<EventBus>(EventBus);
      formationService = module.get<FormationService>(FormationService);
      formationStatusRepository = module.get<Repository<FormationStatusEntity>>(
        getRepositoryToken(FormationStatusEntity)
      );
      requirementRepository = module.get<Repository<RequirementEntity>>(
        getRepositoryToken(RequirementEntity)
      );
      workspaceRepository = module.get<Repository<WorkspaceEntity>>(
        getRepositoryToken(WorkspaceEntity)
      );
      organizationRepository = module.get<Repository<OrganizationEntity>>(
        getRepositoryToken(OrganizationEntity)
      );
      actorRepository = module.get<Repository<ActorEntity>>(getRepositoryToken(ActorEntity));
      personaRepository = module.get<Repository<PersonaEntity>>(getRepositoryToken(PersonaEntity));
      actorPersonaRepository = module.get<Repository<ActorPersonaEntity>>(
        getRepositoryToken(ActorPersonaEntity)
      );
      dataSource = module.get<DataSource>(DataSource);

      commandBus.register([
        EvaluateFormationCommandHandler,
        CreateRequirementCommandHandler,
        SatisfyRequirementCommandHandler,
      ]);

      publishSpy = jest.spyOn(eventBus, 'publish');
      publishSpy.mockImplementation((event: unknown) => {
        publishedEvents.push(event);
      });
    } catch (error) {
      console.warn(
        'Failed to initialize Formation integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error)
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach(() => {
    if (moduleInitializationFailed) {
      throw new Error(
        'Formation integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d).'
      );
    }
  });

  beforeEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    publishedEvents = [];
    publishSpy.mockClear();
    publishSpy.mockImplementation((event: unknown) => {
      publishedEvents.push(event);
    });

    await actorPersonaRepository.delete({});
    await requirementRepository.delete({});
    await formationStatusRepository.delete({});
    await actorRepository.delete({});
    await personaRepository.delete({});
    await workspaceRepository.delete({});
    await organizationRepository.delete({});

    testOrgId = uuidv4();
    const organization = OrganizationEntity.fromDomain({
      organizationId: testOrgId,
      name: 'Formation Test Organization',
      type: OrganizationType.BUSINESS,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
      createdAt: new Date(),
    });

    await organizationRepository.save(organization);
  });

  afterAll(async () => {
    if (!moduleInitializationFailed) {
      await dataSource.destroy();
      await module.close();
    }
  });

  const createWorkspace = async (
    type: WorkspaceType,
    options: {
      status?: WorkspaceStatus;
      name?: string;
      roleTemplates?: string[];
    } = {}
  ): Promise<WorkspaceEntity> => {
    const workspaceId = uuidv4();
    const workspace = WorkspaceEntity.fromDomain({
      workspaceId,
      orgId: testOrgId,
      name: options.name ?? `Workspace-${workspaceId}`,
      type,
      status: options.status ?? WorkspaceStatus.ACTIVE,
      roleTemplates: options.roleTemplates ?? [],
      createdAt: new Date(),
    });

    await workspaceRepository.save(workspace);
    return workspace;
  };

  const createPersona = async (name: string): Promise<PersonaEntity> => {
    const persona = new PersonaEntity();
    persona.id = uuidv4();
    persona.name = name;
    persona.createdAt = new Date();
    persona.updatedAt = new Date();

    await personaRepository.save(persona);
    return persona;
  };

  const createActor = async (
    workspaceId: string,
    type: ActorType,
    roles: string[] = []
  ): Promise<ActorEntity> => {
    const actorId = uuidv4();
    const actor = ActorEntity.fromDomain({
      actorId,
      type,
      email: `actor-${actorId}@test.local`,
      username: `actor-${actorId}`,
      passwordHash: 'hashed-password-placeholder',
      location: null,
      roles,
      workspaceId,
      linkedWallets: [],
      createdAt: new Date(),
    });

    await actorRepository.save(actor);
    return actor;
  };

  describe('Partial Entity', () => {
    it('should have ACTIVE status when non-blocking requirements are missing', async () => {
      const workspace = await createWorkspace(WorkspaceType.BUSINESS);

      await formationService.initializeFormationStatus(
        entityType,
        workspace.id,
        FormationState.DRAFT
      );

      const requirementId = await commandBus.execute(
        new CreateRequirementCommand({
          entityType,
          entityId: workspace.id,
          type: RequirementType.FIELD,
          key: 'optional-profile-photo',
          description: 'Upload an optional profile photo',
          blocking: false,
        })
      );

      const result = await commandBus.execute(
        new EvaluateFormationCommand({
          entityType,
          entityId: workspace.id,
        })
      );

      expect(result.state).toBe(FormationState.ACTIVE);
      expect(result.unsatisfiedRequirements).toHaveLength(1);
      expect(result.unsatisfiedRequirements[0].requirementId).toBe(requirementId);
      expect(result.unsatisfiedRequirements[0].blocking).toBe(false);
      expect(result.unsatisfiedRequirements[0].satisfied).toBe(false);
    });
  });

  describe('Blocked Cyclic Dependency', () => {
    it('should have BLOCKED status when cyclic dependency exists', async () => {
      const workspaceA = await createWorkspace(WorkspaceType.BUSINESS, {
        name: 'Workspace A',
      });
      const workspaceB = await createWorkspace(WorkspaceType.BUSINESS, {
        name: 'Workspace B',
      });

      await formationService.initializeFormationStatus(
        entityType,
        workspaceA.id,
        FormationState.DRAFT
      );
      await formationService.initializeFormationStatus(
        entityType,
        workspaceB.id,
        FormationState.DRAFT
      );

      await commandBus.execute(
        new CreateRequirementCommand({
          entityType,
          entityId: workspaceA.id,
          type: RequirementType.RELATIONSHIP,
          key: 'workspace-a-requires-b',
          description: 'Workspace A requires Workspace B',
          blocking: true,
          targetEntityId: workspaceB.id,
        })
      );

      await commandBus.execute(
        new CreateRequirementCommand({
          entityType,
          entityId: workspaceB.id,
          type: RequirementType.RELATIONSHIP,
          key: 'workspace-b-requires-a',
          description: 'Workspace B requires Workspace A',
          blocking: true,
          targetEntityId: workspaceA.id,
        })
      );

      const evaluationA = await commandBus.execute(
        new EvaluateFormationCommand({
          entityType,
          entityId: workspaceA.id,
        })
      );

      const evaluationB = await commandBus.execute(
        new EvaluateFormationCommand({
          entityType,
          entityId: workspaceB.id,
        })
      );

      expect(evaluationA.state).toBe(FormationState.BLOCKED);
      expect(evaluationB.state).toBe(FormationState.BLOCKED);
    });
  });

  describe('Transition to Active', () => {
    it('should transition from PENDING to ACTIVE when blocking requirement is satisfied', async () => {
      const workspace = await createWorkspace(WorkspaceType.BUSINESS);

      await formationService.initializeFormationStatus(
        entityType,
        workspace.id,
        FormationState.DRAFT
      );

      const requirementId = await commandBus.execute(
        new CreateRequirementCommand({
          entityType,
          entityId: workspace.id,
          type: RequirementType.FIELD,
          key: 'business-registration',
          description: 'Provide business registration certificate',
          blocking: true,
        })
      );

      const initialEvaluation = await commandBus.execute(
        new EvaluateFormationCommand({
          entityType,
          entityId: workspace.id,
        })
      );

      expect(initialEvaluation.state).toBe(FormationState.PENDING);
      expect(initialEvaluation.unsatisfiedRequirements).toHaveLength(1);
      expect(initialEvaluation.unsatisfiedRequirements[0].requirementId).toBe(requirementId);

      await commandBus.execute(
        new SatisfyRequirementCommand({
          requirementId,
        })
      );

      const finalEvaluation = await commandBus.execute(
        new EvaluateFormationCommand({
          entityType,
          entityId: workspace.id,
        })
      );

      expect(finalEvaluation.state).toBe(FormationState.ACTIVE);
      expect(finalEvaluation.unsatisfiedRequirements).toHaveLength(0);
    });
  });

  describe('SACCO Created Without Riders is ACTIVE', () => {
    it('should be ACTIVE even with soft rider requirement', async () => {
      const workspace = await createWorkspace(WorkspaceType.SACCO, {
        status: WorkspaceStatus.ACTIVE,
      });

      await formationService.initializeFormationStatus(
        entityType,
        workspace.id,
        FormationState.DRAFT
      );

      const requirementId = await commandBus.execute(
        new CreateRequirementCommand({
          entityType,
          entityId: workspace.id,
          type: RequirementType.FIELD,
          key: 'rider-onboarding',
          description: 'Onboard riders to the SACCO',
          blocking: false,
        })
      );

      const evaluation = await commandBus.execute(
        new EvaluateFormationCommand({
          entityType,
          entityId: workspace.id,
        })
      );

      expect(evaluation.state).toBe(FormationState.ACTIVE);
      expect(evaluation.unsatisfiedRequirements).toHaveLength(1);
      expect(evaluation.unsatisfiedRequirements[0].requirementId).toBe(requirementId);
      expect(evaluation.unsatisfiedRequirements[0].blocking).toBe(false);
    });
  });

  describe('Bootstrap Admin Assigned', () => {
    it('should assign SaccoAdmin persona with bootstrap: true for SACCO workspace', async () => {
      const workspace = await createWorkspace(WorkspaceType.SACCO);

      const persona = await createPersona('SaccoAdmin');
      const actor = await createActor(workspace.id, ActorType.SaccoAdmin);

      const assignedAt = new Date();
      const actorPersona = ActorPersonaEntity.fromDomain({
        actorId: actor.id,
        workspaceId: workspace.id,
        personaId: persona.id,
        assignedAt,
        bootstrap: true,
      });

      await actorPersonaRepository.save(actorPersona);

      const persisted = await actorPersonaRepository.findOne({
        where: {
          actorId: actor.id,
          workspaceId: workspace.id,
          personaId: persona.id,
        },
      });

      expect(persisted).toBeDefined();
      expect(persisted?.bootstrap).toBe(true);
    });

    it('should assign BusinessOwner persona with bootstrap: true for BUSINESS workspace', async () => {
      const workspace = await createWorkspace(WorkspaceType.BUSINESS);

      const persona = await createPersona('BusinessOwner');
      const actor = await createActor(workspace.id, ActorType.BusinessOwner);

      const assignedAt = new Date();
      const actorPersona = ActorPersonaEntity.fromDomain({
        actorId: actor.id,
        workspaceId: workspace.id,
        personaId: persona.id,
        assignedAt,
        bootstrap: true,
      });

      await actorPersonaRepository.save(actorPersona);

      const persisted = await actorPersonaRepository.findOne({
        where: {
          actorId: actor.id,
          workspaceId: workspace.id,
          personaId: persona.id,
        },
      });

      expect(persisted).toBeDefined();
      expect(persisted?.bootstrap).toBe(true);
    });
  });
});
