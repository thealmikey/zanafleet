import { createPaginationMeta, PaginationParams } from '@api/core/api/utils';
import { EventBusService, NatsSubjects } from '@api/core/event-bus';
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DeliveryStatus } from '@zanafleet/contracts';
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { ChargeType } from '../../billing/dto/billing.enums';
import { ChargeEntity } from '../../billing/entities/charge.entity';
import { InvoiceEntity } from '../../billing/entities/invoice.entity';
import { BusinessEntity } from '../../business/entities/business.entity';
import { DeliveryLifecycleCoordinator } from '../../delivery/coordinators/delivery-lifecycle.coordinator';
import { DeliveryMatchingCoordinator } from '../../delivery/coordinators/delivery-matching.coordinator';
import { DeliveryEntity } from '../../delivery/entities/delivery.entity';
import { DeliveryRequestedEventV1 } from '../../delivery/events/delivery-requested.event';
import { DeliveryService } from '../../delivery/services/delivery.service';
import { CreateOrderCommand } from '../../order/commands/create-order.command';
import { OrderEntity } from '../../order/entities/order.entity';
import { PaymentIntentStatus } from '../../payment/dto/payment.enums';
import { PaymentIntentEntity } from '../../payment/entities/payment-intent.entity';
import { RiderEntity } from '../../rider/entities/rider.entity';
import {
  BillingSummaryDto,
  BusinessDeliveriesQueryDto,
  BusinessOverviewDto,
  DeliveryDetailDto,
  DeliveryListItemDto,
  DeliveryRequestResultDto,
  DeliveryTimelineItemDto,
  PaymentStateFilter,
} from '../dto';

import { AdminScopeService } from './admin-scope.service';

const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  DeliveryStatus.Requested,
  DeliveryStatus.Assigned,
  DeliveryStatus.PickedUp,
  DeliveryStatus.InTransit,
];

@Injectable()
export class BusinessOwnerDashboardService {
  private readonly logger = new Logger(BusinessOwnerDashboardService.name);

  constructor(
    @InjectRepository(BusinessEntity)
    private readonly businessRepository: Repository<BusinessEntity>,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(DeliveryEntity)
    private readonly deliveryRepository: Repository<DeliveryEntity>,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepository: Repository<InvoiceEntity>,
    @InjectRepository(ChargeEntity)
    private readonly chargeRepository: Repository<ChargeEntity>,
    @InjectRepository(PaymentIntentEntity)
    private readonly paymentIntentRepository: Repository<PaymentIntentEntity>,
    @InjectRepository(RiderEntity)
    private readonly riderRepository: Repository<RiderEntity>,
    private readonly adminScopeService: AdminScopeService,
    private readonly commandBus: CommandBus,
    private readonly deliveryLifecycleCoordinator: DeliveryLifecycleCoordinator,
    private readonly deliveryMatchingCoordinator: DeliveryMatchingCoordinator,
    private readonly deliveryService: DeliveryService,
    private readonly eventBus: EventBusService,
  ) { }

  async listMyBusinesses(actorId: string | null, workspaceId: string | null): Promise<{
    businessId: string;
    businessName: string;
  }[]> {
    const businessIds = await this.adminScopeService.getScopedBusinessIds(actorId, workspaceId);
    if (businessIds.length === 0) {
      return [];
    }

    const businesses = await this.businessRepository.find({
      where: { id: In(businessIds) },
      order: { createdAt: 'ASC' },
    });

    return businesses.map((b) => ({ businessId: b.id, businessName: b.businessName }));
  }

  async getOverview(
    businessId: string,
    actorId: string | null,
    workspaceId: string | null
  ): Promise<BusinessOverviewDto> {
    await this.assertBusinessInScope(businessId, actorId, workspaceId);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const deliveries = await this.deliveryRepository.find({
      where: {
        businessId,
        createdAt: Between(monthStart, now),
      },
      select: ['id', 'status'],
    });

    const deliveryIds = deliveries.map((d) => d.id);
    const spendData = await this.getSpendForDeliveryIds(deliveryIds);

    return {
      monthStart,
      monthEnd: now,
      totalDeliveries: deliveries.length,
      activeDeliveries: deliveries.filter((d) =>
        ACTIVE_DELIVERY_STATUSES.includes(d.status )
      ).length,
      successfulDeliveries: deliveries.filter(
        (d) => d.status === DeliveryStatus.Delivered
      ).length,
      cancelledDeliveries: deliveries.filter(
        (d) => d.status === DeliveryStatus.Cancelled
      ).length,
      spendThisMonth: spendData.totalSpend,
      currency: spendData.currency,
    };
  }

