import { CapabilityGuard } from '@api/core/api/guards';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { PolicyEntity } from '../../../policy/entities/policy.entity';
import { SettlementBatchEntity } from '../../../settlement/entities/settlement-batch.entity';
import { AdminDashboardController } from '../../controllers/admin-dashboard.controller';

describe('AdminDashboardController (e2e)', () => {
  let app: INestApplication;
  let mockSettlementRepository: {
    findAndCount: jest.Mock;
    find: jest.Mock;
  };
  let mockPolicyRepository: {
    findAndCount: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  const createMockSettlement = (
    overrides: Partial<SettlementBatchEntity> = {}
  ): Partial<SettlementBatchEntity> => ({
    id: overrides.id ?? 'batch-123',
    riderAccountId: overrides.riderAccountId ?? 'rider-123',
    status: overrides.status ?? ('COMPLETED' as any),
    totalEarnings: overrides.totalEarnings ?? '1000.00',
    netPayout: overrides.netPayout ?? '900.00',
    currency: overrides.currency ?? 'KES',
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  });

  const createMockPolicy = (overrides: Partial<PolicyEntity> = {}): Partial<PolicyEntity> => ({
    id: overrides.id ?? 'policy-123',
    name: overrides.name ?? 'Test Policy',
    scope: overrides.scope ?? ('GLOBAL' as any),
    status: overrides.status ?? ('ACTIVE' as any),
    trigger: overrides.trigger ?? ('DELIVERY_CREATION' as any),
    priority: overrides.priority ?? 100,
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  });

  beforeEach(async () => {
    mockSettlementRepository = {
      findAndCount: jest.fn(),
      find: jest.fn(),
    };
    mockPolicyRepository = {
      findAndCount: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AdminDashboardController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(SettlementBatchEntity), useValue: mockSettlementRepository },
        { provide: getRepositoryToken(PolicyEntity), useValue: mockPolicyRepository },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'dashboard.admin.read'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: dashboard.admin.read');
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

  describe('GET /dashboards/admin/metrics', () => {
    it('should return 200 with system metrics', async () => {
      const mockSettlements = [
        createMockSettlement({ status: 'COMPLETED' as any }),
        createMockSettlement({ id: 'batch-2', status: 'PENDING' as any }),
        createMockSettlement({ id: 'batch-3', status: 'FAILED' as any }),
      ];
      mockSettlementRepository.findAndCount.mockResolvedValue([mockSettlements, 3]);
      mockPolicyRepository.findAndCount
        .mockResolvedValueOnce([[], 5])
        .mockResolvedValueOnce([[], 3]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/admin/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        totalSettlements: 3,
        pendingSettlements: 1,
        completedSettlements: 1,
        failedSettlements: 1,
        totalPolicies: 5,
        activePolicies: 3,
      });
      expect(response.headers['cache-control']).toContain('max-age=60');
    });

    it('should accept periodDays query parameter', async () => {
      mockSettlementRepository.findAndCount.mockResolvedValue([[], 0]);
      mockPolicyRepository.findAndCount.mockResolvedValue([[], 0]);

      await request(app.getHttpServer()).get('/dashboards/admin/metrics?periodDays=7').expect(200);

      expect(mockSettlementRepository.findAndCount).toHaveBeenCalled();
    });
  });

  describe('GET /dashboards/admin/settlements', () => {
    it('should return 200 with paginated settlements', async () => {
      const mockSettlements = [
        createMockSettlement({ id: 'batch-1' }),
        createMockSettlement({ id: 'batch-2' }),
      ];
      mockSettlementRepository.findAndCount.mockResolvedValue([mockSettlements, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/admin/settlements?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });

    it('should support sorting', async () => {
      mockSettlementRepository.findAndCount.mockResolvedValue([[], 0]);

      await request(app.getHttpServer())
        .get('/dashboards/admin/settlements?sort=-createdAt')
        .expect(200);

      expect(mockSettlementRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC' },
        })
      );
    });
  });

  describe('GET /dashboards/admin/policies', () => {
    it('should return 200 with paginated policies', async () => {
      const mockPolicies = [
        createMockPolicy({ id: 'policy-1' }),
        createMockPolicy({ id: 'policy-2' }),
      ];
      mockPolicyRepository.findAndCount.mockResolvedValue([mockPolicies, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/admin/policies?page=1&limit=10')
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
    it('should return 403 when user lacks dashboard.admin.read capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer()).get('/dashboards/admin/metrics').expect(403);
    });
  });
});
