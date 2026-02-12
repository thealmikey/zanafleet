import type {
  ActiveDeliverySummary,
  EarningsSummary,
} from '../../services/dashboardApi';

export function createActiveDeliveries(riderId: string): ActiveDeliverySummary[] {
  const now = new Date();
  return [
    {
      deliveryId: `del_${riderId}_active_001`,
      status: 'picked_up',
      pickupAddress: '123 Business Center, Nairobi',
      dropoffAddress: '456 Residential Estate, Lavington',
      estimatedEarnings: 350,
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
      pickedUpAt: new Date(now.getTime() - 15 * 60 * 1000),
      recipientName: 'Alice Johnson',
      recipientPhone: '+254711222333',
    },
    {
      deliveryId: `del_${riderId}_active_002`,
      status: 'assigned',
      pickupAddress: '789 Mall Complex, Westlands',
      dropoffAddress: '321 Office Tower, CBD',
      estimatedEarnings: 420,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000),
      pickedUpAt: null,
      recipientName: 'Bob Smith',
      recipientPhone: '+254722333444',
    },
  ];
}

export function createDeliveryHistory(riderId: string): ActiveDeliverySummary[] {
  const now = new Date();
  return [
    {
      deliveryId: `del_${riderId}_hist_001`,
      status: 'delivered',
      pickupAddress: '100 Warehouse Rd, Industrial Area',
      dropoffAddress: '200 Home St, Kilimani',
      estimatedEarnings: 380,
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      pickedUpAt: new Date(now.getTime() - 3.5 * 60 * 60 * 1000),
      recipientName: 'Customer A',
      recipientPhone: '+254733444555',
    },
    {
      deliveryId: `del_${riderId}_hist_002`,
      status: 'delivered',
      pickupAddress: '50 Shop Lane, Parklands',
      dropoffAddress: '75 Apartment Block, Kileleshwa',
      estimatedEarnings: 290,
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000),
      pickedUpAt: new Date(now.getTime() - 7.5 * 60 * 60 * 1000),
      recipientName: 'Customer B',
      recipientPhone: '+254744555666',
    },
    {
      deliveryId: `del_${riderId}_hist_003`,
      status: 'delivered',
      pickupAddress: '25 Restaurant Row, Hurlingham',
      dropoffAddress: '30 Gated Community, Runda',
      estimatedEarnings: 550,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      pickedUpAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
      recipientName: 'Customer C',
      recipientPhone: '+254755666777',
    },
    {
      deliveryId: `del_${riderId}_hist_004`,
      status: 'cancelled',
      pickupAddress: '10 Pharmacy Plaza, South C',
      dropoffAddress: '15 Estate Gate, South B',
      estimatedEarnings: 0,
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      pickedUpAt: null,
      recipientName: 'Customer D',
      recipientPhone: '+254766777888',
    },
  ];
}

export function createEarningsSummary(periodDays = 30): EarningsSummary {
  return {
    totalEarnings: 45600,
    pendingPayout: 8200,
    completedDeliveries: 124,
    averagePerDelivery: 368,
    periodDays,
  };
}
