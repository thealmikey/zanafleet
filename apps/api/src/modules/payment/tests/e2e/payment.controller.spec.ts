import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';

import { CapabilityGuard, PolicyGuard } from '@api/core/api/guards';
import { PaymentController } from '../../controllers/payment.controller';
import { PaymentFlowOrchestrator } from '../../coordinators/payment-flow.orchestrator';
import { RefundDisputeCoordinator } from '../../coordinators/refund-dispute.coordinator';
import {
  PaymentMethod,
  PaymentFlowType,
  PaymentIntentStatus,
  DisputeReason,
  DisputeResolutionType,
  DisputeStatus,
  RefundStatus,
} from '../../dto/payment.enums';

describe('PaymentController (e2e)', () => {
  let app: INestApplication;
  let mockPaymentFlowOrchestrator: {
    initiatePayment: jest.Mock;
    capturePayment: jest.Mock;
  };
  let mockRefundDisputeCoordinator: {
    processRefund: jest.Mock;
    openDispute: jest.Mock;
    resolveDispute: jest.Mock;
    escalateDispute: jest.Mock;
  };
  let mockCapabilityAccessController: { hasCapability: jest.Mock };

  beforeEach(async () => {
    mockPaymentFlowOrchestrator = {
      initiatePayment: jest.fn(),
      capturePayment: jest.fn(),
    };
    mockRefundDisputeCoordinator = {
      processRefund: jest.fn(),
      openDispute: jest.fn(),
      resolveDispute: jest.fn(),
      escalateDispute: jest.fn(),
    };
    mockCapabilityAccessController = { hasCapability: jest.fn().mockResolvedValue(true) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        Reflector,
        { provide: PaymentFlowOrchestrator, useValue: mockPaymentFlowOrchestrator },
        { provide: RefundDisputeCoordinator, useValue: mockRefundDisputeCoordinator },
      ],
    })
      .overrideGuard(CapabilityGuard)
      .useValue({
        canActivate: async (): Promise<boolean> => {
          const result = await mockCapabilityAccessController.hasCapability(
            'test-actor',
            'payment.manage'
          );
          if (!result) {
            throw new ForbiddenException('Missing required capability: payment.manage');
          }
          return true;
        },
      })
      .overrideGuard(PolicyGuard({ trigger: 'REVENUE_DISTRIBUTION' as any }))
      .useValue({
        canActivate: (): boolean => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, _res: any, next: () => void) => {
      req.user = { actorId: 'actor-123', workspaceId: 'workspace-456' };
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /payments/intents', () => {
    it('should return 201 and call orchestrator.initiatePayment with body', async () => {
      const mockResult = {
        success: true,
        intentId: 'intent-123',
        transactionId: 'txn-456',
        status: PaymentIntentStatus.SUCCEEDED,
        providerReference: 'ref-789',
        providerId: 'noop',
      };
      mockPaymentFlowOrchestrator.initiatePayment.mockResolvedValue(mockResult);

      const dto = {
        payerAccountId: 'payer-123',
        payeeAccountId: 'payee-456',
        amount: 100.5,
        currency: 'KES',
        paymentMethod: PaymentMethod.MOBILE_MONEY,
        flowType: 'IMMEDIATE' as PaymentFlowType,
      };

      const response = await request(app.getHttpServer())
        .post('/payments/intents')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        intentId: 'intent-123',
        transactionId: 'txn-456',
        status: PaymentIntentStatus.SUCCEEDED,
      });
      expect(mockPaymentFlowOrchestrator.initiatePayment).toHaveBeenCalledWith(
        expect.objectContaining({
          payerAccountId: 'payer-123',
          payeeAccountId: 'payee-456',
          amount: 100.5,
          currency: 'KES',
          paymentMethod: PaymentMethod.MOBILE_MONEY,
          flowType: 'IMMEDIATE',
        })
      );
    });
  });

  describe('POST /payments/intents/:id/capture', () => {
    it('should return 200 and call orchestrator.capturePayment with id', async () => {
      const mockResult = {
        success: true,
        transactionId: 'txn-456',
        status: 'SUCCEEDED',
        capturedAt: new Date(),
      };
      mockPaymentFlowOrchestrator.capturePayment.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/payments/intents/txn-456/capture')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        transactionId: 'txn-456',
      });
      expect(mockPaymentFlowOrchestrator.capturePayment).toHaveBeenCalledWith('txn-456');
    });
  });

  describe('POST /payments/refunds', () => {
    it('should return 200 when refund completes immediately', async () => {
      const mockResult = {
        success: true,
        refundId: 'r1',
        status: RefundStatus.COMPLETED,
      };
      mockRefundDisputeCoordinator.processRefund.mockResolvedValue(mockResult);

      const dto = {
        paymentIntentId: 'intent-123',
        refundAmount: 50,
        reason: 'CUSTOMER_REQUEST' as DisputeReason,
        requestedBy: 'actor-123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/refunds')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        refundId: 'r1',
        status: RefundStatus.COMPLETED,
      });
      expect(mockRefundDisputeCoordinator.processRefund).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentIntentId: 'intent-123',
          refundAmount: 50,
          reason: 'CUSTOMER_REQUEST',
          requestedBy: 'actor-123',
        })
      );
    });

    it('should return 200 when refund requires approval', async () => {
      const mockResult = {
        success: true,
        refundId: 'r2',
        status: RefundStatus.PENDING,
        requiresApproval: true,
      };
      mockRefundDisputeCoordinator.processRefund.mockResolvedValue(mockResult);

      const dto = {
        paymentIntentId: 'intent-456',
        refundAmount: 1000,
        reason: 'DAMAGED_GOODS' as DisputeReason,
        requestedBy: 'actor-456',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/refunds')
        .send(dto)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        refundId: 'r2',
        status: RefundStatus.PENDING,
        requiresApproval: true,
      });
    });
  });

  describe('POST /payments/disputes', () => {
    it('should return 201 and call openDispute', async () => {
      const mockResult = {
        success: true,
        disputeId: 'dispute-123',
        status: DisputeStatus.OPEN,
      };
      mockRefundDisputeCoordinator.openDispute.mockResolvedValue(mockResult);

      const dto = {
        deliveryId: 'delivery-789',
        paymentIntentId: 'intent-123',
        reason: 'DELIVERY_ISSUE' as DisputeReason,
        description: 'Package was damaged',
        disputedAmount: 75,
        currency: 'KES',
        openedBy: 'customer-123',
      };

      const response = await request(app.getHttpServer())
        .post('/payments/disputes')
        .send(dto)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        disputeId: 'dispute-123',
        status: DisputeStatus.OPEN,
      });
      expect(mockRefundDisputeCoordinator.openDispute).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: 'delivery-789',
          paymentIntentId: 'intent-123',
          reason: 'DELIVERY_ISSUE',
          disputedAmount: 75,
          currency: 'KES',
          openedBy: 'customer-123',
        })
      );
    });
  });

  describe('PATCH /payments/disputes/:id', () => {
    it('should return 200 and call resolveDispute when action is resolve', async () => {
      mockRefundDisputeCoordinator.resolveDispute.mockResolvedValue(undefined);

      const dto = {
        action: 'resolve',
        resolutionType: DisputeResolutionType.FULL_REFUND,
        resolutionNotes: 'Customer refunded in full',
        resolvedBy: 'support-agent-1',
        refundAmount: 100,
      };

      const response = await request(app.getHttpServer())
        .patch('/payments/disputes/dispute-123')
        .send(dto)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockRefundDisputeCoordinator.resolveDispute).toHaveBeenCalledWith('dispute-123', {
        resolutionType: DisputeResolutionType.FULL_REFUND,
        resolutionNotes: 'Customer refunded in full',
        resolvedBy: 'support-agent-1',
        refundAmount: 100,
      });
    });

    it('should return 200 and call escalateDispute when action is escalate', async () => {
      mockRefundDisputeCoordinator.escalateDispute.mockResolvedValue(undefined);

      const dto = {
        action: 'escalate',
        escalateReason: 'Customer threatening legal action',
      };

      const response = await request(app.getHttpServer())
        .patch('/payments/disputes/dispute-456')
        .send(dto)
        .expect(200);

      expect(response.body).toEqual({ success: true });
      expect(mockRefundDisputeCoordinator.escalateDispute).toHaveBeenCalledWith(
        'dispute-456',
        'Customer threatening legal action'
      );
    });

    it('should return 400 when resolve action is missing resolutionType', async () => {
      const dto = {
        action: 'resolve',
        resolvedBy: 'support-agent-1',
      };

      await request(app.getHttpServer())
        .patch('/payments/disputes/dispute-123')
        .send(dto)
        .expect(400);
    });

    it('should return 400 when resolve action is missing resolvedBy', async () => {
      const dto = {
        action: 'resolve',
        resolutionType: DisputeResolutionType.NO_REFUND,
      };

      await request(app.getHttpServer())
        .patch('/payments/disputes/dispute-123')
        .send(dto)
        .expect(400);
    });

    it('should return 400 when escalate action is missing escalateReason', async () => {
      const dto = {
        action: 'escalate',
      };

      await request(app.getHttpServer())
        .patch('/payments/disputes/dispute-123')
        .send(dto)
        .expect(400);
    });
  });

  describe('RBAC', () => {
    it('should return 403 when user lacks capability', async () => {
      mockCapabilityAccessController.hasCapability.mockResolvedValue(false);

      await request(app.getHttpServer())
        .post('/payments/intents')
        .send({
          payerAccountId: 'payer-123',
          payeeAccountId: 'payee-456',
          amount: 100,
          currency: 'KES',
          paymentMethod: PaymentMethod.MOBILE_MONEY,
          flowType: 'IMMEDIATE',
        })
        .expect(403);
    });
  });
});
