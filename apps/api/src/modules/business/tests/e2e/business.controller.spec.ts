import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BusinessType } from '@zanafleet/contracts';
import request from 'supertest';


import { BusinessController } from '../../controllers/business.controller';
import { BusinessEntity } from '../../entities/business.entity';

describe('BusinessController (e2e)', () => {
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

  const createMockBusinessEntity = (overrides: Partial<BusinessEntity> = {}): BusinessEntity => {
    const entity = new BusinessEntity();
    entity.id = overrides.id ?? 'business-123';
    entity.businessName = overrides.businessName ?? 'Test Business';
    entity.phone = overrides.phone ?? '+254700000000';
    entity.location = overrides.location ?? {
      latitude: -1.2921,
      longitude: 36.8219,
      humanReadableName: 'Nairobi',
      administrativeArea: 'Nairobi County',
      country: 'Kenya',
    };
    entity.businessType = overrides.businessType ?? BusinessType.Retail;
    entity.email = overrides.email ?? null;
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
      controllers: [BusinessController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(BusinessEntity), useValue: mockRepository },
        { provide: CommandBus, useValue: mockCommandBus },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability('test-actor', 'business.manage');
          if (!result) {
            throw new ForbiddenException('Missing required capability: business.manage');
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

  describe('POST /businesses', () => {
    it('should return 201 and id when creating a business', async () => {
      mockCommandBus.execute.mockResolvedValue('new-business-id');

      const response = await request(app.getHttpServer())
        .post('/businesses')
        .send({
          businessName: 'New Business',
          phone: '+254711111111',
          businessType: BusinessType.Retail,
          location: {
            latitude: -1.2921,
            longitude: 36.8219,
            humanReadableName: 'Nairobi',
            administrativeArea: 'Nairobi County',
            country: 'Kenya',
          },
        })
        .expect(201);

      expect(response.body).toEqual({ id: 'new-business-id' });
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });
  });

  describe('GET /businesses/:id', () => {
    it('should return 200 with domain payload when business exists', async () => {
      const mockEntity = createMockBusinessEntity();
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const response = await request(app.getHttpServer())
        .get('/businesses/business-123')
        .expect(200);

      expect(response.body).toMatchObject({
        businessId: 'business-123',
        businessName: 'Test Business',
        phone: '+254700000000',
        businessType: BusinessType.Retail,
      });
    });

    it('should return 404 when business not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/businesses/non-existent')
        .expect(404);
    });
  });

  describe('GET /businesses', () => {
    it('should return 200 with data and meta respecting pagination', async () => {
      const mockEntities = [createMockBusinessEntity({ id: 'business-1' }), createMockBusinessEntity({ id: 'business-2' })];
      mockRepository.findAndCount.mockResolvedValue([mockEntities, 2]);

      const response = await request(app.getHttpServer())
        .get('/businesses?page=1&limit=10')
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
        .post('/businesses')
        .send({
          businessName: 'Test Business',
          phone: '+254700000000',
          businessType: BusinessType.Retail,
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
