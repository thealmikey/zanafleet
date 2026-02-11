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
  Param,
  UseGuards,
  Header,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryStatus, OrderStatus } from '@zanafleet/contracts';
import { Repository, MoreThanOrEqual } from 'typeorm';


import { InvoiceEntity } from '../../billing/entities/invoice.entity';
import { DeliveryEntity } from '../../delivery/entities/delivery.entity';
import { OrderEntity } from '../../order/entities/order.entity';

export interface OrderSummary {
  orderId: string;
  status: OrderStatus;
  customerName: string | null;
  customerPhone: string | null;
  itemSummary: string | null;
  deliveryId: string | null;
  scheduledTime: Date | null;
  createdAt: Date;
}

export interface DeliveryHistorySummary {
  deliveryId: string;
  status: DeliveryStatus;
  assignedRiderId: string | null;
  scheduledPickupTime: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
}

export interface InvoiceSummary {
  invoiceId: string;
  status: string;
  subtotal: string;
  totalTax: string;
  grandTotal: string;
  currency: string;
  createdAt: Date;
}

export interface BusinessMetrics {
  totalOrders: number;
  pendingOrders: number;
  fulfilledOrders: number;
  totalDeliveries: number;
  completedDeliveries: number;
  pendingInvoiceAmount: number;
  paidInvoiceAmount: number;
  currency: string;
  periodStart: Date;
  periodEnd: Date;
}

@Controller('dashboards/business')
@UseGuards(CapabilityGuard)
@RequireCapability('dashboard.business.read')
export class BusinessDashboardController {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>
  ) {}

  @Get(':businessId/metrics')
  @Header('Cache-Control', 'private, max-age=60')
  async getBusinessMetrics(
    @Param('businessId') businessId: string,
    @Query('periodDays') periodDaysStr?: string
  ): Promise<BusinessMetrics> {
    const periodDays = periodDaysStr ? parseInt(periodDaysStr, 10) : 30;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);
    const periodEnd = new Date();

    const [orders, totalOrders] = await this.orderRepository.findAndCount({
      where: {
        businessId,
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    const pendingOrders = orders.filter(o => o.status === OrderStatus.Pending).length;
    const fulfilledOrders = orders.filter(o => o.status === OrderStatus.Fulfilled).length;

    const [deliveries, totalDeliveries] = await this.deliveryRepository.findAndCount({
      where: {
        businessId,
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    const completedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.Delivered).length;

    const invoices = await this.invoiceRepository.find({
      where: {
        createdAt: MoreThanOrEqual(periodStart),
      },
    });

    let pendingInvoiceAmount = 0;
    let paidInvoiceAmount = 0;
    let currency = 'KES';

    for (const inv of invoices) {
      const amount = parseFloat(inv.grandTotal) || 0;
      currency = inv.currency;

      if (inv.status === 'PAID') {
        paidInvoiceAmount += amount;
      } else if (inv.status === 'ISSUED' || inv.status === 'DRAFT') {
        pendingInvoiceAmount += amount;
      }
    }

    return {
      totalOrders,
      pendingOrders,
      fulfilledOrders,
      totalDeliveries,
      completedDeliveries,
      pendingInvoiceAmount,
      paidInvoiceAmount,
      currency,
      periodStart,
      periodEnd,
    };
  }

  @Get(':businessId/orders')
  @Header('Cache-Control', 'private, max-age=30')
  async getOrders(
    @Param('businessId') businessId: string,
    @Query() query: RawQueryParams
  ): Promise<{
    data: OrderSummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const whereClause: Record<string, unknown> = {
      businessId,
      ...filter,
    };

    const [entities, total] = await this.orderRepository.findAndCount({
      where: whereClause,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: OrderSummary[] = entities.map((e) => ({
      orderId: e.id,
      status: e.status,
      customerName: e.customerName,
      customerPhone: e.customerPhone,
      itemSummary: e.itemSummary,
      deliveryId: e.deliveryId,
      scheduledTime: e.scheduledTime,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get(':businessId/deliveries')
  @Header('Cache-Control', 'private, max-age=30')
  async getDeliveryHistory(
    @Param('businessId') businessId: string,
    @Query() query: RawQueryParams
  ): Promise<{
    data: DeliveryHistorySummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const whereClause: Record<string, unknown> = {
      businessId,
      ...filter,
    };

    const [entities, total] = await this.deliveryRepository.findAndCount({
      where: whereClause,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: DeliveryHistorySummary[] = entities.map((e) => ({
      deliveryId: e.id,
      status: e.status,
      assignedRiderId: e.assignedRiderId,
      scheduledPickupTime: e.scheduledPickupTime,
      deliveredAt: e.deliveredAt,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Get(':businessId/invoices')
  @Header('Cache-Control', 'private, max-age=60')
  async getInvoiceSummaries(
    @Param('businessId') _businessId: string,
    @Query() query: RawQueryParams
  ): Promise<{
    data: InvoiceSummary[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : { createdAt: 'DESC' as const };

    const [entities, total] = await this.invoiceRepository.findAndCount({
      where: filter ,
      order,
      skip: pagination.offset,
      take: pagination.limit,
    });

    const data: InvoiceSummary[] = entities.map((e) => ({
      invoiceId: e.id,
      status: e.status,
      subtotal: e.subtotal,
      totalTax: e.totalTax,
      grandTotal: e.grandTotal,
      currency: e.currency,
      createdAt: e.createdAt,
    }));

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }
}
