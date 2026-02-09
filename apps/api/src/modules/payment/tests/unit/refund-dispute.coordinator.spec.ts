import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CommandBus } from '@nestjs/cqrs';
import { Repository } from 'typeorm';

import { EventBusService } from '../../../../core/event-bus/event-bus.service';
import { RecordLedgerEntryCommand } from '../../../ledger/commands/record-ledger-entry.command';
import {
  DisputeStatus,
  DisputeReason,
  DisputeResolutionType,
  RefundStatus,
  RefundType,
  PaymentIntentStatus,
  PaymentFlowType,
  PaymentMethod,
} from '../../dto/payment.enums';
import { DisputeEntity } from '../../entities/dispute.entity';
import { RefundEntity } from '../../entities/refund.entity';
import { PaymentIntentEntity } from '../../entities/payment-intent.entity';
import { PaymentTransactionEntity } from '../../entities/payment-transaction.entity';
import {
  PaymentStatus,
  ProviderCapability,
} from '../../providers/dto/payment-provider.types';
import { PaymentProvider } from '../../providers/payment-provider.interface';
import { PaymentProviderRegistry } from '../../providers/payment-provider-registry.service';
import {
  RefundDisputeCoordinator,
  OpenDisputeInput,
  RefundInput,
} from '../../coordinators/refund-dispute.coordinator';