  async requestDelivery(
    businessId: string,
    actorId: string | null,
    workspaceId: string | null,
    input: {
      pickupLocationId: string;
      dropoffLocationId: string;
      recipientName: string;
      recipientPhone: string;
      itemDescription: string;
      scheduledPickupTime?: Date;
      declaredItemValue?: number;
      specialInstructions?: string;
      distanceKm?: number;
    }
  ): Promise<DeliveryRequestResultDto> {
    await this.assertBusinessInScope(businessId, actorId, workspaceId);
    if (!actorId || !workspaceId) {
      throw new ForbiddenException('Authenticated actor context is required');
    }

    const orderInput = CreateOrderCommand.validate({
      businessId,
      itemSummary: input.itemDescription,
      customerName: input.recipientName,
      customerPhone: input.recipientPhone,
      scheduledTime: input.scheduledPickupTime,
      itemMetadata: {
        pickupLocationId: input.pickupLocationId,
        dropoffLocationId: input.dropoffLocationId,
        declaredItemValue: input.declaredItemValue ?? null,
        specialInstructions: input.specialInstructions ?? null,
      },
    });

    const orderId = await this.commandBus.execute<CreateOrderCommand, string>(
      new CreateOrderCommand(orderInput)
    );

    const lifecycleResult = await this.deliveryLifecycleCoordinator.createDelivery({
      businessId,
      actorId,
      workspaceId,
      pickupLocationId: input.pickupLocationId,
      dropoffLocationId: input.dropoffLocationId,
      isScheduled: !!input.scheduledPickupTime,
      scheduledPickupTime: input.scheduledPickupTime,
      distanceKm: input.distanceKm,
    });

    await this.orderRepository.update(orderId, { deliveryId: lifecycleResult.deliveryId });
    await this.deliveryService.linkOrders(lifecycleResult.deliveryId, [orderId]);

    const requestedEvent = new DeliveryRequestedEventV1({
      eventId: uuidv4(),
      deliveryId: lifecycleResult.deliveryId,
      businessId,
      workspaceId,
      actorId,
      orderId,
      requestedAt: new Date(),
      estimatedCharges: lifecycleResult.estimatedCharges,
      currency: 'KES',
      itemSummary: input.itemDescription,
      customerName: input.recipientName,
      customerPhone: input.recipientPhone,
      scheduledPickupTime: input.scheduledPickupTime ?? null,
    });

    await this.eventBus.publish(NatsSubjects.Delivery.REQUESTED_V1, requestedEvent);

    let assignedRiderId: string | null = null;
    let matchingTriggered = false;

    // Scheduled deliveries are matched later by scheduler/dispatcher.
    if (!input.scheduledPickupTime) {
      matchingTriggered = true;
      try {
        const matchingResult = await this.deliveryMatchingCoordinator.findAndAssignRider(
          lifecycleResult.deliveryId
        );
        assignedRiderId = matchingResult.success ? matchingResult.assignedRiderId ?? null : null;
      } catch (error) {
        this.logger.warn(
          `Auto-matching failed for delivery ${lifecycleResult.deliveryId}: ${(error as Error).message}`
        );
      }
    }

    return {
      deliveryId: lifecycleResult.deliveryId,
      orderId,
      estimatedCharges: lifecycleResult.estimatedCharges,
      currency: 'KES',
      matchingTriggered,
      assignedRiderId,
    };
  }

  async listDeliveries(
    businessId: string,
    actorId: string | null,
    workspaceId: string | null,
    pagination: PaginationParams,
    sort: { field: string; order: 'ASC' | 'DESC' } | null,
    query: BusinessDeliveriesQueryDto
  ): Promise<{
    data: DeliveryListItemDto[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    await this.assertBusinessInScope(businessId, actorId, workspaceId);

    const candidates = await this.deliveryRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });

    const paymentStateMap = await this.buildPaymentStateByDelivery(
      candidates.map((d) => d.id)
    );

    const from = parseDate(query.from);
    const to = parseDate(query.to);
    const filtered = candidates.filter((delivery) =>
      this.matchesDeliveryFilter(delivery, paymentStateMap[delivery.id] ?? null, query, from, to)
    );

    const [ordered, total] = sortDeliveries(filtered, sort);
    const pageData = ordered.slice(
      pagination.offset,
      pagination.offset + pagination.limit
    );

    const data = await this.enrichDeliveryRows(pageData, paymentStateMap);

