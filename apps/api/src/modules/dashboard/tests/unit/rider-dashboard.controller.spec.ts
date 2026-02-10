import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DeliveryStatus } from '@zanafleet/contracts';

import { CapabilityGuard } from '@api/core/api/guards';
import { RiderDashboardController } from '../../controllers/rider-dashboard.controller';
import { DeliveryEntity } from '../../../delivery/entities/delivery.entity';
import { SettlementBatchEntity } from '../../../settlement/entities/settlement-batch.entity';

describe('RiderDashboardController (e2e)', () => {
  let app: INestApplication;
  let mockDeliveryRepository: {
    findAndCount: jest.Mock;
    count: jest.Mock;
  };
  let mockSettlementRepository: {
    find: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  const createMockDelivery = (overrides: Partial<DeliveryEntity> = {}): Partial<DeliveryEntity> => ({
    id: overrides.id ?? 'delivery-123',
    businessId: overrides.businessId ?? 'business-123',
    assignedRiderId: overrides.assignedRiderId ?? 'rider-123',
    status: overrides.status ?? DeliveryStatus.Assigned,
    scheduledPickupTime: overrides.scheduledPickupTime ?? null,
    scheduledDropoffTime: overrides.scheduledDropoffTime ?? null,
    assignedAt: overrides.assignedAt ?? new Date('2024-01-15'),
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  });

  beforeEach(async () => {
    mockDeliveryRepository = {
      findAndCount: jest.fn(),
      count: jest.fn(),
    };
    mockSettlementRepository = {
      find: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RiderDashboardController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(DeliveryEntity), useValue: mockDeliveryRepository },
        { provide: getRepositoryToken(SettlementBatchEntity), useValue: mockSettlementRepository },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'dashboard.rider.read'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: dashboard.rider.read');
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

  describe('GET /dashboards/rider/:riderId/deliveries/active', () => {
    it('should return 200 with active deliveries for rider', async () => {
      const mockDeliveries = [
        createMockDelivery({ id: 'del-1', status: DeliveryStatus.Assigned }),
        createMockDelivery({ id: 'del-2', status: DeliveryStatus.InTransit }),
      ];
      mockDeliveryRepository.findAndCount.mockResolvedValue([mockDeliveries, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/rider/rider-123/deliveries/active?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
      expect(response.headers['cache-control']).toContain('max-age=15');
    });
  });

  describe('GET /dashboards/rider/:riderId/deliveries/history', () => {
    it('should return 200 with delivery history for rider', async () => {
      const mockDeliveries = [
        createMockDelivery({ id: 'del-1', status: DeliveryStatus.Delivered }),
        createMockDelivery({ id: 'del-2', status: DeliveryStatus.Cancelled }),
      ];
      mockDeliveryRepository.findAndCount.mockResolvedValue([mockDeliveries, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/rider/rider-123/deliveries/history?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });

    it('should support filtering by status', async () => {
      mockDeliveryRepository.findAndCount.mockResolvedValue([[], 0]);

      await request(app.getHttpServer())
        .get('/dashboards/rider/rider-123/deliveries/history?filter={"status":"Delivered"}')
        .expect(200);

      expect(mockDeliveryRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('GET /dashboards/rider/:riderId/earnings', () => {
    it('should return 200 with earnings summary', async () => {
      mockSettlementRepository.find.mockResolvedValue([
        { netPayout: '500.00', totalEarnings: '600.00', currency: 'KES', status: 'COMPLETED' },
        { netPayout: '300.00', totalEarnings: '400.00', currency: 'KES', status: 'PENDING' },
      ]);
      mockDeliveryRepository.count.mockResolvedValue(10);

      const response = await request(app.getHttpServer())
        .get('/dashboards/rider/rider-123/earnings?periodDays=30')
        .expect(200);

      expect(response.body).toMatchObject({
        totalEarnings: 1000,
        completedPayout: 500,
        pendingPayout: 300,
        currency: 'KES',
        deliveryCount: 10,
      });
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks dashboard.rider.read capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/dashboards/rider/rider-123/deliveries/active')
        .expect(403);
    });
  });
});
