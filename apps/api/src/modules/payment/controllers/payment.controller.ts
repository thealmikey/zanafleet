import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PolicyTrigger } from '@zanafleet/contracts';

import { CapabilityGuard, PolicyGuard } from '@api/core/api/guards';
import { RequireCapability } from '@api/core/api/decorators';

import { PaymentFlowOrchestrator, PaymentFlowResult, CaptureResult } from '../coordinators/payment-flow.orchestrator';
import {
  RefundDisputeCoordinator,
  DisputeResult,
  ProcessRefundResult,
} from '../coordinators/refund-dispute.coordinator';
import {
  PaymentMethod,
  PaymentFlowType,
  DisputeReason,
  DisputeResolutionType,
} from '../dto/payment.enums';

export class CreatePaymentIntentDto {
  payerAccountId!: string;
  payeeAccountId!: string;
  amount!: number;
  currency!: string;
  paymentMethod!: PaymentMethod;
  preferredProviderId?: string;
  flowType!: PaymentFlowType;
  referenceId?: string;
  referenceType?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export class ProcessRefundDto {
  paymentIntentId!: string;
  disputeId?: string;
  deliveryId?: string;
  refundAmount!: number;
  reason!: DisputeReason;
  reasonDetails?: string;
  requestedBy!: string;
  metadata?: Record<string, unknown>;
}

export class OpenDisputeDto {
  deliveryId!: string;
  paymentIntentId?: string;
  reason!: DisputeReason;
  description?: string;
  disputedAmount!: number;
  currency!: string;
  openedBy!: string;
  metadata?: Record<string, unknown>;
}

export class UpdateDisputeDto {
  action!: 'resolve' | 'escalate';
  resolutionType?: DisputeResolutionType;
  resolutionNotes?: string;
  resolvedBy?: string;
  refundAmount?: number;
  escalateReason?: string;
}

@Controller('payments')
@UseGuards(CapabilityGuard)
@RequireCapability('payment.manage')
export class PaymentController {
  constructor(
    private readonly paymentFlowOrchestrator: PaymentFlowOrchestrator,
    private readonly refundDisputeCoordinator: RefundDisputeCoordinator
  ) {}

  @Post('intents')
  @HttpCode(HttpStatus.CREATED)
  async createIntent(@Body() dto: CreatePaymentIntentDto): Promise<PaymentFlowResult> {
    return this.paymentFlowOrchestrator.initiatePayment({
      payerAccountId: dto.payerAccountId,
      payeeAccountId: dto.payeeAccountId,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      preferredProviderId: dto.preferredProviderId,
      flowType: dto.flowType,
      referenceId: dto.referenceId,
      referenceType: dto.referenceType,
      idempotencyKey: dto.idempotencyKey,
      metadata: dto.metadata,
    });
  }

  @Post('intents/:id/capture')
  @HttpCode(HttpStatus.OK)
  async captureIntent(@Param('id') transactionId: string): Promise<CaptureResult> {
    return this.paymentFlowOrchestrator.capturePayment(transactionId);
  }

  @Post('refunds')
  @HttpCode(HttpStatus.OK)
  @UseGuards(
    PolicyGuard({
      trigger: PolicyTrigger.REVENUE_DISTRIBUTION,
      failOpen: true,
      buildContext: (req) => ({
        metadata: {
          paymentIntentId: (req.body as Record<string, unknown>)?.paymentIntentId,
        },
      }),
    })
  )
  async processRefund(@Body() dto: ProcessRefundDto): Promise<ProcessRefundResult> {
    const result = await this.refundDisputeCoordinator.processRefund({
      paymentIntentId: dto.paymentIntentId,
      disputeId: dto.disputeId,
      deliveryId: dto.deliveryId,
      refundAmount: dto.refundAmount,
      reason: dto.reason,
      reasonDetails: dto.reasonDetails,
      requestedBy: dto.requestedBy,
      metadata: dto.metadata,
    });

    return result;
  }

  @Post('disputes')
  @HttpCode(HttpStatus.CREATED)
  async openDispute(@Body() dto: OpenDisputeDto): Promise<DisputeResult> {
    return this.refundDisputeCoordinator.openDispute({
      deliveryId: dto.deliveryId,
      paymentIntentId: dto.paymentIntentId,
      reason: dto.reason,
      description: dto.description,
      disputedAmount: dto.disputedAmount,
      currency: dto.currency,
      openedBy: dto.openedBy,
      metadata: dto.metadata,
    });
  }

  @Patch('disputes/:id')
  @HttpCode(HttpStatus.OK)
  async updateDispute(
    @Param('id') disputeId: string,
    @Body() dto: UpdateDisputeDto
  ): Promise<{ success: boolean }> {
    if (dto.action === 'resolve') {
      if (!dto.resolutionType) {
        throw new BadRequestException('resolutionType is required for resolve action');
      }
      if (!dto.resolvedBy) {
        throw new BadRequestException('resolvedBy is required for resolve action');
      }

      await this.refundDisputeCoordinator.resolveDispute(disputeId, {
        resolutionType: dto.resolutionType,
        resolutionNotes: dto.resolutionNotes,
        resolvedBy: dto.resolvedBy,
        refundAmount: dto.refundAmount,
      });

      return { success: true };
    }

    if (dto.action === 'escalate') {
      if (!dto.escalateReason) {
        throw new BadRequestException('escalateReason is required for escalate action');
      }

      await this.refundDisputeCoordinator.escalateDispute(disputeId, dto.escalateReason);

      return { success: true };
    }

    throw new BadRequestException('action must be either "resolve" or "escalate"');
  }
}