    return {
      data,
      meta: createPaginationMeta(pagination, total),
    };
  }

  async getDeliveryDetail(
    businessId: string,
    deliveryId: string,
    actorId: string | null,
    workspaceId: string | null
  ): Promise<DeliveryDetailDto> {
    await this.assertBusinessInScope(businessId, actorId, workspaceId);
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId, businessId },
    });

    if (!delivery) {
      throw new ForbiddenException(`Delivery "${deliveryId}" is not in scope`);
    }

    const timeline = await this.getDeliveryTimelineInternal(deliveryId);
    const rider = delivery.assignedRiderId
      ? await this.riderRepository.findOne({ where: { id: delivery.assignedRiderId } })
      : null;
    const paymentStatus = (await this.buildPaymentStateByDelivery([deliveryId]))[deliveryId] ?? null;

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      riderId: rider?.id ?? null,
      riderName: rider?.fullName ?? null,
      riderPhone: rider?.phone ?? null,
      scheduledPickupTime: delivery.scheduledPickupTime,
      scheduledDropoffTime: delivery.scheduledDropoffTime,
      eta: estimateEta(delivery),
      paymentStatus,
      timeline,
    };
  }

  async getDeliveryTimeline(
    deliveryId: string,
    actorId: string | null,
    workspaceId: string | null
  ): Promise<DeliveryTimelineItemDto[]> {
    const delivery = await this.deliveryRepository.findOne({ where: { id: deliveryId } });
    if (!delivery) {
      return [];
    }

    await this.assertBusinessInScope(delivery.businessId, actorId, workspaceId);
    return this.getDeliveryTimelineInternal(deliveryId);
  }

  async getBillingSummary(
    businessId: string,
    actorId: string | null,
    workspaceId: string | null
  ): Promise<BillingSummaryDto> {
    await this.assertBusinessInScope(businessId, actorId, workspaceId);
    const invoiceIds = await this.getBusinessInvoiceIds(businessId);
    if (invoiceIds.length === 0) {
      return {
        currency: 'KES',
        totalSpend: 0,
        pendingCharges: 0,
        paidDeliveries: 0,
        campaignSubsidyDiscounts: 0,
        invoiceHistory: [],
      };
    }

    const invoices = await this.invoiceRepository.find({
      where: { id: In(invoiceIds) },
      order: { createdAt: 'DESC' },
    });

    const charges = await this.chargeRepository.find({
      where: {
        invoiceId: In(invoiceIds),
        chargeType: In([ChargeType.DISCOUNT, ChargeType.SUBSIDY]),
      },
    });

    const totalSpend = invoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal || '0'), 0);
    const pendingCharges = invoices
      .filter((inv) => inv.status !== 'PAID')
      .reduce((sum, inv) => sum + parseFloat(inv.grandTotal || '0'), 0);
    const paidDeliveries = invoices.filter((inv) => inv.status === 'PAID' && inv.deliveryId).length;
    const campaignSubsidyDiscounts = Math.abs(
      charges.reduce((sum, c) => sum + parseFloat(c.amount || '0'), 0)
    );

    return {
      currency: invoices[0]?.currency ?? 'KES',
      totalSpend,
      pendingCharges,
      paidDeliveries,
      campaignSubsidyDiscounts,
      invoiceHistory: invoices.map((inv) => ({
        invoiceId: inv.id,
        status: inv.status,
        grandTotal: parseFloat(inv.grandTotal || '0'),
        currency: inv.currency,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        createdAt: inv.createdAt,
      })),
    };
  }

  private async getDeliveryTimelineInternal(deliveryId: string): Promise<DeliveryTimelineItemDto[]> {
    const delivery = await this.deliveryRepository.findOne({ where: { id: deliveryId } });
    if (!delivery) {
      return [];
    }

    const order = await this.orderRepository.findOne({ where: { deliveryId } });
    const invoice = await this.invoiceRepository.findOne({ where: { deliveryId } });

    const timeline: DeliveryTimelineItemDto[] = [];

    if (order) {
      timeline.push({
        type: 'ORDER_CREATED',
        title: 'Order created',
        timestamp: order.createdAt,
      });
    }

    timeline.push({
      type: 'DELIVERY_REQUESTED',
      title: 'Delivery request accepted',
      timestamp: delivery.createdAt,
    });

    if (delivery.assignedAt) {
      timeline.push({
        type: 'RIDER_ASSIGNED',
        title: 'Rider assigned',
        timestamp: delivery.assignedAt,
      });
    }

    if (delivery.pickedUpAt) {
      timeline.push({
        type: 'PICKED_UP',
        title: 'Pickup confirmed',
        timestamp: delivery.pickedUpAt,
      });
    }

    if (delivery.deliveredAt) {
      timeline.push({
        type: 'DELIVERED',
        title: 'Delivery completed',
        timestamp: delivery.deliveredAt,
      });
    }

    if (delivery.cancelledAt) {
      timeline.push({
        type: 'CANCELLED',
        title: 'Delivery cancelled',
        timestamp: delivery.cancelledAt,
      });
    }

    if (invoice) {
      timeline.push({
        type: 'INVOICE_CREATED',
        title: 'Invoice created',
        timestamp: invoice.createdAt,
      });

      if (invoice.paidAt) {
        timeline.push({
          type: 'INVOICE_PAID',
          title: 'Invoice paid',
          timestamp: invoice.paidAt,
        });
      }
    }

    return timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private async enrichDeliveryRows(
    deliveries: DeliveryEntity[],
    paymentStateMap: Record<string, string | null>
  ): Promise<DeliveryListItemDto[]> {
    const deliveryIds = deliveries.map((d) => d.id);
    if (deliveryIds.length === 0) {
      return [];
    }

    const riderIds = deliveries
      .map((d) => d.assignedRiderId)
      .filter((id): id is string => !!id);

    const [orders, invoices, riders] = await Promise.all([
      this.orderRepository.find({ where: { deliveryId: In(deliveryIds) } }),
      this.invoiceRepository.find({ where: { deliveryId: In(deliveryIds) } }),
      riderIds.length > 0 ? this.riderRepository.find({ where: { id: In(riderIds) } }) : [],
    ]);

    const orderByDelivery = new Map(orders.map((o) => [o.deliveryId ?? '', o]));
    const invoiceByDelivery = new Map(invoices.map((i) => [i.deliveryId ?? '', i]));
    const riderById = new Map(riders.map((r) => [r.id, r]));

    return deliveries.map((delivery) => {
      const order = orderByDelivery.get(delivery.id);
      const invoice = invoiceByDelivery.get(delivery.id);
      const rider = delivery.assignedRiderId ? riderById.get(delivery.assignedRiderId) : null;

      return {
        deliveryId: delivery.id,
        orderId: order?.id ?? null,
        status: delivery.status,
        customerName: order?.customerName ?? null,
        customerPhone: order?.customerPhone ?? null,
        pickupLocationId: delivery.pickupLocationId,
        dropoffLocationId: delivery.dropoffLocationId,
        assignedRiderId: delivery.assignedRiderId,
        assignedRiderName: rider?.fullName ?? null,
        assignedRiderPhone: rider?.phone ?? null,
        price: invoice ? parseFloat(invoice.grandTotal || '0') : null,
        currency: invoice?.currency ?? null,
        scheduledPickupTime: delivery.scheduledPickupTime,
        createdAt: delivery.createdAt,
        paymentStatus: paymentStateMap[delivery.id] ?? null,
        itemSummary: order?.itemSummary ?? null,
      };
    });
  }

  private async getSpendForDeliveryIds(deliveryIds: string[]): Promise<{ totalSpend: number; currency: string }> {
    if (deliveryIds.length === 0) {
      return { totalSpend: 0, currency: 'KES' };
    }

    const invoices = await this.invoiceRepository.find({
      where: { deliveryId: In(deliveryIds) },
      select: ['grandTotal', 'currency'],
    });

    return {
      totalSpend: invoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal || '0'), 0),
      currency: invoices[0]?.currency ?? 'KES',
    };
  }

  private async buildPaymentStateByDelivery(
    deliveryIds: string[]
  ): Promise<Record<string, string | null>> {
    const stateByDelivery: Record<string, string | null> = {};
    if (deliveryIds.length === 0) {
      return stateByDelivery;
    }

    const invoices = await this.invoiceRepository.find({
      where: { deliveryId: In(deliveryIds) },
      select: ['id', 'deliveryId', 'status'],
    });
    const invoiceIds = invoices.map((inv) => inv.id);

    const intents = invoiceIds.length
      ? await this.paymentIntentRepository.find({
        where: { invoiceId: In(invoiceIds) },
        order: { createdAt: 'DESC' },
      })
      : [];

    const invoiceToIntent = new Map<string, PaymentIntentEntity>();
    intents.forEach((intent) => {
      if (intent.invoiceId && !invoiceToIntent.has(intent.invoiceId)) {
        invoiceToIntent.set(intent.invoiceId, intent);
      }
    });

    for (const invoice of invoices) {
      const intent = invoiceToIntent.get(invoice.id);
      if (!invoice.deliveryId) {
        continue;
      }
      if (!intent) {
        stateByDelivery[invoice.deliveryId] = 'UNPAID';
      } else {
        stateByDelivery[invoice.deliveryId] = intent.status;
      }
    }

    for (const deliveryId of deliveryIds) {
      if (!(deliveryId in stateByDelivery)) {
        stateByDelivery[deliveryId] = null;
      }
    }

    return stateByDelivery;
  }

  private matchesDeliveryFilter(
    delivery: DeliveryEntity,
    paymentState: string | null,
    query: BusinessDeliveriesQueryDto,
    from: Date | null,
    to: Date | null
  ): boolean {
    if (query.status && delivery.status !== query.status) {
      return false;
    }

    if (query.riderId && delivery.assignedRiderId !== query.riderId) {
      return false;
    }

    if (
      query.locationId &&
      delivery.pickupLocationId !== query.locationId &&
      delivery.dropoffLocationId !== query.locationId
    ) {
      return false;
    }

    if (from && delivery.createdAt < from) {
      return false;
    }

    if (to && delivery.createdAt > to) {
      return false;
    }

    if (query.activeOnly === 'true' && !ACTIVE_DELIVERY_STATUSES.includes(delivery.status)) {
      return false;
    }

    if (!matchesPaymentState(query.paymentState, paymentState)) {
      return false;
    }

    return true;
  }

  private async getBusinessInvoiceIds(businessId: string): Promise<string[]> {
    const [deliveryIds, orderIds] = await Promise.all([
      this.deliveryRepository.find({ where: { businessId }, select: ['id'] }),
      this.orderRepository.find({ where: { businessId }, select: ['id'] }),
    ]);

    const deliveries = deliveryIds.map((d) => d.id);
    const orders = orderIds.map((o) => o.id);

    if (deliveries.length === 0 && orders.length === 0) {
      return [];
    }

    const where: FindOptionsWhere<InvoiceEntity>[] = [];
    if (deliveries.length > 0) {
      where.push({ deliveryId: In(deliveries) });
    }
    if (orders.length > 0) {
      where.push({ orderId: In(orders) });
    }

    const invoices = await this.invoiceRepository.find({
      where,
      select: ['id'],
    });
    return invoices.map((inv) => inv.id);
  }

  private async assertBusinessInScope(
    businessId: string,
    actorId: string | null,
    workspaceId: string | null
  ): Promise<void> {
    const scoped = await this.adminScopeService.isBusinessInScope(
      businessId,
      actorId,
      workspaceId
    );
    if (!scoped) {
      throw new ForbiddenException(`Business "${businessId}" is not within your scope`);
    }
  }
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? null : d;
}

