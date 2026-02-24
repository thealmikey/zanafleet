import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
import { parseQueryParams, createPaginationMeta, RawQueryParams } from '@api/core/api/utils';
import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';

import { DisputeEntity } from '../../payment/entities/dispute.entity';
import { PaymentIntentEntity } from '../../payment/entities/payment-intent.entity';
import { RefundEntity } from '../../payment/entities/refund.entity';

export interface DisputeSummary {
  disputeId: string;
  deliveryId: string;
  paymentIntentId: string | null;
  status: string;
  reason: string;
  disputedAmount: string;
  currency: string;
  escalatedAt: Date | null;
  createdAt: Date;
}

export interface RefundSummary {
  refundId: string;
  paymentIntentId: string;
  disputeId: string | null;
  status: string;
  refundType: string;
  refundAmount: string;
  currency: string;
  requestedBy: string;
  createdAt: Date;
}

export interface PaymentActivitySummary {
  intentId: string;
  payerAccountId: string;
  payeeAccountId: string;
  amount: string;
  currency: string;
  status: string;
  flowType: string;
  createdAt: Date;
}

export interface SupportMetrics {
  totalDisputes: number;
  openDisputes: number;
  escalatedDisputes: number;
  resolvedDisputes: number;
  totalRefunds: number;
  pendingRefunds: number;
  completedRefunds: number;
  periodStart: Date;
  periodEnd: Date;
}

@Controller('dashboards/support')
@UseGuards(CapabilityGuard)
@RequireCapability('dashboard.support.read')
export class SupportDashboardController {
  constructor(
    @InjectRepository(DisputeEntity)
    private readonly disputeRepository: Repository<DisputeEntity>,
    @InjectRepository(RefundEntity)
    private readonly refundRepository: Repository<RefundEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>
  ) {}

  @Get('metrics')
  @Header('Cache-Control', 'private, max-age=60')
  async getSupportMetrics(@Query('periodDays') periodDaysStr?: string): Promise<SupportMetrics> {
    const periodDays = periodDaysStr ? parseInt(periodDaysStr, 10) : 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = new Date();

    const [disputes, totalDisputes] = await this.disputeRepository.findAndCount({
      where: {
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    const openDisputes = disputes.filter((d) => d.status === 'OPEN').length;
    const escalatedDisputes = disputes.filter((d) => d.status === 'ESCALATED').length;
    const resolvedDisputes = disputes.filter((d) => d.status === 'RESOLVED').length;

    const [refunds, totalRefunds] = await this.refundRepository.findAndCount({
      where: {
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    const pendingRefunds = refunds.filter((r) => r.status === 'PENDING').length;
    const completedRefunds = refunds.filter((r) => r.status === 'COMPLETED').length;

    return {
      totalDisputes,
      openDisputes,
      escalatedDisputes,
      resolvedDisputes,
      totalRefunds,
      pendingRefunds,
      completedRefunds,
      periodStart,
      periodEnd,
    };
  }

  @Get('disputes')
  @Header('Cache-Control', 'private, max-age=30')
  async getDisputes(@Query() query: RawQueryParams): Promise<{
    data: DisputeSummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const [entities, total] = await this.disputeRepository.findAndCount({
      where: filter,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: DisputeSummary[] = entities.map((e) => ({
      disputeId: e.id,
      deliveryId: e.deliveryId,
      paymentIntentId: e.paymentIntentId,
      status: e.status,
      reason: e.reason,
      disputedAmount: e.disputedAmount,
      currency: e.currency,
      escalatedAt: e.escalatedAt,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('disputes/escalated')
  @Header('Cache-Control', 'private, max-age=15')
  async getEscalatedDisputes(@Query() query: RawQueryParams): Promise<{
    data: DisputeSummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { escalatedAt: 'DESC' as const };

    const [entities, total] = await this.disputeRepository.findAndCount({
      where: { status: 'ESCALATED' as any },
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: DisputeSummary[] = entities.map((e) => ({
      disputeId: e.id,
      deliveryId: e.deliveryId,
      paymentIntentId: e.paymentIntentId,
      status: e.status,
      reason: e.reason,
      disputedAmount: e.disputedAmount,
      currency: e.currency,
      escalatedAt: e.escalatedAt,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('refunds')
  @Header('Cache-Control', 'private, max-age=30')
  async getRefunds(@Query() query: RawQueryParams): Promise<{
    data: RefundSummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const [entities, total] = await this.refundRepository.findAndCount({
      where: filter,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: RefundSummary[] = entities.map((e) => ({
      refundId: e.id,
      paymentIntentId: e.paymentIntentId,
      disputeId: e.disputeId,
      status: e.status,
      refundType: e.refundType,
      refundAmount: e.refundAmount,
      currency: e.currency,
      requestedBy: e.requestedBy,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('payments/recent')
  @Header('Cache-Control', 'private, max-age=30')
  async getRecentPaymentActivity(@Query() query: RawQueryParams): Promise<{
    data: PaymentActivitySummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const [entities, total] = await this.paymentIntentRepository.findAndCount({
      where: filter,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: PaymentActivitySummary[] = entities.map((e) => {
      const domain = e.toDomain();
      return {
        intentId: domain.paymentIntentId,
        payerAccountId: domain.payerAccountId,
        payeeAccountId: domain.payeeAccountId,
        amount: String(domain.amount),
        currency: domain.currency,
        status: domain.status,
        flowType: domain.flowType,
        createdAt: domain.createdAt,
      };
    });

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }
}
