import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { NatsSubjects } from '../../../core/event-bus/event-bus.constants';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { RecordLedgerEntryCommand } from '../../ledger/commands/record-ledger-entry.command';
import {
  LedgerEntryType,
  LedgerCategory,
  LedgerReferenceType,
} from '../../ledger/dto/ledger.enums';
import {
  DisputeStatus,
  DisputeReason,
  DisputeResolutionType,
  RefundStatus,
  RefundType,
} from '../dto/payment.enums';
import { DisputeEntity } from '../entities/dispute.entity';
import { PaymentIntentEntity } from '../entities/payment-intent.entity';
import { PaymentTransactionEntity } from '../entities/payment-transaction.entity';
import { RefundEntity } from '../entities/refund.entity';
import { PaymentProviderRegistry } from '../providers/payment-provider-registry.service';

export interface OpenDisputeInput {
  deliveryId: string;
  paymentIntentId?: string;
  reason: DisputeReason;
  description?: string;
  disputedAmount: number;
  currency: string;
  openedBy: string;
  metadata?: Record<string, unknown>;
}

export interface DisputeResult {
  success: boolean;
  disputeId: string;
  status: DisputeStatus;
  error?: string;
}

export interface DisputeResolution {
  resolutionType: DisputeResolutionType;
  resolutionNotes?: string;
  resolvedBy: string;
  refundAmount?: number;
}

export interface RefundInput {
  paymentIntentId: string;
  disputeId?: string;
  deliveryId?: string;
  refundAmount: number;
  reason: DisputeReason;
  reasonDetails?: string;
  requestedBy: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessRefundResult {
  success: boolean;
  refundId: string;
  status: RefundStatus;
  providerRefundId?: string;
  error?: string;
  requiresApproval?: boolean;
}

export interface DisputeRecord {
  disputeId: string;
  deliveryId: string;
  paymentIntentId: string | null;
  status: DisputeStatus;
  reason: DisputeReason;
  description: string | null;
  disputedAmount: number;
  currency: string;
  resolutionType: DisputeResolutionType | null;
  resolutionNotes: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  escalatedAt: Date | null;
}

export interface RefundDisputeConfig {
  autoApprovalThreshold: number;
  maxDisputeAgeForAutoApprovalDays: number;
  requireApprovalForFullRefund: boolean;
  defaultCurrency: string;
}

interface DisputeStateTransition {
  from: DisputeStatus[];
  to: DisputeStatus;
}

const VALID_DISPUTE_TRANSITIONS: DisputeStateTransition[] = [
  { from: [DisputeStatus.OPEN], to: DisputeStatus.UNDER_REVIEW },
  { from: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW], to: DisputeStatus.RESOLVED },
  { from: [DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW], to: DisputeStatus.ESCALATED },
];

const DEFAULT_CONFIG: RefundDisputeConfig = {
  autoApprovalThreshold: 500,
  maxDisputeAgeForAutoApprovalDays: 7,
  requireApprovalForFullRefund: false,
  defaultCurrency: 'KES',
};

@Injectable()
export class RefundDisputeCoordinator {
  private readonly logger = new Logger(RefundDisputeCoordinator.name);
  private config: RefundDisputeConfig = { ...DEFAULT_CONFIG };

  constructor(
    @InjectRepository(DisputeEntity)
    private readonly disputeRepository: Repository<DisputeEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepository: Repository<RefundEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>,
    @InjectRepository(PaymentTransactionEntity)
    private readonly transactionRepository: Repository<PaymentTransactionEntity>,
    @Optional() private readonly commandBus?: CommandBus,
    @Optional() private readonly providerRegistry?: PaymentProviderRegistry,
    @Optional() private readonly eventBusService?: EventBusService,
  ) {}

  async openDispute(input: OpenDisputeInput): Promise<DisputeResult> {
    const disputeId = uuidv4();
    this.logger.log(`Opening dispute ${disputeId} for delivery ${input.deliveryId}`);

    try {
      const existingDispute = await this.disputeRepository.findOne({
        where: {
          deliveryId: input.deliveryId,
          status: DisputeStatus.OPEN,
        },
      });

      if (existingDispute) {
        return {
          success: false,
          disputeId: existingDispute.id,
          status: existingDispute.status,
          error: 'An open dispute already exists for this delivery',
        };
      }

      const dispute = DisputeEntity.fromDomain({
        disputeId,
        deliveryId: input.deliveryId,
        paymentIntentId: input.paymentIntentId,
        status: DisputeStatus.OPEN,
        reason: input.reason,
        description: input.description,
        disputedAmount: input.disputedAmount,
        currency: input.currency,
        openedBy: input.openedBy,
        metadata: input.metadata,
        createdAt: new Date(),
      });

      await this.disputeRepository.save(dispute);

      await this.emitDisputeOpenedEvent(dispute, input.openedBy);

      this.logger.log(`Dispute ${disputeId} opened successfully`);

      return {
        success: true,
        disputeId,
        status: DisputeStatus.OPEN,
      };
    } catch (error) {
      this.logger.error(`Failed to open dispute: ${(error as Error).message}`);
      return {
        success: false,
        disputeId,
        status: DisputeStatus.OPEN,
        error: error instanceof Error ? error.message : 'Failed to open dispute',
      };
    }
  }

