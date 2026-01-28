import { INestApplication } from '@nestjs/common';
import { CommandBus, CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { validate as uuidValidate } from 'uuid';

import { ActorEntity } from '../../../actor/entities/actor.entity';
import { MembershipEntity } from '../../../workspace/entities/membership.entity';
import { WorkspaceEntity } from '../../../workspace/entities/workspace.entity';
import { AddActorToWorkspaceCommandHandler } from '../../../workspace/handlers/add-actor-to-workspace.handler';
import { CreateWorkspaceCommandHandler } from '../../../workspace/handlers/create-workspace.handler';
import { OrganizationController } from '../../controllers/organization.controller';
import { OrganizationStatus, OrganizationType } from '../../dto/organization.enums';
import { OrganizationEntity } from '../../entities/organization.entity';
import { CreateOrganizationCommandHandler } from '../../handlers/create-organization.handler';
import { DeleteOrganizationCommandHandler } from '../../handlers/delete-organization.handler';
import { UpdateOrganizationCommandHandler } from '../../handlers/update-organization.handler';

const describeIntegration =
  process.env.RUN_INTEGRATION_TESTS === 'true' ? describe : describe.skip;

describeIntegration('OrganizationController (Integration)', () => {
  let moduleRef!: TestingModule;
  let app!: INestApplication;
  let organizationRepository!: Repository<OrganizationEntity>;
  let workspaceRepository!: Repository<WorkspaceEntity>;
  let membershipRepository!: Repository<MembershipEntity>;
  let actorRepository!: Repository<ActorEntity>;
  let moduleInitializationFailed = false;

  beforeAll(async () => {
    try {
      moduleRef = await Test.createTestingModule({
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
        controllers: [OrganizationController],
        providers: [
          CreateOrganizationCommandHandler,
          UpdateOrganizationCommandHandler,
          DeleteOrganizationCommandHandler,
          CreateWorkspaceCommandHandler,
          AddActorToWorkspaceCommandHandler,
        ],
      }).compile();

      app = moduleRef.createNestApplication();
      await app.init();

      organizationRepository = moduleRef.get<Repository<OrganizationEntity>>(
        getRepositoryToken(OrganizationEntity),
      );
      workspaceRepository = moduleRef.get<Repository<WorkspaceEntity>>(
        getRepositoryToken(WorkspaceEntity),
      );
      membershipRepository = moduleRef.get<Repository<MembershipEntity>>(
        getRepositoryToken(MembershipEntity),
      );
      actorRepository = moduleRef.get<Repository<ActorEntity>>(
        getRepositoryToken(ActorEntity),
      );

      const commandBus = moduleRef.get<CommandBus>(CommandBus);
      commandBus.register([
        CreateOrganizationCommandHandler,
        UpdateOrganizationCommandHandler,
        DeleteOrganizationCommandHandler,
        CreateWorkspaceCommandHandler,
        AddActorToWorkspaceCommandHandler,
      ]);
    } catch (error) {
      console.warn(
        'Failed to initialize OrganizationController integration test module (database may not be available):',
        error instanceof Error ? error.message : String(error),
      );
      moduleInitializationFailed = true;
    }
  });

  beforeEach(() => {
    if (moduleInitializationFailed) {
      throw new Error(
        'OrganizationController integration test module failed to initialize. Ensure Postgres is running (docker-compose -f docker-compose.test.yml up -d).',
      );
    }
  });

  afterEach(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    await membershipRepository.delete({});
    await workspaceRepository.delete({});
    await actorRepository.delete({});
    await organizationRepository.delete({});
  });

  afterAll(async () => {
    if (moduleInitializationFailed) {
      return;
    }

    await app.close();
    await moduleRef.close();
  });

  type CreateOrganizationRequestBody = {
    name: string;
    type: OrganizationType;
    status: OrganizationStatus;
    linkedWallets?: string[];
  };

  const postOrganization = (payload: CreateOrganizationRequestBody) => {
    return request(app.getHttpServer())
      .post('/organizations')
      .send({
        linkedWallets: [],
        ...payload,
      });
  };

  it('POST /organizations creates an organization and returns 201', async () => {
    const response = await postOrganization({
      name: 'Test Organization',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
    }).expect(201);

    expect(response.body).toHaveProperty('organizationId');
    expect(uuidValidate(response.body.organizationId)).toBe(true);
  });

  it('GET /organizations/:id returns the created organization', async () => {
    const createResponse = await postOrganization({
      name: 'Retrieve Organization',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
    }).expect(201);
    const { organizationId } = createResponse.body;

    const getResponse = await request(app.getHttpServer())
      .get(`/organizations/${organizationId}`)
      .expect(200);

    expect(getResponse.body).toMatchObject({
      organizationId,
      name: 'Retrieve Organization',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
    });
    expect(typeof getResponse.body.createdAt).toBe('string');
    expect(typeof getResponse.body.updatedAt).toBe('string');
  });

  it('PATCH /organizations/:id updates the organization', async () => {
    const createResponse = await postOrganization({
      name: 'Organization To Update',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
    }).expect(201);
    const { organizationId } = createResponse.body;

    const patchResponse = await request(app.getHttpServer())
      .patch(`/organizations/${organizationId}`)
      .send({ name: 'Updated Organization Name' })
      .expect(200);

    expect(patchResponse.body).toMatchObject({
      organizationId,
      name: 'Updated Organization Name',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
    });
  });

  it('DELETE /organizations/:id soft-deletes the organization', async () => {
    const createResponse = await postOrganization({
      name: 'Organization To Delete',
      type: OrganizationType.SACCO,
      status: OrganizationStatus.ACTIVE,
      linkedWallets: [],
    }).expect(201);
    const { organizationId } = createResponse.body;

    await request(app.getHttpServer())
      .delete(`/organizations/${organizationId}`)
      .send({})
      .expect(204);

    const getResponse = await request(app.getHttpServer())
      .get(`/organizations/${organizationId}`)
      .expect(200);

    expect(getResponse.body.status).toBe(OrganizationStatus.DELETED);
  });
});