function sortDeliveries(
  deliveries: DeliveryEntity[],
  sort: { field: string; order: 'ASC' | 'DESC' } | null
): [DeliveryEntity[], number] {
  const total = deliveries.length;
  const direction = sort?.order === 'ASC' ? 1 : -1;
  const field = sort?.field ?? 'createdAt';

  const allowedFields = new Set(['createdAt', 'scheduledPickupTime', 'status', 'updatedAt']);
  const sortField = allowedFields.has(field) ? field : 'createdAt';

  const ordered = [...deliveries].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[sortField];
    const bv = (b as unknown as Record<string, unknown>)[sortField];

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (av instanceof Date && bv instanceof Date) {
      return (av.getTime() - bv.getTime()) * direction;
    }

    return String(av).localeCompare(String(bv)) * direction;
  });

  return [ordered, total];
}

function estimateEta(delivery: DeliveryEntity): Date | null {
  if (delivery.deliveredAt || delivery.cancelledAt) {
    return null;
  }

  if (delivery.scheduledDropoffTime) {
    return delivery.scheduledDropoffTime;
  }

  if (delivery.pickedUpAt) {
    return new Date(delivery.pickedUpAt.getTime() + 30 * 60 * 1000);
  }

  return null;
}

function matchesPaymentState(
  filter: PaymentStateFilter | undefined,
  actual: string | null
): boolean {
  if (!filter) {
    return true;
  }
  if (filter === 'UNPAID') {
    return actual === null || actual === 'UNPAID';
  }
  if (filter === 'PAID') {
    return actual === PaymentIntentStatus.SUCCEEDED;
  }
  if (filter === 'FAILED') {
    return actual === PaymentIntentStatus.FAILED || actual === PaymentIntentStatus.CANCELLED;
  }
  if (filter === 'PENDING') {
    return (
      actual === PaymentIntentStatus.CREATED ||
      actual === PaymentIntentStatus.PENDING ||
      actual === PaymentIntentStatus.PROCESSING
    );
  }
  return true;
}
