import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { ActorController } from '../../controllers/actor.controller';
import { ActorType } from '../../dto/actor.enums';
import { ActorEntity } from '../../entities/actor.entity';

describe('ActorController (e2e)', () => {
  let app: INestApplication;
  let mockCommandBus: { execute: jest.Mock };
  let mockRepository: {
    findOne: jest.Mock;
    findAndCount: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  const createMockActorEntity = (overrides: Partial<ActorEntity> = {}): ActorEntity => {
    const entity = new ActorEntity();
    entity.id = overrides.id ?? 'actor-123';
    entity.email = overrides.email ?? 'test@example.com';
    entity.username = overrides.username ?? 'testuser';
    entity.type = overrides.type ?? ActorType.HUMAN;
    entity.workspaceId = overrides.workspaceId ?? null;
    entity.passwordHash = overrides.passwordHash ?? null;
    entity.location = overrides.location ?? null;
    entity.roles = overrides.roles ?? [];
    entity.linkedWallets = overrides.linkedWallets ?? [];
    entity.createdAt = overrides.createdAt ?? new Date('2024-01-01');
    entity.updatedAt = overrides.updatedAt ?? new Date('2024-01-01');
    return entity;
  };

  beforeEach(async () => {
    mockCommandBus = { execute: jest.fn() };
    mockRepository = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ActorController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(ActorEntity), useValue: mockRepository },
        { provide: CommandBus, useValue: mockCommandBus },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'actor.manage'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: actor.manage');
          }
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /actors', () => {
    it('should return 201 and id when creating an actor', async () => {
      mockCommandBus.execute.mockResolvedValue('new-actor-id');

      const response = await request(app.getHttpServer())
        .post('/actors')
        .send({
          email: 'new@example.com',
          username: 'newuser',
          type: ActorType.HUMAN,
        })
        .expect(201);

      expect(response.body).toEqual({ id: 'new-actor-id' });
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });
  });

  describe('GET /actors/:id', () => {
    it('should return 200 with domain payload when actor exists', async () => {
      const mockEntity = createMockActorEntity();
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const response = await request(app.getHttpServer()).get('/actors/actor-123').expect(200);

      expect(response.body).toMatchObject({
        actorId: 'actor-123',
        email: 'test@example.com',
        username: 'testuser',
        type: ActorType.HUMAN,
      });
    });

    it('should return 404 when actor not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/actors/non-existent').expect(404);
    });
  });

  describe('GET /actors', () => {
    it('should return 200 with data and meta respecting pagination', async () => {
      const mockEntities = [
        createMockActorEntity({ id: 'actor-1' }),
        createMockActorEntity({ id: 'actor-2' }),
      ];
      mockRepository.findAndCount.mockResolvedValue([mockEntities, 2]);

      const response = await request(app.getHttpServer())
        .get('/actors?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/actors')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          type: ActorType.HUMAN,
        })
        .expect(403);
    });
  });
});
