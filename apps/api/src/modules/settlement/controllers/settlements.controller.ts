import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { CapabilityGuard } from '@api/core/api/guards';
import { RequireCapability } from '@api/core/api/decorators';

import { PayoutOrchestrator } from '../coordinators/payout.orchestrator';
import { SettlementSchedulerService } from '../services/settlement-scheduler.service';
import { PayoutMethod } from '../dto/settlement.enums';

export class InitiatePayoutDto {
  riderAccountId!: string;
  payoutMethod?: PayoutMethod;
  providerId?: string;
  correlationId?: string;
}

export class BatchPayoutsDto {
  accountIds!: string[];
  payoutMethod?: PayoutMethod;
  providerId?: string;
  correlationId?: string;
}

export class RetryPayoutDto {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

@Controller('settlements')
@UseGuards(CapabilityGuard)
@RequireCapability('payout.approve')
export class SettlementsController {
  constructor(
    private readonly payoutOrchestrator: PayoutOrchestrator,
    private readonly settlementSchedulerService: SettlementSchedulerService
  ) {}

  @Post('payouts')
  @HttpCode(HttpStatus.CREATED)
  async initiatePayout(@Body() dto: InitiatePayoutDto): Promise<unknown> {
    return this.payoutOrchestrator.initiatePayout(dto.riderAccountId, {
      payoutMethod: dto.payoutMethod,
      providerId: dto.providerId,
      correlationId: dto.correlationId,
    });
  }

  @Post('payouts/batch')
  @HttpCode(HttpStatus.CREATED)
  async batchPayouts(@Body() dto: BatchPayoutsDto): Promise<unknown> {
    return this.payoutOrchestrator.batchPayouts(dto.accountIds, {
      payoutMethod: dto.payoutMethod,
      providerId: dto.providerId,
      correlationId: dto.correlationId,
    });
  }

  @Get('payouts/:id')
  async getPayoutStatus(@Param('id') payoutId: string): Promise<{ status: unknown }> {
    const status = await this.payoutOrchestrator.getPayoutStatus(payoutId);
    return { status };
  }

  @Post('payouts/:id/retry')
  @HttpCode(HttpStatus.OK)
  async retryFailedPayout(
    @Param('id') payoutId: string,
    @Body() dto: RetryPayoutDto
  ): Promise<unknown> {
    return this.payoutOrchestrator.retryFailedPayout(payoutId, {
      maxRetries: dto.maxRetries,
      baseDelayMs: dto.baseDelayMs,
      maxDelayMs: dto.maxDelayMs,
    });
  }

  @Post('schedule/run')
  @HttpCode(HttpStatus.OK)
  async runScheduledSettlements(): Promise<{ success: boolean }> {
    await this.settlementSchedulerService.processWeeklySettlements();
    return { success: true };
  }
}
