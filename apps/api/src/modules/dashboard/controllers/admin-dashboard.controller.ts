import { RequireCapability } from '@api/core/api/decorators';
import { CapabilityGuard } from '@api/core/api/guards';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Header,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';


import { PolicyStatus } from '../../policy/dto/policy.enums';
import { PolicyEntity } from '../../policy/entities/policy.entity';
import { SettlementBatchEntity } from '../../settlement/entities/settlement-batch.entity';

export interface SystemMetrics {
  totalSettlements: number;
  pendingSettlements: number;
  completedSettlements: number;
  failedSettlements: number;
  totalPolicies: number;
  activePolicies: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface SettlementSummary {
  batchId: string;
  riderAccountId: string;
  status: string;
  totalEarnings: string;
  netPayout: string;
  currency: string;
  createdAt: Date;
}

@Controller('dashboards/admin')
@UseGuards(CapabilityGuard)
@RequireCapability('dashboard.admin.read')
export class AdminDashboardController {
  constructor(
    @InjectRepository(SettlementBatchEntity)
    private readonly settlementRepository: Repository<SettlementBatchEntity>,
    @InjectRepository(PolicyEntity)
    private readonly policyRepository: Repository<PolicyEntity>
  ) {}

  @Get('metrics')
  @Header('Cache-Control', 'private, max-age=60')
  async getSystemMetrics(
    @Query('periodDays') periodDaysStr?: string
  ): Promise<SystemMetrics> {
    const periodDays = periodDaysStr ? parseInt(periodDaysStr, 10) : 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = new Date();

    const [settlements, totalSettlements] = await this.settlementRepository.findAndCount({
      where: {
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    const pendingSettlements = settlements.filter(s => s.status === 'PENDING').length;
    const completedSettlements = settlements.filter(s => s.status === 'COMPLETED').length;
    const failedSettlements = settlements.filter(s => s.status === 'FAILED').length;

    const [, totalPolicies] = await this.policyRepository.findAndCount();
    const [, activePolicies] = await this.policyRepository.findAndCount({
      where: { status: PolicyStatus.ACTIVE },
    });

    return {
      totalSettlements,
      pendingSettlements,
      completedSettlements,
      failedSettlements,
      totalPolicies,
      activePolicies,
      periodStart,
      periodEnd,
    };
  }

  @Get('settlements')
  @Header('Cache-Control', 'private, max-age=30')
  async getSettlementReports(@Query() query: RawQueryParams): Promise<{
    data: SettlementSummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const [entities, total] = await this.settlementRepository.findAndCount({
      where: filter ,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: SettlementSummary[] = entities.map((e) => ({
      batchId: e.id,
      riderAccountId: e.riderAccountId,
      status: e.status,
      totalEarnings: e.totalEarnings,
      netPayout: e.netPayout,
      currency: e.currency,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get('policies')
  @Header('Cache-Control', 'private, max-age=60')
  async getPolicySummary(@Query() query: RawQueryParams): Promise<{
    data: Array<{
      policyId: string;
      name: string;
      scope: string;
      status: string;
      trigger: string;
      priority: number;
      createdAt: Date;
    }>;
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { priority: 'DESC' as const };

    const [entities, total] = await this.policyRepository.findAndCount({
      where: filter ,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data = entities.map((e) => ({
      policyId: e.id,
      name: e.name,
      scope: e.scope,
      status: e.status,
      trigger: e.trigger,
      priority: e.priority,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }
}
