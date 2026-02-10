import type {
  SupportMetrics,
  DisputeSummary,
  RefundSummary,
  PaymentActivitySummary,
} from '../../services/dashboardApi';

export function createSupportMetrics(periodDays = 30): SupportMetrics {
  return {
    openDisputes: 23,
    escalatedDisputes: 5,
    pendingRefunds: 12,
    resolvedToday: 8,
    periodDays,
  };
}

export function createDisputes(): DisputeSummary[] {
  const now = new Date();
  return [
    {
      disputeId: 'dispute_001',
      status: 'open',
      reason: 'Item not delivered',
      amount: 2500,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      escalatedAt: null,
    },
    {
      disputeId: 'dispute_002',
      status: 'escalated',
      reason: 'Damaged goods',
      amount: 8500,
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      escalatedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
    {
      disputeId: 'dispute_003',
      status: 'open',
      reason: 'Wrong item delivered',
      amount: 3200,
      createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      escalatedAt: null,
    },
    {
      disputeId: 'dispute_004',
      status: 'resolved',
      reason: 'Late delivery',
      amount: 1500,
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      escalatedAt: null,
    },
    {
      disputeId: 'dispute_005',
      status: 'escalated',
      reason: 'Fraudulent charge',
      amount: 15000,
      createdAt: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      escalatedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    },
  ];
}

export function createEscalatedDisputes(): DisputeSummary[] {
  return createDisputes().filter((d) => d.status === 'escalated');
}

export function createRefunds(): RefundSummary[] {
  const now = new Date();
  return [
    {
      refundId: 'refund_001',
      status: 'pending',
      amount: 2500,
      reason: 'Order cancelled by customer',
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      processedAt: null,
    },
    {
      refundId: 'refund_002',
      status: 'processed',
      amount: 4200,
      reason: 'Duplicate charge',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      processedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
    },
    {
      refundId: 'refund_003',
      status: 'pending',
      amount: 1800,
      reason: 'Service not rendered',
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      processedAt: null,
    },
    {
      refundId: 'refund_004',
      status: 'failed',
      amount: 5500,
      reason: 'Customer dispute resolution',
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      processedAt: null,
    },
  ];
}

export function createPaymentActivity(): PaymentActivitySummary[] {
  const now = new Date();
  return [
    {
      paymentIntentId: 'pi_001',
      status: 'succeeded',
      amount: 4500,
      currency: 'KES',
      createdAt: new Date(now.getTime() - 30 * 60 * 1000),
    },
    {
      paymentIntentId: 'pi_002',
      status: 'succeeded',
      amount: 12000,
      currency: 'KES',
      createdAt: new Date(now.getTime() - 60 * 60 * 1000),
    },
    {
      paymentIntentId: 'pi_003',
      status: 'pending',
      amount: 7800,
      currency: 'KES',
      createdAt: new Date(now.getTime() - 90 * 60 * 1000),
    },
    {
      paymentIntentId: 'pi_004',
      status: 'failed',
      amount: 3200,
      currency: 'KES',
      createdAt: new Date(now.getTime() - 120 * 60 * 1000),
    },
    {
      paymentIntentId: 'pi_005',
      status: 'succeeded',
      amount: 8900,
      currency: 'KES',
      createdAt: new Date(now.getTime() - 180 * 60 * 1000),
    },
  ];
}
