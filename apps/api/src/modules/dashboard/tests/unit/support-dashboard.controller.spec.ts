import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';

import { CapabilityGuard } from '@api/core/api/guards';
import { SupportDashboardController } from '../../controllers/support-dashboard.controller';
import { DisputeEntity } from '../../../payment/entities/dispute.entity';
import { RefundEntity } from '../../../payment/entities/refund.entity';
import { PaymentIntentEntity } from '../../../payment/entities/payment-intent.entity';

describe('SupportDashboardController (e2e)', () => {
  let app: INestApplication;
  let mockDisputeRepository: {
    findAndCount: jest.Mock;
  };
  let mockRefundRepository: {
    findAndCount: jest.Mock;
  };
  let mockPaymentIntentRepository: {
    findAndCount: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  const createMockDispute = (overrides: Partial<DisputeEntity> = {}): Partial<DisputeEntity> => ({
    id: overrides.id ?? 'dispute-123',
    deliveryId: overrides.deliveryId ?? 'delivery-123',
    paymentIntentId: overrides.paymentIntentId ?? 'intent-123',
    status: overrides.status ?? ('OPEN' as any),
    reason: overrides.reason ?? ('DELIVERY_ISSUE' as any),
    disputedAmount: overrides.disputedAmount ?? '100.00',
    currency: overrides.currency ?? 'KES',
    escalatedAt: overrides.escalatedAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  });

  const createMockRefund = (overrides: Partial<RefundEntity> = {}): Partial<RefundEntity> => ({
    id: overrides.id ?? 'refund-123',
    paymentIntentId: overrides.paymentIntentId ?? 'intent-123',
    disputeId: overrides.disputeId ?? null,
    status: overrides.status ?? ('PENDING' as any),
    refundType: overrides.refundType ?? ('FULL' as any),
    refundAmount: overrides.refundAmount ?? '100.00',
    currency: overrides.currency ?? 'KES',
    requestedBy: overrides.requestedBy ?? 'actor-123',
    createdAt: overrides.createdAt ?? new Date('2024-01-01'),
  });

  const createMockPaymentIntent = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
    const id = (overrides.id as string) ?? 'intent-123';
    const payerAccountId = (overrides.payerAccountId as string) ?? 'payer-123';
    const payeeAccountId = (overrides.payeeAccountId as string) ?? 'payee-123';
    const amount = (overrides.amount as string) ?? '100.00';
    const currency = (overrides.currency as string) ?? 'KES';
    const status = (overrides.status as string) ?? 'SUCCEEDED';
    const flowType = (overrides.flowType as string) ?? 'IMMEDIATE';
    const createdAt = (overrides.createdAt as Date) ?? new Date('2024-01-01');
    const updatedAt = (overrides.updatedAt as Date) ?? new Date('2024-01-01');

    return {
      id,
      payerAccountId,
      payeeAccountId,
      amount,
      currency,
      status,
      flowType,
      createdAt,
      updatedAt,
      toDomain: () => ({
        paymentIntentId: id,
        payerAccountId,
        payeeAccountId,
        flowType,
        amount: parseFloat(amount),
        currency,
        status,
        paymentMethod: 'MOBILE_MONEY',
        providerId: 'noop',
        invoiceId: null,
        idempotencyKey: 'test-key',
        metadata: null,
        createdAt,
        updatedAt,
      }),
    };
  };

  beforeEach(async () => {
    mockDisputeRepository = { findAndCount: jest.fn() };
    mockRefundRepository = { findAndCount: jest.fn() };
    mockPaymentIntentRepository = { findAndCount: jest.fn() };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SupportDashboardController],
      providers: [
        Reflector,
        { provide: getRepositoryToken(DisputeEntity), useValue: mockDisputeRepository },
        { provide: getRepositoryToken(RefundEntity), useValue: mockRefundRepository },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockPaymentIntentRepository },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'dashboard.support.read'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: dashboard.support.read');
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

  describe('GET /dashboards/support/metrics', () => {
    it('should return 200 with support metrics', async () => {
      const mockDisputes = [
        createMockDispute({ status: 'OPEN' as any }),
        createMockDispute({ id: 'd2', status: 'ESCALATED' as any }),
        createMockDispute({ id: 'd3', status: 'RESOLVED' as any }),
      ];
      const mockRefunds = [
        createMockRefund({ status: 'PENDING' as any }),
        createMockRefund({ id: 'r2', status: 'COMPLETED' as any }),
      ];

      mockDisputeRepository.findAndCount.mockResolvedValue([mockDisputes, 3]);
      mockRefundRepository.findAndCount.mockResolvedValue([mockRefunds, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/support/metrics')
        .expect(200);

      expect(response.body).toMatchObject({
        totalDisputes: 3,
        openDisputes: 1,
        escalatedDisputes: 1,
        resolvedDisputes: 1,
        totalRefunds: 2,
        pendingRefunds: 1,
        completedRefunds: 1,
      });
    });
  });

  describe('GET /dashboards/support/disputes', () => {
    it('should return 200 with paginated disputes', async () => {
      const mockDisputes = [createMockDispute({ id: 'd1' }), createMockDispute({ id: 'd2' })];
      mockDisputeRepository.findAndCount.mockResolvedValue([mockDisputes, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/support/disputes?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('GET /dashboards/support/disputes/escalated', () => {
    it('should return 200 with escalated disputes only', async () => {
      const mockDisputes = [
        createMockDispute({ id: 'd1', status: 'ESCALATED' as any }),
      ];
      mockDisputeRepository.findAndCount.mockResolvedValue([mockDisputes, 1]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/support/disputes/escalated')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.headers['cache-control']).toContain('max-age=15');
    });
  });

  describe('GET /dashboards/support/refunds', () => {
    it('should return 200 with paginated refunds', async () => {
      const mockRefunds = [createMockRefund({ id: 'r1' }), createMockRefund({ id: 'r2' })];
      mockRefundRepository.findAndCount.mockResolvedValue([mockRefunds, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/support/refunds?page=1&limit=10')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: 2,
      });
    });
  });

  describe('GET /dashboards/support/payments/recent', () => {
    it('should return 200 with recent payment activity', async () => {
      const mockIntents = [
        createMockPaymentIntent({ id: 'i1' }),
        createMockPaymentIntent({ id: 'i2' }),
      ];
      mockPaymentIntentRepository.findAndCount.mockResolvedValue([mockIntents, 2]);

      const response = await request(app.getHttpServer())
        .get('/dashboards/support/payments/recent?page=1&limit=10')
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
    it('should return 403 when user lacks dashboard.support.read capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/dashboards/support/metrics')
        .expect(403);
    });
  });
});
