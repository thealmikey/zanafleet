import type { SystemMetrics, SettlementSummary, PolicySummary } from '../../services/dashboardApi';

export function createAdminMetrics(periodDays = 30): SystemMetrics {
  return {
    totalOrders: 1247,
    totalDeliveries: 1189,
    totalRevenue: 2456780,
    activeRiders: 78,
    periodDays,
  };
}

export function createSettlements(): SettlementSummary[] {
  const now = new Date();
  return [
    {
      batchId: 'batch_001',
      status: 'completed',
      totalAmount: 125000,
      recipientCount: 45,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      processedAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      batchId: 'batch_002',
      status: 'processing',
      totalAmount: 98500,
      recipientCount: 38,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      processedAt: null,
    },
    {
      batchId: 'batch_003',
      status: 'pending',
      totalAmount: 145200,
      recipientCount: 52,
      createdAt: new Date(),
      processedAt: null,
    },
  ];
}

export function createPolicies(): PolicySummary[] {
  const now = new Date();
  return [
    {
      policyId: 'policy_001',
      name: 'Peak Hour Surge',
      scope: 'pricing',
      status: 'active',
      trigger: 'time_based',
      priority: 10,
      createdAt: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
    },
    {
      policyId: 'policy_002',
      name: 'New Rider Bonus',
      scope: 'incentive',
      status: 'active',
      trigger: 'rider_milestone',
      priority: 5,
      createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    },
    {
      policyId: 'policy_003',
      name: 'Weekend Discount',
      scope: 'pricing',
      status: 'paused',
      trigger: 'day_of_week',
      priority: 3,
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
  ];
}
