import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard, PolicyGuard } from '@api/core/api/guards';
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
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  PaymentFlowOrchestrator,
  PaymentFlowResult,
  CaptureResult,
} from '../coordinators/payment-flow.orchestrator';
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
  @ApiProperty({ description: 'Payer account ID' })
  payerAccountId!: string;

  @ApiProperty({ description: 'Payee account ID' })
  payeeAccountId!: string;

  @ApiProperty({ description: 'Payment amount', type: Number })
  amount!: number;

  @ApiProperty({ description: 'Currency code (e.g., KES, USD)' })
  currency!: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method' })
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ description: 'Preferred payment provider ID' })
  preferredProviderId?: string;

  @ApiProperty({ enum: PaymentFlowType, description: 'Type of payment flow' })
  flowType!: PaymentFlowType;

  @ApiPropertyOptional({ description: 'Reference ID (e.g., order ID)' })
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Reference type (e.g., order)' })
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Idempotency key to prevent duplicate payments' })
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  metadata?: Record<string, unknown>;
}

export class ProcessRefundDto {
  @ApiProperty({ description: 'Payment intent ID to refund' })
  paymentIntentId!: string;

  @ApiPropertyOptional({ description: 'Dispute ID if refund is related to a dispute' })
  disputeId?: string;

  @ApiPropertyOptional({ description: 'Delivery ID if refund is related to a delivery' })
  deliveryId?: string;

  @ApiProperty({ description: 'Refund amount', type: Number })
  refundAmount!: number;

  @ApiProperty({ enum: DisputeReason, description: 'Reason for refund' })
  reason!: DisputeReason;

  @ApiPropertyOptional({ description: 'Detailed reason description' })
  reasonDetails?: string;

  @ApiProperty({ description: 'Actor ID requesting the refund' })
  requestedBy!: string;

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  metadata?: Record<string, unknown>;
}

export class OpenDisputeDto {
  @ApiProperty({ description: 'Delivery ID related to the dispute' })
  deliveryId!: string;

  @ApiPropertyOptional({ description: 'Payment intent ID related to the dispute' })
  paymentIntentId?: string;

  @ApiProperty({ enum: DisputeReason, description: 'Reason for dispute' })
  reason!: DisputeReason;

  @ApiPropertyOptional({ description: 'Detailed description of the dispute' })
  description?: string;

  @ApiProperty({ description: 'Disputed amount', type: Number })
  disputedAmount!: number;

  @ApiProperty({ description: 'Currency code' })
  currency!: string;

  @ApiProperty({ description: 'Actor ID opening the dispute' })
  openedBy!: string;

  @ApiPropertyOptional({ description: 'Additional metadata', type: Object })
  metadata?: Record<string, unknown>;
}

export class UpdateDisputeDto {
  @ApiProperty({ enum: ['resolve', 'escalate'], description: 'Action to take on the dispute' })
  action!: 'resolve' | 'escalate';

  @ApiPropertyOptional({
    enum: DisputeResolutionType,
    description: 'Resolution type (required for resolve action)',
  })
  resolutionType?: DisputeResolutionType;

  @ApiPropertyOptional({ description: 'Notes about the resolution' })
  resolutionNotes?: string;

  @ApiPropertyOptional({ description: 'Actor ID who resolved the dispute' })
  resolvedBy?: string;

  @ApiPropertyOptional({ description: 'Refund amount if applicable', type: Number })
  refundAmount?: number;

  @ApiPropertyOptional({ description: 'Reason for escalation (required for escalate action)' })
  escalateReason?: string;
}

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'workspaceId',
  description: 'Workspace identifier for multi-tenancy',
  required: true,
})
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
  @ApiOperation({
    summary: 'Create payment intent',
    description: 'Initiate a new payment transaction',
  })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
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
  @ApiOperation({
    summary: 'Capture payment',
    description: 'Capture a previously authorized payment',
  })
  @ApiResponse({ status: 200, description: 'Payment captured successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Payment intent not found' })
  @ApiParam({ name: 'id', description: 'Payment intent unique identifier', type: String })
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
  @ApiOperation({ summary: 'Process refund', description: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body or policy violation' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Missing required capability or policy violation',
  })
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
  @ApiOperation({
    summary: 'Open dispute',
    description: 'Open a dispute for a payment or delivery',
  })
  @ApiResponse({ status: 201, description: 'Dispute opened successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
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
  @ApiOperation({
    summary: 'Update dispute',
    description: 'Resolve or escalate an existing dispute',
  })
  @ApiResponse({
    status: 200,
    description: 'Dispute updated successfully',
    schema: { example: { success: true } },
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Missing required capability' })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  @ApiParam({ name: 'id', description: 'Dispute unique identifier', type: String })
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
