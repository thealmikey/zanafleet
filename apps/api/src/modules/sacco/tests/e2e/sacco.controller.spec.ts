import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandBus } from '@nestjs/cqrs';
import request from 'supertest';

import { CapabilityGuard } from '@api/core/api/guards';
import { SaccoController } from '../../controllers/sacco.controller';
import { SaccoEntity } from '../../entities/sacco.entity';

describe('SaccoController (e2e)', () => {
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

  const createMockSaccoEntity = (overrides: Partial<SaccoEntity> = {}): SaccoEntity => {
    const entity = new SaccoEntity();
    entity.id = overrides.id ?? 'sacco-123';
    entity.name = overrides.name ?? 'Test Sacco';
    entity.contactPhone = overrides.contactPhone ?? '+254700000000';
    entity.location = overrides.location ?? {
      latitude: -1.2921,
      longitude: 36.8219,
      humanReadableName: 'Nairobi',
      administrativeArea: 'Nairobi County',
      country: 'Kenya',
    };
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
      controllers: [SaccoController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(SaccoEntity), useValue: mockRepository },
        { provide: CommandBus, useValue: mockCommandBus },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability('test-actor', 'sacco.manage');
          if (!result) {
            throw new ForbiddenException('Missing required capability: sacco.manage');
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

  describe('POST /saccos', () => {
    it('should return 201 and id when creating a sacco', async () => {
      mockCommandBus.execute.mockResolvedValue('new-sacco-id');

      const response = await request(app.getHttpServer())
        .post('/saccos')
        .send({
          name: 'New Sacco',
          contactPhone: '+254711111111',
          location: {
            latitude: -1.2921,
            longitude: 36.8219,
            humanReadableName: 'Nairobi',
            administrativeArea: 'Nairobi County',
            country: 'Kenya',
          },
        })
        .expect(201);

      expect(response.body).toEqual({ id: 'new-sacco-id' });
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });
  });

  describe('GET /saccos/:id', () => {
    it('should return 200 with domain payload when sacco exists', async () => {
      const mockEntity = createMockSaccoEntity();
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const response = await request(app.getHttpServer())
        .get('/saccos/sacco-123')
        .expect(200);

      expect(response.body).toMatchObject({
        saccoId: 'sacco-123',
        name: 'Test Sacco',
        contactPhone: '+254700000000',
      });
    });

    it('should return 404 when sacco not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/saccos/non-existent')
        .expect(404);
    });
  });

  describe('GET /saccos', () => {
    it('should return 200 with data and meta respecting pagination', async () => {
      const mockEntities = [createMockSaccoEntity({ id: 'sacco-1' }), createMockSaccoEntity({ id: 'sacco-2' })];
      mockRepository.findAndCount.mockResolvedValue([mockEntities, 2]);

      const response = await request(app.getHttpServer())
        .get('/saccos?page=1&limit=10')
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
        .post('/saccos')
        .send({
          name: 'Test Sacco',
          contactPhone: '+254700000000',
          location: {
            latitude: -1.2921,
            longitude: 36.8219,
            humanReadableName: 'Nairobi',
            administrativeArea: 'Nairobi County',
            country: 'Kenya',
          },
        })
        .expect(403);
    });
  });
});
