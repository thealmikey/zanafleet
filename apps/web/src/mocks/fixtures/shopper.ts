export const createShopperOrders = () => [
  {
    orderId: 'ord_shop_001',
    businessId: 'bus_001',
    businessName: 'SuperMart Nairobi',
    status: 'Delivered',
    totalAmount: 2450,
    itemSummary: 'Monthly Groceries',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    orderId: 'ord_shop_002',
    businessId: 'bus_002',
    businessName: 'Health First Pharmacy',
    status: 'InTransit',
    totalAmount: 1200,
    itemSummary: 'Vitamin C, Painkillers',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    orderId: 'ord_shop_003',
    businessId: 'bus_001',
    businessName: 'SuperMart Nairobi',
    status: 'Delivered',
    totalAmount: 850,
    itemSummary: 'Milk, Bread, Eggs',
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
  },
];

export const createShopperInsights = () => ({
  totalSpendMonth: 4500,
  topMerchant: 'SuperMart Nairobi',
  merchantAffinity: [
    { name: 'SuperMart Nairobi', spend: 3300, orders: 2 },
    { name: 'Health First Pharmacy', spend: 1200, orders: 1 },
  ],
  spendingTrend: [
    { month: 'Jan', amount: 3200 },
    { month: 'Feb', amount: 4500 },
  ],
});
