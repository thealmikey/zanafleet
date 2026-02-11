import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CommandBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { VehicleType } from '@zanafleet/contracts';
import request from 'supertest';


import { RiderController } from '../../controllers/rider.controller';
import { RiderEntity } from '../../entities/rider.entity';

describe('RiderController (e2e)', () => {
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

  const createMockRiderEntity = (overrides: Partial<RiderEntity> = {}): RiderEntity => {
    const entity = new RiderEntity();
    entity.id = overrides.id ?? 'rider-123';
    entity.fullName = overrides.fullName ?? 'Test Rider';
    entity.nationalId = overrides.nationalId ?? 'ID12345';
    entity.phone = overrides.phone ?? '+254700000000';
    entity.location = overrides.location ?? {
      latitude: -1.2921,
      longitude: 36.8219,
      humanReadableName: 'Nairobi',
      administrativeArea: 'Nairobi County',
      country: 'Kenya',
    };
    entity.vehicleType = overrides.vehicleType ?? VehicleType.Bike;
    entity.saccoId = overrides.saccoId ?? null;
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
      controllers: [RiderController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(RiderEntity), useValue: mockRepository },
        { provide: CommandBus, useValue: mockCommandBus },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability('test-actor', 'rider.manage');
          if (!result) {
            throw new ForbiddenException('Missing required capability: rider.manage');
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

  describe('POST /riders', () => {
    it('should return 201 and id when creating a rider', async () => {
      mockCommandBus.execute.mockResolvedValue('new-rider-id');

      const response = await request(app.getHttpServer())
        .post('/riders')
        .send({
          fullName: 'New Rider',
          nationalId: 'ID99999',
          phone: '+254711111111',
          vehicleType: VehicleType.Bike,
          location: {
            latitude: -1.2921,
            longitude: 36.8219,
            humanReadableName: 'Nairobi',
            administrativeArea: 'Nairobi County',
            country: 'Kenya',
          },
        })
        .expect(201);

      expect(response.body).toEqual({ id: 'new-rider-id' });
      expect(mockCommandBus.execute).toHaveBeenCalled();
    });
  });

  describe('GET /riders/:id', () => {
    it('should return 200 with domain payload when rider exists', async () => {
      const mockEntity = createMockRiderEntity();
      mockRepository.findOne.mockResolvedValue(mockEntity);

      const response = await request(app.getHttpServer())
        .get('/riders/rider-123')
        .expect(200);

      expect(response.body).toMatchObject({
        riderId: 'rider-123',
        fullName: 'Test Rider',
        phone: '+254700000000',
        vehicleType: VehicleType.Bike,
      });
    });

    it('should return 404 when rider not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/riders/non-existent')
        .expect(404);
    });
  });

  describe('GET /riders', () => {
    it('should return 200 with data and meta respecting pagination', async () => {
      const mockEntities = [createMockRiderEntity({ id: 'rider-1' }), createMockRiderEntity({ id: 'rider-2' })];
      mockRepository.findAndCount.mockResolvedValue([mockEntities, 2]);

      const response = await request(app.getHttpServer())
        .get('/riders?page=1&limit=10')
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
        .post('/riders')
        .send({
          fullName: 'Test Rider',
          nationalId: 'ID12345',
          phone: '+254700000000',
          vehicleType: VehicleType.Bike,
        })
        .expect(403);
    });
  });
});
