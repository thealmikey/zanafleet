import type {
  BusinessMetrics,
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
      pickupAddress: '123 Warehouse Ave, Nairobi',
      dropoffAddress: '456 Customer St, Westlands',
      assignedRider: 'John Kamau',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
    },
    {
      deliveryId: `del_${businessId}_002`,
      status: 'delivered',
      pickupAddress: '123 Warehouse Ave, Nairobi',
      dropoffAddress: '789 Office Park, Karen',
      assignedRider: 'Mary Wanjiku',
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      completedAt: new Date(now.getTime() - 47 * 60 * 60 * 1000),
    },
    {
      deliveryId: `del_${businessId}_003`,
      status: 'in_transit',
      pickupAddress: '123 Warehouse Ave, Nairobi',
      dropoffAddress: '321 Mall Road, Kilimani',
      assignedRider: 'Peter Ochieng',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      completedAt: null,
    },
  ];
}

export function createInvoices(businessId: string): InvoiceSummary[] {
  const now = new Date();
  return [
    {
      invoiceId: `inv_${businessId}_001`,
      status: 'paid',
      totalAmount: 45000,
      dueDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000),
    },
    {
      invoiceId: `inv_${businessId}_002`,
      status: 'pending',
      totalAmount: 32000,
      dueDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      paidAt: null,
    },
    {
      invoiceId: `inv_${businessId}_003`,
      status: 'overdue',
      totalAmount: 18500,
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      paidAt: null,
    },
  ];
}