  async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution,
  ): Promise<void> {
    this.logger.log(`Resolving dispute ${disputeId}`);

    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute ${disputeId} not found`);
    }

    if (!this.isValidTransition(dispute.status, DisputeStatus.RESOLVED)) {
      throw new Error(
        `Cannot resolve dispute with status ${dispute.status}`,
      );
    }

    const now = new Date();

    await this.disputeRepository.update(disputeId, {
      status: DisputeStatus.RESOLVED,
      resolutionType: resolution.resolutionType,
      resolutionNotes: resolution.resolutionNotes ?? null,
      resolvedBy: resolution.resolvedBy,
      resolvedAt: now,
      updatedAt: now,
    });

    if (
      resolution.resolutionType === DisputeResolutionType.FULL_REFUND ||
      resolution.resolutionType === DisputeResolutionType.PARTIAL_REFUND
    ) {
      const refundAmount =
        resolution.refundAmount ?? parseFloat(dispute.disputedAmount);

      if (dispute.paymentIntentId) {
        await this.processRefund({
          paymentIntentId: dispute.paymentIntentId,
          disputeId,
          deliveryId: dispute.deliveryId,
          refundAmount,
          reason: dispute.reason,
          reasonDetails: dispute.description ?? undefined,
          requestedBy: resolution.resolvedBy,
        });
      }
    }

    const updatedDispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (updatedDispute) {
      await this.emitDisputeResolvedEvent(updatedDispute, resolution);
    }

    this.logger.log(`Dispute ${disputeId} resolved with ${resolution.resolutionType}`);
  }

  async escalateDispute(disputeId: string, reason: string): Promise<void> {
    this.logger.log(`Escalating dispute ${disputeId}`);

    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute ${disputeId} not found`);
    }

    if (!this.isValidTransition(dispute.status, DisputeStatus.ESCALATED)) {
      throw new Error(
        `Cannot escalate dispute with status ${dispute.status}`,
      );
    }

    const now = new Date();

    await this.disputeRepository.update(disputeId, {
      status: DisputeStatus.ESCALATED,
      escalatedAt: now,
      escalationReason: reason,
      updatedAt: now,
    });

    await this.emitDisputeEscalatedEvent(dispute, reason);

    this.logger.log(`Dispute ${disputeId} escalated: ${reason}`);
  }

  async processRefund(input: RefundInput): Promise<ProcessRefundResult> {
    const refundId = uuidv4();
    this.logger.log(`Processing refund ${refundId} for payment ${input.paymentIntentId}`);

    try {
      const paymentIntent = await this.paymentIntentRepository.findOne({
        where: { id: input.paymentIntentId },
      });

      if (!paymentIntent) {
        return {
          success: false,
          refundId,
          status: RefundStatus.FAILED,
          error: `Payment intent ${input.paymentIntentId} not found`,
        };
      }

      const originalAmount = parseFloat(paymentIntent.amount);
      const refundType =
        input.refundAmount >= originalAmount ? RefundType.FULL : RefundType.PARTIAL;

      const requiresApproval = this.checkRequiresApproval(
        input.refundAmount,
        refundType,
      );

      const initialStatus = requiresApproval
        ? RefundStatus.PENDING
        : RefundStatus.APPROVED;

      const refund = RefundEntity.fromDomain({
        refundId,
        paymentIntentId: input.paymentIntentId,
        disputeId: input.disputeId,
        deliveryId: input.deliveryId,
        status: initialStatus,
        refundType,
        originalAmount,
        refundAmount: input.refundAmount,
        currency: paymentIntent.currency,
        reason: input.reason,
        reasonDetails: input.reasonDetails,
        requestedBy: input.requestedBy,
        approvedBy: requiresApproval ? undefined : input.requestedBy,
        approvedAt: requiresApproval ? undefined : new Date(),
        metadata: input.metadata,
        createdAt: new Date(),
      });

      await this.refundRepository.save(refund);

      await this.emitRefundRequestedEvent(refund);

      if (requiresApproval) {
        this.logger.log(`Refund ${refundId} requires approval`);
        return {
          success: true,
          refundId,
          status: RefundStatus.PENDING,
          requiresApproval: true,
        };
      }

      return this.executeRefund(refund, paymentIntent);
    } catch (error) {
      this.logger.error(`Failed to process refund: ${(error as Error).message}`);
      return {
        success: false,
        refundId,
        status: RefundStatus.FAILED,
        error: error instanceof Error ? error.message : 'Failed to process refund',
      };
    }
  }

  async approveRefund(refundId: string, approvedBy: string): Promise<ProcessRefundResult> {
    this.logger.log(`Approving refund ${refundId}`);

    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
    });

    if (!refund) {
      return {
        success: false,
        refundId,
        status: RefundStatus.FAILED,
        error: `Refund ${refundId} not found`,
      };
    }

    if (refund.status !== RefundStatus.PENDING) {
      return {
        success: false,
        refundId,
        status: refund.status,
        error: `Cannot approve refund with status ${refund.status}`,
      };
    }

    const paymentIntent = await this.paymentIntentRepository.findOne({
      where: { id: refund.paymentIntentId },
    });

    if (!paymentIntent) {
      return {
        success: false,
        refundId,
        status: RefundStatus.FAILED,
        error: `Payment intent ${refund.paymentIntentId} not found`,
      };
    }

    const now = new Date();

    await this.refundRepository.update(refundId, {
      status: RefundStatus.APPROVED,
      approvedBy,
      approvedAt: now,
      updatedAt: now,
    });

    const updatedRefund = await this.refundRepository.findOne({
      where: { id: refundId },
    });

    if (updatedRefund) {
      await this.emitRefundApprovedEvent(updatedRefund, approvedBy);
      return this.executeRefund(updatedRefund, paymentIntent);
    }

    return {
      success: false,
      refundId,
      status: RefundStatus.FAILED,
      error: 'Failed to retrieve updated refund',
    };
  }

  async rejectRefund(
    refundId: string,
    rejectedBy: string,
    reason: string,
  ): Promise<void> {
    this.logger.log(`Rejecting refund ${refundId}`);

    const refund = await this.refundRepository.findOne({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException(`Refund ${refundId} not found`);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new Error(`Cannot reject refund with status ${refund.status}`);
    }

    await this.refundRepository.update(refundId, {
      status: RefundStatus.REJECTED,
      failureReason: `Rejected by ${rejectedBy}: ${reason}`,
      updatedAt: new Date(),
    });

    this.logger.log(`Refund ${refundId} rejected: ${reason}`);
  }

  async getDisputeHistory(deliveryId: string): Promise<DisputeRecord[]> {
    const disputes = await this.disputeRepository.find({
      where: { deliveryId },
      order: { createdAt: 'DESC' },
    });

    return disputes.map((d) => ({
      disputeId: d.id,
      deliveryId: d.deliveryId,
      paymentIntentId: d.paymentIntentId,
      status: d.status,
      reason: d.reason,
      description: d.description,
      disputedAmount: parseFloat(d.disputedAmount),
      currency: d.currency,
      resolutionType: d.resolutionType,
      resolutionNotes: d.resolutionNotes,
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt,
      escalatedAt: d.escalatedAt,
    }));
  }

  async getRefundsByPayment(paymentIntentId: string): Promise<RefundEntity[]> {
    return this.refundRepository.find({
      where: { paymentIntentId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDispute(disputeId: string): Promise<DisputeEntity | null> {
    return this.disputeRepository.findOne({
      where: { id: disputeId },
    });
  }

  async getRefund(refundId: string): Promise<RefundEntity | null> {
    return this.refundRepository.findOne({
      where: { id: refundId },
    });
  }

  async updateDisputeStatus(
    disputeId: string,
    newStatus: DisputeStatus,
    assignedTo?: string,
  ): Promise<void> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new NotFoundException(`Dispute ${disputeId} not found`);
    }

    if (!this.isValidTransition(dispute.status, newStatus)) {
      throw new Error(
        `Invalid transition from ${dispute.status} to ${newStatus}`,
      );
    }

    const updates: {
      status: DisputeStatus;
      updatedAt: Date;
      assignedTo?: string;
    } = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (assignedTo) {
      updates.assignedTo = assignedTo;
    }

    await this.disputeRepository.update(disputeId, updates as any);
  }

  updateConfig(config: Partial<RefundDisputeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): RefundDisputeConfig {
    return { ...this.config };
  }

  isValidTransition(from: DisputeStatus, to: DisputeStatus): boolean {
    return VALID_DISPUTE_TRANSITIONS.some(
      (t) => t.from.includes(from) && t.to === to,
    );
  }

  private checkRequiresApproval(amount: number, refundType: RefundType): boolean {
    if (
      this.config.requireApprovalForFullRefund &&
      refundType === RefundType.FULL
    ) {
      return true;
    }

    return amount > this.config.autoApprovalThreshold;
  }

  private async executeRefund(
    refund: RefundEntity,
    paymentIntent: PaymentIntentEntity,
  ): Promise<ProcessRefundResult> {
    const refundId = refund.id;

    try {
      await this.refundRepository.update(refundId, {
        status: RefundStatus.PROCESSING,
        updatedAt: new Date(),
      });

      await this.executeLedgerCompensation(refund, paymentIntent);

      let providerRefundId: string | undefined;

      if (this.providerRegistry) {
        const provider = this.providerRegistry.get(paymentIntent.providerId);

        if (provider) {
          const transaction = await this.transactionRepository.findOne({
            where: { paymentIntentId: paymentIntent.id },
            order: { createdAt: 'DESC' },
          });

          if (transaction?.providerTransactionId) {
            const providerResult = await provider.refund(
              transaction.providerTransactionId,
              parseFloat(refund.refundAmount),
            );

            if (!providerResult.success) {
              throw new Error(
                providerResult.errorMessage ?? 'Provider refund failed',
              );
            }

            providerRefundId = providerResult.refundId;
          }
        }
      }

      const now = new Date();

      await this.refundRepository.update(refundId, {
        status: RefundStatus.COMPLETED,
        providerRefundId: providerRefundId ?? null,
        processedAt: now,
        updatedAt: now,
      });

      const completedRefund = await this.refundRepository.findOne({
        where: { id: refundId },
      });

      if (completedRefund) {
        await this.emitRefundProcessedEvent(completedRefund);
      }

      this.logger.log(`Refund ${refundId} completed successfully`);

      return {
        success: true,
        refundId,
        status: RefundStatus.COMPLETED,
        providerRefundId,
      };
    } catch (error) {
      this.logger.error(`Refund ${refundId} failed: ${(error as Error).message}`);

      await this.refundRepository.update(refundId, {
        status: RefundStatus.FAILED,
        failureReason: error instanceof Error ? error.message : 'Refund execution failed',
        updatedAt: new Date(),
      });

      await this.emitRefundFailedEvent(
        refund,
        error instanceof Error ? error.message : 'Refund execution failed',
      );

      return {
        success: false,
        refundId,
        status: RefundStatus.FAILED,
        error: error instanceof Error ? error.message : 'Refund execution failed',
      };
    }
  }

  private async executeLedgerCompensation(
    refund: RefundEntity,
    paymentIntent: PaymentIntentEntity,
  ): Promise<void> {
    if (!this.commandBus) {
      this.logger.warn('CommandBus not available, skipping ledger compensation');
      return;
    }

    const refundAmount = parseFloat(refund.refundAmount);
    const intentDomain = paymentIntent.toDomain();

    await this.commandBus.execute(
      new RecordLedgerEntryCommand({
        referenceType: LedgerReferenceType.PAYMENT,
        referenceId: refund.id,
        entries: [
          {
            accountId: intentDomain.payeeAccountId,
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.REFUND,
            amount: refundAmount,
            currency: refund.currency,
            description: `Refund ${refund.id} for payment ${paymentIntent.id}`,
          },
          {
            accountId: intentDomain.payerAccountId,
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.REFUND,
            amount: refundAmount,
            currency: refund.currency,
            description: `Refund ${refund.id} for payment ${paymentIntent.id}`,
          },
        ],
      }),
    );

    await this.refundRepository.update(refund.id, {
      ledgerReversalId: refund.id,
    });
  }

  private async emitDisputeOpenedEvent(
    dispute: DisputeEntity,
    openedBy: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Dispute.OpenedV1',
      aggregateId: dispute.id,
      aggregateType: 'Dispute',
      payload: {
        disputeId: dispute.id,
        deliveryId: dispute.deliveryId,
        paymentIntentId: dispute.paymentIntentId,
        reason: dispute.reason,
        description: dispute.description,
        disputedAmount: parseFloat(dispute.disputedAmount),
        currency: dispute.currency,
        openedBy,
        openedAt: dispute.createdAt.toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Payment.DISPUTE_OPENED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish DisputeOpenedEvent: ${error.message}`);
      });
  }

  private async emitDisputeResolvedEvent(
    dispute: DisputeEntity,
    resolution: DisputeResolution,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Dispute.ResolvedV1',
      aggregateId: dispute.id,
      aggregateType: 'Dispute',
      payload: {
        disputeId: dispute.id,
        deliveryId: dispute.deliveryId,
        paymentIntentId: dispute.paymentIntentId,
        resolutionType: resolution.resolutionType,
        resolutionNotes: resolution.resolutionNotes,
        resolvedBy: resolution.resolvedBy,
        refundAmount: resolution.refundAmount,
        resolvedAt: dispute.resolvedAt?.toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Payment.DISPUTE_RESOLVED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish DisputeResolvedEvent: ${error.message}`);
      });
  }

  private async emitDisputeEscalatedEvent(
    dispute: DisputeEntity,
    reason: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Dispute.EscalatedV1',
      aggregateId: dispute.id,
      aggregateType: 'Dispute',
      payload: {
        disputeId: dispute.id,
        deliveryId: dispute.deliveryId,
        paymentIntentId: dispute.paymentIntentId,
        disputedAmount: parseFloat(dispute.disputedAmount),
        currency: dispute.currency,
        escalationReason: reason,
        escalatedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Payment.DISPUTE_ESCALATED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish DisputeEscalatedEvent: ${error.message}`);
      });
  }

  private async emitRefundRequestedEvent(refund: RefundEntity): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Refund.RequestedV1',
      aggregateId: refund.id,
      aggregateType: 'Refund',
      payload: {
        refundId: refund.id,
        paymentIntentId: refund.paymentIntentId,
        disputeId: refund.disputeId,
        deliveryId: refund.deliveryId,
        refundType: refund.refundType,
        refundAmount: parseFloat(refund.refundAmount),
        currency: refund.currency,
        reason: refund.reason,
        requestedBy: refund.requestedBy,
        requiresApproval: refund.status === RefundStatus.PENDING,
        requestedAt: refund.createdAt.toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Payment.REFUND_REQUESTED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish RefundRequestedEvent: ${error.message}`);
      });
  }

  private async emitRefundApprovedEvent(
    refund: RefundEntity,
    approvedBy: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Refund.ApprovedV1',
      aggregateId: refund.id,
      aggregateType: 'Refund',
      payload: {
        refundId: refund.id,
        paymentIntentId: refund.paymentIntentId,
        refundAmount: parseFloat(refund.refundAmount),
        currency: refund.currency,
        approvedBy,
        approvedAt: refund.approvedAt?.toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Payment.REFUND_APPROVED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish RefundApprovedEvent: ${error.message}`);
      });
  }

  private async emitRefundProcessedEvent(refund: RefundEntity): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Refund.ProcessedV1',
      aggregateId: refund.id,
      aggregateType: 'Refund',
      payload: {
        refundId: refund.id,
        paymentIntentId: refund.paymentIntentId,
        disputeId: refund.disputeId,
        deliveryId: refund.deliveryId,
        refundType: refund.refundType,
        originalAmount: parseFloat(refund.originalAmount),
        refundAmount: parseFloat(refund.refundAmount),
        currency: refund.currency,
        reason: refund.reason,
        providerRefundId: refund.providerRefundId,
        ledgerReversalId: refund.ledgerReversalId,
        processedAt: refund.processedAt?.toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Payment.REFUND_PROCESSED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish RefundProcessedEvent: ${error.message}`);
      });
  }

  private async emitRefundFailedEvent(
    refund: RefundEntity,
    reason: string,
  ): Promise<void> {
    if (!this.eventBusService) {
      return;
    }

    const event = {
      eventId: uuidv4(),
      eventVersion: '1',
      eventType: 'Payment.Refund.FailedV1',
      aggregateId: refund.id,
      aggregateType: 'Refund',
      payload: {
        refundId: refund.id,
        paymentIntentId: refund.paymentIntentId,
        refundAmount: parseFloat(refund.refundAmount),
        currency: refund.currency,
        reason,
        failedAt: new Date().toISOString(),
      },
      occurredAt: new Date(),
    };

    await this.eventBusService
      .publish(NatsSubjects.Payment.REFUND_FAILED_V1, event)
      .catch((error) => {
        this.logger.error(`Failed to publish RefundFailedEvent: ${error.message}`);
      });
  }
}