describe('RefundDisputeCoordinator', () => {
  let coordinator: RefundDisputeCoordinator;
  let disputeRepository: jest.Mocked<Repository<DisputeEntity>>;
  let refundRepository: jest.Mocked<Repository<RefundEntity>>;
  let paymentIntentRepository: jest.Mocked<Repository<PaymentIntentEntity>>;
  let transactionRepository: jest.Mocked<Repository<PaymentTransactionEntity>>;
  let commandBus: jest.Mocked<CommandBus>;
  let providerRegistry: jest.Mocked<PaymentProviderRegistry>;
  let eventBusService: jest.Mocked<EventBusService>;

  const mockProvider: jest.Mocked<PaymentProvider> = {
    providerId: 'test-provider',
    displayName: 'Test Provider',
    supportedCurrencies: ['USD', 'KES'],
    capabilities: ['CARD', 'MOBILE_MONEY'] as ProviderCapability[],
    initiatePayment: jest.fn(),
    capturePayment: jest.fn(),
    refund: jest.fn(),
    verifyWebhook: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const createMockPaymentIntent = (
    overrides: Partial<PaymentIntentEntity> = {},
  ): PaymentIntentEntity => {
    const entity = new PaymentIntentEntity();
    entity.id = 'payment-intent-123';
    entity.payerAccountId = 'payer-acc-001';
    entity.payeeAccountId = 'payee-acc-001';
    entity.flowType = PaymentFlowType.C2B;
    entity.amount = '1000.00';
    entity.currency = 'KES';
    entity.status = PaymentIntentStatus.SUCCEEDED;
    entity.paymentMethod = PaymentMethod.MOBILE_MONEY;
    entity.providerId = 'test-provider';
    entity.idempotencyKey = 'idem-123';
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    Object.assign(entity, overrides);
    return entity;
  };

  const createMockDispute = (
    overrides: Partial<DisputeEntity> = {},
  ): DisputeEntity => {
    const entity = new DisputeEntity();
    entity.id = 'dispute-123';
    entity.deliveryId = 'delivery-123';
    entity.paymentIntentId = 'payment-intent-123';
    entity.status = DisputeStatus.OPEN;
    entity.reason = DisputeReason.DELIVERY_NOT_RECEIVED;
    entity.description = 'Package never arrived';
    entity.disputedAmount = '500.00';
    entity.currency = 'KES';
    entity.openedBy = 'customer-001';
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    Object.assign(entity, overrides);
    return entity;
  };

  const createMockRefund = (
    overrides: Partial<RefundEntity> = {},
  ): RefundEntity => {
    const entity = new RefundEntity();
    entity.id = 'refund-123';
    entity.paymentIntentId = 'payment-intent-123';
    entity.disputeId = 'dispute-123';
    entity.deliveryId = 'delivery-123';
    entity.status = RefundStatus.PENDING;
    entity.refundType = RefundType.FULL;
    entity.originalAmount = '1000.00';
    entity.refundAmount = '1000.00';
    entity.currency = 'KES';
    entity.reason = DisputeReason.DELIVERY_NOT_RECEIVED;
    entity.requestedBy = 'customer-001';
    entity.createdAt = new Date();
    entity.updatedAt = new Date();
    Object.assign(entity, overrides);
    return entity;
  };

  const createMockTransaction = (
    overrides: Partial<PaymentTransactionEntity> = {},
  ): PaymentTransactionEntity => {
    const entity = new PaymentTransactionEntity();
    entity.id = 'transaction-123';
    entity.paymentIntentId = 'payment-intent-123';
    entity.providerId = 'test-provider';
    entity.providerTransactionId = 'provider-txn-123';
    entity.status = PaymentStatus.SUCCEEDED;
    entity.amount = '1000.00';
    entity.createdAt = new Date();
    Object.assign(entity, overrides);
    return entity;
  };

  beforeEach(async () => {
    const mockDisputeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockRefundRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockPaymentIntentRepo = {
      findOne: jest.fn(),
    };

    const mockTransactionRepo = {
      findOne: jest.fn(),
    };

    const mockCommandBus = {
      execute: jest.fn().mockResolvedValue(['entry-1', 'entry-2']),
    };

    const mockProviderRegistry = {
      get: jest.fn(),
    };

    const mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundDisputeCoordinator,
        { provide: getRepositoryToken(DisputeEntity), useValue: mockDisputeRepo },
        { provide: getRepositoryToken(RefundEntity), useValue: mockRefundRepo },
        { provide: getRepositoryToken(PaymentIntentEntity), useValue: mockPaymentIntentRepo },
        { provide: getRepositoryToken(PaymentTransactionEntity), useValue: mockTransactionRepo },
        { provide: CommandBus, useValue: mockCommandBus },
        { provide: PaymentProviderRegistry, useValue: mockProviderRegistry },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    coordinator = module.get<RefundDisputeCoordinator>(RefundDisputeCoordinator);
    disputeRepository = module.get(getRepositoryToken(DisputeEntity));
    refundRepository = module.get(getRepositoryToken(RefundEntity));
    paymentIntentRepository = module.get(getRepositoryToken(PaymentIntentEntity));
    transactionRepository = module.get(getRepositoryToken(PaymentTransactionEntity));
    commandBus = module.get(CommandBus);
    providerRegistry = module.get(PaymentProviderRegistry);
    eventBusService = module.get(EventBusService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('openDispute', () => {
    const createOpenDisputeInput = (
      overrides: Partial<OpenDisputeInput> = {},
    ): OpenDisputeInput => ({
      deliveryId: 'delivery-123',
      paymentIntentId: 'payment-intent-123',
      reason: DisputeReason.DELIVERY_NOT_RECEIVED,
      description: 'Package never arrived',
      disputedAmount: 500,
      currency: 'KES',
      openedBy: 'customer-001',
      ...overrides,
    });

    it('should successfully open a dispute', async () => {
      disputeRepository.findOne.mockResolvedValue(null);
      disputeRepository.save.mockImplementation(async (entity) => entity as DisputeEntity);

      const input = createOpenDisputeInput();
      const result = await coordinator.openDispute(input);

      expect(result.success).toBe(true);
      expect(result.status).toBe(DisputeStatus.OPEN);
      expect(result.disputeId).toBeDefined();
      expect(disputeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deliveryId: 'delivery-123',
          reason: DisputeReason.DELIVERY_NOT_RECEIVED,
          status: DisputeStatus.OPEN,
        }),
      );
    });

    it('should reject opening duplicate dispute for same delivery', async () => {
      const existingDispute = createMockDispute();
      disputeRepository.findOne.mockResolvedValue(existingDispute);

      const input = createOpenDisputeInput();
      const result = await coordinator.openDispute(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
      expect(result.disputeId).toBe(existingDispute.id);
    });

    it('should emit Payment.Dispute.OpenedV1 event', async () => {
      disputeRepository.findOne.mockResolvedValue(null);
      disputeRepository.save.mockImplementation(async (entity) => entity as DisputeEntity);

      const input = createOpenDisputeInput();
      await coordinator.openDispute(input);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'payment.events.dispute-opened-v1',
        expect.objectContaining({
          eventType: 'Payment.Dispute.OpenedV1',
          payload: expect.objectContaining({
            deliveryId: 'delivery-123',
            reason: DisputeReason.DELIVERY_NOT_RECEIVED,
          }),
        }),
      );
    });
  });

  describe('resolveDispute', () => {
    it('should resolve dispute with full refund', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.UNDER_REVIEW });
      const paymentIntent = createMockPaymentIntent();
      const transaction = createMockTransaction();

      disputeRepository.findOne.mockResolvedValue(dispute);
      disputeRepository.update.mockResolvedValue({ affected: 1 } as any);
      paymentIntentRepository.findOne.mockResolvedValue(paymentIntent);
      transactionRepository.findOne.mockResolvedValue(transaction);
      refundRepository.save.mockImplementation(async (entity) => entity as RefundEntity);
      refundRepository.update.mockResolvedValue({ affected: 1 } as any);
      refundRepository.findOne.mockResolvedValue(createMockRefund({ status: RefundStatus.COMPLETED }));
      providerRegistry.get.mockReturnValue(mockProvider);
      mockProvider.refund.mockResolvedValue({
        success: true,
        refundId: 'provider-refund-123',
        transactionId: 'transaction-123',
        amount: 500,
        status: PaymentStatus.SUCCEEDED,
      });

      await coordinator.resolveDispute('dispute-123', {
        resolutionType: DisputeResolutionType.FULL_REFUND,
        resolutionNotes: 'Customer complaint validated',
        resolvedBy: 'support-agent-001',
      });

      expect(disputeRepository.update).toHaveBeenCalledWith(
        'dispute-123',
        expect.objectContaining({
          status: DisputeStatus.RESOLVED,
          resolutionType: DisputeResolutionType.FULL_REFUND,
        }),
      );
    });

    it('should resolve dispute without refund', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.OPEN });
      const resolvedDispute = createMockDispute({ status: DisputeStatus.RESOLVED });
      disputeRepository.findOne
        .mockResolvedValueOnce(dispute)
        .mockResolvedValueOnce(resolvedDispute);
      disputeRepository.update.mockResolvedValue({ affected: 1 } as any);

      await coordinator.resolveDispute('dispute-123', {
        resolutionType: DisputeResolutionType.NO_REFUND,
        resolutionNotes: 'Investigation found no fault',
        resolvedBy: 'support-agent-001',
      });

      expect(refundRepository.save).not.toHaveBeenCalled();
      expect(eventBusService.publish).toHaveBeenCalledWith(
        'payment.events.dispute-resolved-v1',
        expect.objectContaining({
          eventType: 'Payment.Dispute.ResolvedV1',
        }),
      );
    });

    it('should throw error for invalid state transition', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.RESOLVED });
      disputeRepository.findOne.mockResolvedValue(dispute);

      await expect(
        coordinator.resolveDispute('dispute-123', {
          resolutionType: DisputeResolutionType.NO_REFUND,
          resolvedBy: 'support-agent-001',
        }),
      ).rejects.toThrow('Cannot resolve dispute');
    });

    it('should throw error when dispute not found', async () => {
      disputeRepository.findOne.mockResolvedValue(null);

      await expect(
        coordinator.resolveDispute('non-existent', {
          resolutionType: DisputeResolutionType.NO_REFUND,
          resolvedBy: 'support-agent-001',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('escalateDispute', () => {
    it('should escalate an open dispute', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.OPEN });
      disputeRepository.findOne.mockResolvedValue(dispute);
      disputeRepository.update.mockResolvedValue({ affected: 1 } as any);

      await coordinator.escalateDispute('dispute-123', 'Customer requested manager review');

      expect(disputeRepository.update).toHaveBeenCalledWith(
        'dispute-123',
        expect.objectContaining({
          status: DisputeStatus.ESCALATED,
          escalationReason: 'Customer requested manager review',
        }),
      );
    });

    it('should emit Payment.Dispute.EscalatedV1 event', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.UNDER_REVIEW });
      disputeRepository.findOne.mockResolvedValue(dispute);
      disputeRepository.update.mockResolvedValue({ affected: 1 } as any);

      await coordinator.escalateDispute('dispute-123', 'High-value customer');

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'payment.events.dispute-escalated-v1',
        expect.objectContaining({
          eventType: 'Payment.Dispute.EscalatedV1',
          payload: expect.objectContaining({
            escalationReason: 'High-value customer',
          }),
        }),
      );
    });

    it('should not allow escalating already resolved dispute', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.RESOLVED });
      disputeRepository.findOne.mockResolvedValue(dispute);

      await expect(
        coordinator.escalateDispute('dispute-123', 'Some reason'),
      ).rejects.toThrow('Cannot escalate dispute');
    });
  });

  describe('processRefund', () => {
    const createRefundInput = (overrides: Partial<RefundInput> = {}): RefundInput => ({
      paymentIntentId: 'payment-intent-123',
      disputeId: 'dispute-123',
      deliveryId: 'delivery-123',
      refundAmount: 500,
      reason: DisputeReason.DELIVERY_NOT_RECEIVED,
      reasonDetails: 'Package never arrived',
      requestedBy: 'customer-001',
      ...overrides,
    });

    beforeEach(() => {
      const paymentIntent = createMockPaymentIntent();
      const transaction = createMockTransaction();

      paymentIntentRepository.findOne.mockResolvedValue(paymentIntent);
      transactionRepository.findOne.mockResolvedValue(transaction);
      refundRepository.save.mockImplementation(async (entity) => entity as RefundEntity);
      refundRepository.update.mockResolvedValue({ affected: 1 } as any);
      providerRegistry.get.mockReturnValue(mockProvider);
      mockProvider.refund.mockResolvedValue({
        success: true,
        refundId: 'provider-refund-123',
        transactionId: 'transaction-123',
        amount: 500,
        status: PaymentStatus.SUCCEEDED,
      });
    });

    it('should auto-approve refund under threshold', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 1000 });

      refundRepository.findOne.mockResolvedValue(
        createMockRefund({ status: RefundStatus.COMPLETED }),
      );

      const input = createRefundInput({ refundAmount: 500 });
      const result = await coordinator.processRefund(input);

      expect(result.success).toBe(true);
      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(result.requiresApproval).toBeUndefined();
    });

    it('should require approval for refund over threshold', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 100 });

      const input = createRefundInput({ refundAmount: 500 });
      const result = await coordinator.processRefund(input);

      expect(result.success).toBe(true);
      expect(result.status).toBe(RefundStatus.PENDING);
      expect(result.requiresApproval).toBe(true);
    });

    it('should process full refund', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 2000 });

      refundRepository.findOne.mockResolvedValue(
        createMockRefund({
          status: RefundStatus.COMPLETED,
          refundType: RefundType.FULL,
        }),
      );

      const input = createRefundInput({ refundAmount: 1000 });
      const result = await coordinator.processRefund(input);

      expect(result.success).toBe(true);
      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(refundRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refundType: RefundType.FULL,
        }),
      );
    });

    it('should process partial refund', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 2000 });

      refundRepository.findOne.mockResolvedValue(
        createMockRefund({
          status: RefundStatus.COMPLETED,
          refundType: RefundType.PARTIAL,
          refundAmount: '250.00',
        }),
      );

      const input = createRefundInput({ refundAmount: 250 });
      const result = await coordinator.processRefund(input);

      expect(result.success).toBe(true);
      expect(refundRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refundType: RefundType.PARTIAL,
        }),
      );
    });

    it('should execute ledger compensation', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 2000 });

      refundRepository.findOne.mockResolvedValue(
        createMockRefund({ status: RefundStatus.COMPLETED }),
      );

      const input = createRefundInput({ refundAmount: 500 });
      await coordinator.processRefund(input);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(RecordLedgerEntryCommand),
      );

      const command = commandBus.execute.mock.calls[0][0] as RecordLedgerEntryCommand;
      expect(command.entries).toHaveLength(2);
      expect(command.entries[0].category).toBe('REFUND');
      expect(command.entries[1].category).toBe('REFUND');
    });

    it('should call provider refund', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 2000 });

      refundRepository.findOne.mockResolvedValue(
        createMockRefund({ status: RefundStatus.COMPLETED }),
      );

      const input = createRefundInput({ refundAmount: 500 });
      const result = await coordinator.processRefund(input);

      expect(result.success).toBe(true);
      expect(mockProvider.refund).toHaveBeenCalledWith('provider-txn-123', 500);
      expect(result.providerRefundId).toBe('provider-refund-123');
    });

    it('should fail when payment intent not found', async () => {
      paymentIntentRepository.findOne.mockResolvedValue(null);

      const input = createRefundInput();
      const result = await coordinator.processRefund(input);

      expect(result.success).toBe(false);
      expect(result.status).toBe(RefundStatus.FAILED);
      expect(result.error).toContain('not found');
    });

    it('should emit Payment.Refund.ProcessedV1 event on success', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 2000 });

      refundRepository.findOne.mockResolvedValue(
        createMockRefund({ status: RefundStatus.COMPLETED }),
      );

      const input = createRefundInput({ refundAmount: 500 });
      await coordinator.processRefund(input);

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'payment.events.refund-processed-v1',
        expect.objectContaining({
          eventType: 'Payment.Refund.ProcessedV1',
        }),
      );
    });

    it('should handle provider refund failure', async () => {
      coordinator.updateConfig({ autoApprovalThreshold: 2000 });

      mockProvider.refund.mockResolvedValue({
        success: false,
        refundId: '',
        transactionId: 'transaction-123',
        amount: 500,
        status: PaymentStatus.FAILED,
        errorMessage: 'Insufficient funds',
      });

      const input = createRefundInput({ refundAmount: 500 });
      const result = await coordinator.processRefund(input);

      expect(result.success).toBe(false);
      expect(result.status).toBe(RefundStatus.FAILED);
      expect(result.error).toContain('Insufficient funds');
    });
  });

  describe('approveRefund', () => {
    beforeEach(() => {
      const paymentIntent = createMockPaymentIntent();
      const transaction = createMockTransaction();

      paymentIntentRepository.findOne.mockResolvedValue(paymentIntent);
      transactionRepository.findOne.mockResolvedValue(transaction);
      refundRepository.update.mockResolvedValue({ affected: 1 } as any);
      providerRegistry.get.mockReturnValue(mockProvider);
      mockProvider.refund.mockResolvedValue({
        success: true,
        refundId: 'provider-refund-123',
        transactionId: 'transaction-123',
        amount: 500,
        status: PaymentStatus.SUCCEEDED,
      });
    });

    it('should approve and execute pending refund', async () => {
      const pendingRefund = createMockRefund({ status: RefundStatus.PENDING });
      const approvedRefund = createMockRefund({ status: RefundStatus.APPROVED });
      const completedRefund = createMockRefund({ status: RefundStatus.COMPLETED });

      refundRepository.findOne
        .mockResolvedValueOnce(pendingRefund)
        .mockResolvedValueOnce(approvedRefund)
        .mockResolvedValueOnce(completedRefund);

      const result = await coordinator.approveRefund('refund-123', 'supervisor-001');

      expect(result.success).toBe(true);
      expect(result.status).toBe(RefundStatus.COMPLETED);
      expect(refundRepository.update).toHaveBeenCalledWith(
        'refund-123',
        expect.objectContaining({
          status: RefundStatus.APPROVED,
          approvedBy: 'supervisor-001',
        }),
      );
    });

    it('should emit approval event', async () => {
      const pendingRefund = createMockRefund({ status: RefundStatus.PENDING });
      const approvedRefund = createMockRefund({ status: RefundStatus.APPROVED });
      const completedRefund = createMockRefund({ status: RefundStatus.COMPLETED });

      refundRepository.findOne
        .mockResolvedValueOnce(pendingRefund)
        .mockResolvedValueOnce(approvedRefund)
        .mockResolvedValueOnce(completedRefund);

      await coordinator.approveRefund('refund-123', 'supervisor-001');

      expect(eventBusService.publish).toHaveBeenCalledWith(
        'payment.events.refund-approved-v1',
        expect.objectContaining({
          eventType: 'Payment.Refund.ApprovedV1',
        }),
      );
    });

    it('should fail for non-pending refund', async () => {
      const completedRefund = createMockRefund({ status: RefundStatus.COMPLETED });
      refundRepository.findOne.mockResolvedValue(completedRefund);

      const result = await coordinator.approveRefund('refund-123', 'supervisor-001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot approve');
    });

    it('should fail when refund not found', async () => {
      refundRepository.findOne.mockResolvedValue(null);

      const result = await coordinator.approveRefund('non-existent', 'supervisor-001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('rejectRefund', () => {
    it('should reject pending refund', async () => {
      const pendingRefund = createMockRefund({ status: RefundStatus.PENDING });
      refundRepository.findOne.mockResolvedValue(pendingRefund);
      refundRepository.update.mockResolvedValue({ affected: 1 } as any);

      await coordinator.rejectRefund(
        'refund-123',
        'supervisor-001',
        'Insufficient evidence',
      );

      expect(refundRepository.update).toHaveBeenCalledWith(
        'refund-123',
        expect.objectContaining({
          status: RefundStatus.REJECTED,
          failureReason: expect.stringContaining('Insufficient evidence'),
        }),
      );
    });

    it('should fail for non-pending refund', async () => {
      const completedRefund = createMockRefund({ status: RefundStatus.COMPLETED });
      refundRepository.findOne.mockResolvedValue(completedRefund);

      await expect(
        coordinator.rejectRefund('refund-123', 'supervisor-001', 'Some reason'),
      ).rejects.toThrow('Cannot reject refund');
    });
  });

  describe('getDisputeHistory', () => {
    it('should return dispute history for delivery', async () => {
      const disputes = [
        createMockDispute({ id: 'dispute-1', status: DisputeStatus.RESOLVED }),
        createMockDispute({ id: 'dispute-2', status: DisputeStatus.OPEN }),
      ];
      disputeRepository.find.mockResolvedValue(disputes);

      const history = await coordinator.getDisputeHistory('delivery-123');

      expect(history).toHaveLength(2);
      expect(history[0].disputeId).toBe('dispute-1');
      expect(disputeRepository.find).toHaveBeenCalledWith({
        where: { deliveryId: 'delivery-123' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no disputes found', async () => {
      disputeRepository.find.mockResolvedValue([]);

      const history = await coordinator.getDisputeHistory('delivery-456');

      expect(history).toHaveLength(0);
    });
  });

  describe('dispute state machine', () => {
    it('should validate OPEN -> UNDER_REVIEW transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW),
      ).toBe(true);
    });

    it('should validate OPEN -> RESOLVED transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.OPEN, DisputeStatus.RESOLVED),
      ).toBe(true);
    });

    it('should validate OPEN -> ESCALATED transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.OPEN, DisputeStatus.ESCALATED),
      ).toBe(true);
    });

    it('should validate UNDER_REVIEW -> RESOLVED transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.UNDER_REVIEW, DisputeStatus.RESOLVED),
      ).toBe(true);
    });

    it('should validate UNDER_REVIEW -> ESCALATED transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.UNDER_REVIEW, DisputeStatus.ESCALATED),
      ).toBe(true);
    });

    it('should reject RESOLVED -> OPEN transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.RESOLVED, DisputeStatus.OPEN),
      ).toBe(false);
    });

    it('should reject ESCALATED -> OPEN transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.ESCALATED, DisputeStatus.OPEN),
      ).toBe(false);
    });

    it('should reject RESOLVED -> UNDER_REVIEW transition', () => {
      expect(
        coordinator.isValidTransition(DisputeStatus.RESOLVED, DisputeStatus.UNDER_REVIEW),
      ).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      coordinator.updateConfig({
        autoApprovalThreshold: 1000,
        requireApprovalForFullRefund: true,
      });

      const config = coordinator.getConfig();

      expect(config.autoApprovalThreshold).toBe(1000);
      expect(config.requireApprovalForFullRefund).toBe(true);
    });

    it('should require approval for full refund when configured', async () => {
      coordinator.updateConfig({
        autoApprovalThreshold: 2000,
        requireApprovalForFullRefund: true,
      });

      const paymentIntent = createMockPaymentIntent();
      paymentIntentRepository.findOne.mockResolvedValue(paymentIntent);
      refundRepository.save.mockImplementation(async (entity) => entity as RefundEntity);

      const result = await coordinator.processRefund({
        paymentIntentId: 'payment-intent-123',
        refundAmount: 1000,
        reason: DisputeReason.DELIVERY_NOT_RECEIVED,
        requestedBy: 'customer-001',
      });

      expect(result.requiresApproval).toBe(true);
      expect(result.status).toBe(RefundStatus.PENDING);
    });
  });

  describe('updateDisputeStatus', () => {
    it('should update dispute status', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.OPEN });
      disputeRepository.findOne.mockResolvedValue(dispute);
      disputeRepository.update.mockResolvedValue({ affected: 1 } as any);

      await coordinator.updateDisputeStatus(
        'dispute-123',
        DisputeStatus.UNDER_REVIEW,
        'agent-001',
      );

      expect(disputeRepository.update).toHaveBeenCalledWith(
        'dispute-123',
        expect.objectContaining({
          status: DisputeStatus.UNDER_REVIEW,
          assignedTo: 'agent-001',
        }),
      );
    });

    it('should throw for invalid transition', async () => {
      const dispute = createMockDispute({ status: DisputeStatus.RESOLVED });
      disputeRepository.findOne.mockResolvedValue(dispute);

      await expect(
        coordinator.updateDisputeStatus('dispute-123', DisputeStatus.OPEN),
      ).rejects.toThrow('Invalid transition');
    });
  });
});
