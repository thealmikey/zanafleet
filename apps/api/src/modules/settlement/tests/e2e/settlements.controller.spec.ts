import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';

import { CapabilityGuard } from '@api/core/api/guards';
import { SettlementsController } from '../../controllers/settlements.controller';
import { PayoutOrchestrator } from '../../coordinators/payout.orchestrator';
import { SettlementSchedulerService } from '../../services/settlement-scheduler.service';
import { PayoutMethod } from '../../dto/settlement.enums';

describe('SettlementsController (e2e)', () => {
  let app: INestApplication;
  let mockPayoutOrchestrator: {
    initiatePayout: jest.Mock;
    batchPayouts: jest.Mock;
    getPayoutStatus: jest.Mock;
    retryFailedPayout: jest.Mock;
  };
  let mockSettlementSchedulerService: {
    processWeeklySettlements: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  beforeEach(async () => {
    mockPayoutOrchestrator = {
      initiatePayout: jest.fn(),
      batchPayouts: jest.fn(),
      getPayoutStatus: jest.fn(),
      retryFailedPayout: jest.fn(),
    };
    mockSettlementSchedulerService = {
      processWeeklySettlements: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SettlementsController],
      providers: [
        Reflector,
        { provide: PayoutOrchestrator, useValue: mockPayoutOrchestrator },
        { provide: SettlementSchedulerService, useValue: mockSettlementSchedulerService },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'payout.approve'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: payout.approve');
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

  describe('POST /settlements/payouts', () => {
    it('should return 201 and call orchestrator.initiatePayout', async () => {
      const mockResult = {
        success: true,
        payoutId: 'payout-123',
        batchId: 'batch-456',
        status: 'COMPLETED',
        amount: 1000,
        currency: 'KES',
      };
      mockPayoutOrchestrator.initiatePayout.mockResolvedValue(mockResult);

      const dto = {
        riderAccountId: 'rider-account-123',
        payoutMethod: PayoutMethod.MOBILE_MONEY,
        correlationId: 'corr-123',
      };

      const response = await request(app.getHttpServer())
        .post('/settlements/payouts')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        payoutId: 'payout-123',
        batchId: 'batch-456',
      });
      expect(mockPayoutOrchestrator.initiatePayout).toHaveBeenCalledWith('rider-account-123', {
        payoutMethod: PayoutMethod.MOBILE_MONEY,
        providerId: undefined,
        correlationId: 'corr-123',
      });
    });

    it('should handle failed payout initiation', async () => {
      const mockResult = {
        success: false,
        payoutId: 'payout-123',
        status: 'FAILED',
        error: 'Insufficient balance',
      };
      mockPayoutOrchestrator.initiatePayout.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/settlements/payouts')
        .send({ riderAccountId: 'rider-account-123' })
        .expect(201);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Insufficient balance',
      });
    });
  });

  describe('POST /settlements/payouts/batch', () => {
    it('should return 201 and call orchestrator.batchPayouts', async () => {
      const mockResult = {
        totalRequested: 3,
        successful: 2,
        failed: 1,
        results: [
          { accountId: 'acc-1', success: true, payoutId: 'p1' },
          { accountId: 'acc-2', success: true, payoutId: 'p2' },
          { accountId: 'acc-3', success: false, error: 'KYC not verified' },
        ],
      };
      mockPayoutOrchestrator.batchPayouts.mockResolvedValue(mockResult);

      const dto = {
        accountIds: ['acc-1', 'acc-2', 'acc-3'],
        payoutMethod: PayoutMethod.BANK_TRANSFER,
      };

      const response = await request(app.getHttpServer())
        .post('/settlements/payouts/batch')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        totalRequested: 3,
        successful: 2,
        failed: 1,
      });
      expect(mockPayoutOrchestrator.batchPayouts).toHaveBeenCalledWith(
        ['acc-1', 'acc-2', 'acc-3'],
        {
          payoutMethod: PayoutMethod.BANK_TRANSFER,
          providerId: undefined,
          correlationId: undefined,
        }
      );
    });
  });

  describe('GET /settlements/payouts/:id', () => {
    it('should return 200 with payout status', async () => {
      const mockStatus = 'COMPLETED';
      mockPayoutOrchestrator.getPayoutStatus.mockResolvedValue(mockStatus);

      const response = await request(app.getHttpServer())
        .get('/settlements/payouts/payout-123')
        .expect(200);

      expect(response.body).toEqual({ status: 'COMPLETED' });
      expect(mockPayoutOrchestrator.getPayoutStatus).toHaveBeenCalledWith('payout-123');
    });

    it('should return 200 with PENDING status', async () => {
      mockPayoutOrchestrator.getPayoutStatus.mockResolvedValue('PENDING');

      const response = await request(app.getHttpServer())
        .get('/settlements/payouts/payout-456')
        .expect(200);

      expect(response.body).toEqual({ status: 'PENDING' });
    });
  });

  describe('POST /settlements/payouts/:id/retry', () => {
    it('should return 200 and call orchestrator.retryFailedPayout', async () => {
      const mockResult = {
        success: true,
        payoutId: 'payout-123',
        status: 'COMPLETED',
        retriesRemaining: 2,
      };
      mockPayoutOrchestrator.retryFailedPayout.mockResolvedValue(mockResult);

      const dto = {
        maxRetries: 3,
        baseDelayMs: 1000,
      };

      const response = await request(app.getHttpServer())
        .post('/settlements/payouts/payout-123/retry')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        payoutId: 'payout-123',
        status: 'COMPLETED',
      });
      expect(mockPayoutOrchestrator.retryFailedPayout).toHaveBeenCalledWith('payout-123', {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: undefined,
      });
    });

    it('should handle retry with empty body', async () => {
      const mockResult = {
        success: true,
        payoutId: 'payout-789',
        status: 'PROCESSING',
      };
      mockPayoutOrchestrator.retryFailedPayout.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/settlements/payouts/payout-789/retry')
        .send({})
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        payoutId: 'payout-789',
      });
      expect(mockPayoutOrchestrator.retryFailedPayout).toHaveBeenCalledWith('payout-789', {
        maxRetries: undefined,
        baseDelayMs: undefined,
        maxDelayMs: undefined,
      });
    });
  });

  describe('POST /settlements/schedule/run', () => {
    it('should return 200 with success: true and call processWeeklySettlements', async () => {
      mockSettlementSchedulerService.processWeeklySettlements.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/settlements/schedule/run')
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockSettlementSchedulerService.processWeeklySettlements).toHaveBeenCalled();
    });

    it('should propagate errors from scheduler service', async () => {
      mockSettlementSchedulerService.processWeeklySettlements.mockRejectedValue(
        new Error('Scheduler error')
      );

      await request(app.getHttpServer())
        .post('/settlements/schedule/run')
        .expect(500);

      expect(mockSettlementSchedulerService.processWeeklySettlements).toHaveBeenCalled();
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks payout.approve capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/settlements/payouts')
        .send({ riderAccountId: 'rider-123' })
        .expect(403);
    });

    it('should return 403 for batch payouts when lacking capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/settlements/payouts/batch')
        .send({ accountIds: ['acc-1'] })
        .expect(403);
    });

    it('should return 403 for schedule run when lacking capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/settlements/schedule/run')
        .expect(403);
    });

    it('should return 403 for get status when lacking capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .get('/settlements/payouts/payout-123')
        .expect(403);
    });

    it('should return 403 for retry when lacking capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/settlements/payouts/payout-123/retry')
        .send({})
        .expect(403);
    });
  });
});
