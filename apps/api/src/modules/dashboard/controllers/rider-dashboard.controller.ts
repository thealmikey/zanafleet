import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Header,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';

import { CapabilityGuard } from '@api/core/api/guards';
import { RequireCapability } from '@api/core/api/decorators';
import {
  parseQueryParams,
  createPaginationMeta,
  RawQueryParams,
} from '@api/core/api/utils';

import { DeliveryEntity } from '../../delivery/entities/delivery.entity';
import { SettlementBatchEntity } from '../../settlement/entities/settlement-batch.entity';

export interface ActiveDeliverySummary {
  deliveryId: string;
  businessId: string;
  status: DeliveryStatus;
  scheduledPickupTime: Date | null;
  scheduledDropoffTime: Date | null;
  assignedAt: Date | null;
  createdAt: Date;
}

export interface EarningsSummary {
  totalEarnings: number;
  pendingPayout: number;
  completedPayout: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
  deliveryCount: number;
}

@Controller('dashboards/rider')
@UseGuards(CapabilityGuard)
@RequireCapability('dashboard.rider.read')
export class RiderDashboardController {
  constructor(
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    @InjectRepository(SettlementBatchEntity)
    private readonly settlementRepository: Repository<SettlementBatchEntity>
  ) {}

  @Get(':riderId/deliveries/active')
  @Header('Cache-Control', 'private, max-age=15')
  async getActiveDeliveries(
    @Param('riderId') riderId: string,
    @Query() query: RawQueryParams
  ): Promise<{
    data: ActiveDeliverySummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort } = parseQueryParams(query);

    const activeStatuses = [
      DeliveryStatus.Assigned,
      DeliveryStatus.PickedUp,
      DeliveryStatus.InTransit,
    ];

    const order = sort ? { [sort.field]: sort.order } : { assignedAt: 'DESC' as const };

    const [entities, total] = await this.deliveryRepository.findAndCount({
      where: {
        assignedRiderId: riderId,
        status: In(activeStatuses),
      },
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: ActiveDeliverySummary[] = entities.map((e) => ({
      deliveryId: e.id,
      businessId: e.businessId,
      status: e.status,
      scheduledPickupTime: e.scheduledPickupTime,
      scheduledDropoffTime: e.scheduledDropoffTime,
      assignedAt: e.assignedAt,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get(':riderId/deliveries/history')
  @Header('Cache-Control', 'private, max-age=60')
  async getDeliveryHistory(
    @Param('riderId') riderId: string,
    @Query() query: RawQueryParams
  ): Promise<{
    data: ActiveDeliverySummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { deliveredAt: 'DESC' as const };

    const whereClause: Record<string, unknown> = {
      assignedRiderId: riderId,
      ...filter,
    };

    const [entities, total] = await this.deliveryRepository.findAndCount({
      where: whereClause,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: ActiveDeliverySummary[] = entities.map((e) => ({
      deliveryId: e.id,
      businessId: e.businessId,
      status: e.status,
      scheduledPickupTime: e.scheduledPickupTime,
      scheduledDropoffTime: e.scheduledDropoffTime,
      assignedAt: e.assignedAt,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get(':riderId/earnings')
  @Header('Cache-Control', 'private, max-age=60')
  async getEarningsSummary(
    @Param('riderId') riderId: string,
    @Query('periodDays') periodDaysStr?: string
  ): Promise<EarningsSummary> {
    const periodDays = periodDaysStr ? parseInt(periodDaysStr, 10) : 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = new Date();

    const settlements = await this.settlementRepository.find({
      where: {
        riderAccountId: riderId,
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    const completedDeliveries = await this.deliveryRepository.count({
      where: {
        assignedRiderId: riderId,
        status: DeliveryStatus.Delivered,
        deliveredAt: MoreThanOrEqual(periodStart),
      },
    });

    let totalEarnings = 0;
    let pendingPayout = 0;
    let completedPayout = 0;
    let currency = 'KES';

    for (const s of settlements) {
      const amount = parseFloat(s.netPayout) || 0;
      totalEarnings += parseFloat(s.totalEarnings) || 0;
      currency = s.currency;

      if (s.status === 'COMPLETED') {
        completedPayout += amount;
      } else if (s.status === 'PENDING' || s.status === 'PROCESSING') {
        pendingPayout += amount;
      }
    }

    return {
      totalEarnings,
      pendingPayout,
      completedPayout,
      currency,
      periodStart,
      periodEnd,
      deliveryCount: completedDeliveries,
    };
  }
}
