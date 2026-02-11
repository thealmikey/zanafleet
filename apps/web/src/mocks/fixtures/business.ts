import type {
  BillingSummary,
  BusinessIdentity,
  BusinessOverview,
  DeliveryDetail,
  BusinessMetrics,
  DeliveryRequestResult,
  DeliveryTimelineItem,
  OrderSummary,
  DeliveryHistorySummary,
  InvoiceSummary,
} from '../../services/dashboardApi';

export function createBusinessMetrics(periodDays = 30): BusinessMetrics {
  return {
    totalOrders: 156,
    totalDeliveries: 148,
    totalSpent: 234500,
    averageDeliveryTime: 42,
    periodDays,
  };
}

export function createOrders(businessId: string): OrderSummary[] {
  const now = new Date();
  return [
    {
      orderId: `order_${businessId}_001`,
      status: 'pending',
      totalAmount: 4500,
      itemCount: 3,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
    },
    {
      orderId: `order_${businessId}_002`,
      status: 'in_progress',
      totalAmount: 12000,
      itemCount: 8,
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    },
    {
      orderId: `order_${businessId}_003`,
      status: 'delivered',
      totalAmount: 7800,
      itemCount: 5,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      orderId: `order_${businessId}_004`,
      status: 'delivered',
      totalAmount: 3200,
      itemCount: 2,
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
    {
      orderId: `order_${businessId}_005`,
      status: 'cancelled',
      totalAmount: 5600,
      itemCount: 4,
      createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
    },
  ];
}

export function createDeliveryHistory(businessId: string): DeliveryHistorySummary[] {
  const now = new Date();
  return [
    {
      deliveryId: `del_${businessId}_001`,
      status: 'delivered',
      orderId: `order_${businessId}_001`,
      customerName: 'Alice Wambui',
      customerPhone: '+254700111111',
      pickupLocationId: 'loc_pickup_warehouse_001',
      dropoffLocationId: 'loc_dropoff_westlands_001',
      assignedRiderId: 'rider_001',
      assignedRiderName: 'John Kamau',
      assignedRiderPhone: '+254711000111',
      price: 4500,
      currency: 'KES',
      scheduledPickupTime: null,
      paymentStatus: 'SUCCEEDED',
      itemSummary: 'Groceries package',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    },
    {
      deliveryId: `del_${businessId}_002`,
      status: 'delivered',
      orderId: `order_${businessId}_002`,
      customerName: 'Brian Otieno',
      customerPhone: '+254700222222',
      pickupLocationId: 'loc_pickup_warehouse_001',
      dropoffLocationId: 'loc_dropoff_karen_002',
      assignedRiderId: 'rider_002',
      assignedRiderName: 'Mary Wanjiku',
      assignedRiderPhone: '+254711000222',
      price: 7800,
      currency: 'KES',
      scheduledPickupTime: null,
      paymentStatus: 'SUCCEEDED',
      itemSummary: 'Office supplies',
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
    {
      deliveryId: `del_${businessId}_003`,
      status: 'in_transit',
      orderId: `order_${businessId}_003`,
      customerName: 'Carol Njeri',
      customerPhone: '+254700333333',
      pickupLocationId: 'loc_pickup_warehouse_001',
      dropoffLocationId: 'loc_dropoff_kilimani_003',
      assignedRiderId: 'rider_003',
      assignedRiderName: 'Peter Ochieng',
      assignedRiderPhone: '+254711000333',
      price: 5600,
      currency: 'KES',
      scheduledPickupTime: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      paymentStatus: 'PENDING',
      itemSummary: 'Electronics parcel',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    },
  ];
}

export function createInvoices(businessId: string): InvoiceSummary[] {
  const now = new Date();
  return [
    {
      invoiceId: `inv_${businessId}_001`,
      status: 'paid',
      grandTotal: 45000,
      currency: 'KES',
      dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      invoiceId: `inv_${businessId}_002`,
      status: 'pending',
      grandTotal: 32000,
      currency: 'KES',
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: null,
      createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      invoiceId: `inv_${businessId}_003`,
      status: 'overdue',
      grandTotal: 18500,
      currency: 'KES',
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      paidAt: null,
      createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function createBusinessIdentities(): BusinessIdentity[] {
  return [
    {
      businessId: 'biz_demo_001',
      businessName: 'Acme Retail Ltd',
    },
  ];
}

export function createBusinessOverview(businessId: string): BusinessOverview {
  const deliveries = createDeliveryHistory(businessId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const now = new Date();

  const activeDeliveries = deliveries.filter((d) =>
    ['requested', 'assigned', 'pickedup', 'intransit'].includes(d.status.toLowerCase())
  ).length;
  const successfulDeliveries = deliveries.filter((d) => d.status.toLowerCase() === 'delivered').length;
  const cancelledDeliveries = deliveries.filter((d) => d.status.toLowerCase() === 'cancelled').length;
  const spendThisMonth = deliveries.reduce((sum, d) => sum + (d.price ?? 0), 0);

  return {
    monthStart: monthStart.toISOString(),
    monthEnd: now.toISOString(),
    totalDeliveries: deliveries.length,
    activeDeliveries,
    successfulDeliveries,
    cancelledDeliveries,
    spendThisMonth,
    currency: 'KES',
  };
}

export function createDeliveryTimeline(
  deliveryId: string,
  createdAt?: Date
): DeliveryTimelineItem[] {
  const started = createdAt ?? new Date();
  return [
    {
      type: 'DELIVERY_REQUESTED',
      title: 'Delivery request accepted',
      timestamp: started.toISOString(),
    },
    {
      type: 'RIDER_ASSIGNED',
      title: 'Rider assigned',
      timestamp: new Date(started.getTime() + 15 * 60 * 1000).toISOString(),
    },
    {
      type: 'PICKED_UP',
      title: 'Pickup confirmed',
      timestamp: new Date(started.getTime() + 45 * 60 * 1000).toISOString(),
      payload: { deliveryId },
    },
  ];
}

export function createDeliveryDetail(
  businessId: string,
  deliveryId: string
): DeliveryDetail {
  const deliveries = createDeliveryHistory(businessId);
  const match = deliveries.find((d) => d.deliveryId === deliveryId) ?? deliveries[0];
  const createdAt = match?.createdAt ? new Date(match.createdAt) : new Date();
  const timeline = createDeliveryTimeline(match?.deliveryId ?? deliveryId, createdAt);

  return {
    deliveryId: match?.deliveryId ?? deliveryId,
    status: match?.status ?? 'Requested',
    riderId: match?.assignedRiderId ?? null,
    riderName: match?.assignedRiderName ?? null,
    riderPhone: match?.assignedRiderPhone ?? null,
    scheduledPickupTime: match?.scheduledPickupTime ?? null,
    scheduledDropoffTime: null,
    eta: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
    paymentStatus: match?.paymentStatus ?? null,
    timeline,
  };
}

export function createBillingSummary(businessId: string): BillingSummary {
  const invoices = createInvoices(businessId);
  const totalSpend = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const pendingCharges = invoices
    .filter((i) => i.status.toLowerCase() !== 'paid')
    .reduce((sum, i) => sum + i.grandTotal, 0);
  const paidDeliveries = invoices.filter((i) => i.status.toLowerCase() === 'paid').length;

  return {
    currency: 'KES',
    totalSpend,
    pendingCharges,
    paidDeliveries,
    campaignSubsidyDiscounts: 2500,
    invoiceHistory: invoices,
  };
}

export function createDeliveryRequestResult(businessId: string): DeliveryRequestResult {
  const stamp = Date.now().toString().slice(-6);
  return {
    deliveryId: `del_${businessId}_${stamp}`,
    orderId: `order_${businessId}_${stamp}`,
    estimatedCharges: 3200,
    currency: 'KES',
    matchingTriggered: true,
    assignedRiderId: null,
  };
}
