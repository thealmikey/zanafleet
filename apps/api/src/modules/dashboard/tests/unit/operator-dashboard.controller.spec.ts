import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import request from 'supertest';

import { DeliveryEntity } from '../../../delivery/entities/delivery.entity';
import { GeoQueryCoordinator } from '../../../location-intelligence/coordinators/geo-query.coordinator';
import { OperatorDashboardController } from '../../controllers/operator-dashboard.controller';

describe('OperatorDashboardController (e2e)', () => {
  let app: INestApplication;
  let mockDeliveryRepository: {
    findAndCount: jest.Mock;
    findOne: jest.Mock;
  };
  let mockGeoQueryCoordinator: {
    findNearbyRiders: jest.Mock;
    calculateETA: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  const createMockDelivery = (
    overrides: Partial<DeliveryEntity> = {}
  ): Partial<DeliveryEntity> => ({
    id: overrides.id ?? 'delivery-123',
    businessId: overrides.businessId ?? 'business-123',
    status: overrides.status ?? DeliveryStatus.Requested,
    scheduledPickupTime: overrides.scheduledPickupTime ?? null,
    attemptCount: overrides.attemptCount ?? 0,
    createdAt: overrides.createdAt ?? new Date(Date.now() - 10 * 60 * 1000),
  });

  beforeEach(async () => {
    mockDeliveryRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
    };
    mockGeoQueryCoordinator = {
      findNearbyRiders: jest.fn(),
      calculateETA: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [OperatorDashboardController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(DeliveryEntity), useValue: mockDeliveryRepository },
        { provide: GeoQueryCoordinator, useValue: mockGeoQueryCoordinator },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'dashboard.operator.read'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: dashboard.operator.read');
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

  describe('GET /dashboards/operator/metrics', () => {
    it('should return 200 with operator metrics', async () => {
      const mockPending = [
        createMockDelivery({ status: DeliveryStatus.Requested }),
        createMockDelivery({ id: 'd2', status: DeliveryStatus.Requested }),
      ];
      mockDeliveryRepository.findAndCount
        .mockResolvedValueOnce([mockPending, 2])
        .mockResolvedValueOnce([[], 5]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/operator/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        pendingAssignments: 2,
        activeDeliveries: 5,
        availableRiders: 0,
      });
      expect(response.body.avgWaitTimeMinutes).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /dashboards/operator/assignment-queue', () => {
    it('should return 200 with paginated assignment queue', async () => {
      const mockDeliveries = [createMockDelivery({ id: 'd1' }), createMockDelivery({ id: 'd2' })];
      mockDeliveryRepository.findAndCount.mockResolvedValue([mockDeliveries, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/operator/assignment-queue?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('waitingMinutes');
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('GET /dashboards/operator/candidates', () => {
    it('should return 200 with nearby candidates', async () => {
      const mockCandidates = [
        { riderId: 'r1', distanceMeters: 500, score: 100, vehicleType: 'Bike' },
        { riderId: 'r2', distanceMeters: 800, score: 80, vehicleType: 'Car' },
      ];
      mockGeoQueryCoordinator.findNearbyRiders.mockResolvedValue(mockCandidates);

      const response = await request(app.getHttpServer())
        .get('/dashboards/operator/candidates?lat=-1.2921&lng=36.8219&radius=2000&limit=10')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        riderId: 'r1',
        distanceMeters: 500,
        score: 100,
      });
    });

    it('should return 400 when lat is missing', async () => {
      await request(app.getHttpServer())
        .get('/dashboards/operator/candidates?lng=36.8219')
        .expect(400);
    });

    it('should return 400 when lng is missing', async () => {
      await request(app.getHttpServer())
        .get('/dashboards/operator/candidates?lat=-1.2921')
        .expect(400);
    });
  });

  describe('GET /dashboards/operator/route-hint', () => {
    it('should return 200 with route hint', async () => {
      mockGeoQueryCoordinator.calculateETA.mockResolvedValue({
        durationSeconds: 600,
        distanceMeters: 2500,
        confidence: 'HIGH',
        calculatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(
          '/dashboards/operator/route-hint?originLat=-1.2921&originLng=36.8219&destLat=-1.3000&destLng=36.8300'
        )
        .expect(200);

      expect(response.body).toMatchObject({
        origin: { latitude: -1.2921, longitude: 36.8219 },
        destination: { latitude: -1.3, longitude: 36.83 },
        estimatedDurationSeconds: 600,
        estimatedDistanceMeters: 2500,
        confidence: 'HIGH',
      });
    });

    it('should return 400 when origin coordinates missing', async () => {
      await request(app.getHttpServer())
        .get('/dashboards/operator/route-hint?destLat=-1.3000&destLng=36.8300')
        .expect(400);
    });
  });

  describe('GET /dashboards/operator/deliveries/:deliveryId/candidates', () => {
    it('should return 200 with candidates for a specific delivery', async () => {
      mockDeliveryRepository.findOne.mockResolvedValue(createMockDelivery());
      mockGeoQueryCoordinator.findNearbyRiders.mockResolvedValue([
        { riderId: 'r1', distanceMeters: 500, score: 100 },
      ]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/operator/deliveries/delivery-123/candidates')
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('should return 400 when delivery not found', async () => {
      mockDeliveryRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/dashboards/operator/deliveries/non-existent/candidates')
        .expect(400);
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks dashboard.operator.read capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer()).get('/dashboards/operator/metrics').expect(403);
    });
  });
});
