import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Gavel as DisputesIcon,
  Warning as EscalatedIcon,
  MoneyOff as RefundsIcon,
  CheckCircle as ResolvedIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

import { DashboardLayout } from '../../components/Layout';
import {
  KPIGrid,
  ListWithPagination,
  BarChart,
  sampleDeliveryVolumes,
} from '../../components/common';
import type { KPIGridItem } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import {
  getSupportMetrics,
  getSupportDisputes,
  getSupportRefunds,
  getSupportRecentPayments,
  SupportMetrics,
  DisputeSummary,
  RefundSummary,
  PaymentActivitySummary,
  PaginationMeta,
} from '../../services/dashboardApi';

type SupportTab = 'metrics' | 'disputes' | 'refunds' | 'payments';

const TAB_PATHS: Record<SupportTab, string> = {
  metrics: '/dashboard/support',
  disputes: '/dashboard/support/disputes',
  refunds: '/dashboard/support/refunds',
  payments: '/dashboard/support/history',
};

function getTabFromPath(pathname: string): SupportTab {
  if (pathname.includes('/disputes')) return 'disputes';
  if (pathname.includes('/refunds')) return 'refunds';
  if (pathname.includes('/history')) return 'payments';
  return 'metrics';
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString();
}

function getStatusColor(status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  const s = status.toLowerCase();
  if (s === 'resolved' || s === 'processed' || s === 'succeeded') return 'success';
  if (s === 'open' || s === 'pending') return 'warning';
  if (s === 'escalated' || s === 'failed') return 'error';
  return 'default';
}

function MetricsTab(): React.ReactElement {
  const theme = useTheme();
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    getSupportMetrics(token, 30)
      .then(setMetrics)
      .catch((err) => setError(err.message || 'Failed to load metrics'))
      .finally(() => setLoading(false));
  }, [token]);

  const kpiItems: KPIGridItem[] = metrics
    ? [
        {
          title: 'Open Disputes',
          value: metrics.openDisputes.toLocaleString(),
          icon: <DisputesIcon fontSize="large" />,
          color: 'warning',
          loading,
        },
        {
          title: 'Escalated',
          value: metrics.escalatedDisputes.toLocaleString(),
          icon: <EscalatedIcon fontSize="large" />,
          color: 'error',
          loading,
        },
        {
          title: 'Pending Refunds',
          value: metrics.pendingRefunds.toLocaleString(),
          icon: <RefundsIcon fontSize="large" />,
          color: 'primary',
          loading,
        },
        {
          title: 'Resolved Today',
          value: metrics.resolvedToday.toLocaleString(),
          icon: <ResolvedIcon fontSize="large" />,
          color: 'success',
          loading,
        },
      ]
    : [
        { title: 'Open Disputes', value: '-', loading: true },
        { title: 'Escalated', value: '-', loading: true },
        { title: 'Pending Refunds', value: '-', loading: true },
        { title: 'Resolved Today', value: '-', loading: true },
      ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Support Overview
      </Typography>
      <Box sx={{ mb: 4 }}>
        <KPIGrid items={kpiItems} md={3} />
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Workload (Last 7 Days)
          </Typography>
          <BarChart
            data={sampleDeliveryVolumes(theme.palette)}
            height={240}
            ariaLabel="Support workload bar chart"
          />
        </CardContent>
      </Card>
    </Box>
  );
}

function DisputesTab(): React.ReactElement {
  const { token } = useAuth();
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDisputes = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getSupportDisputes(token, { page, limit: 10 })
        .then((result) => {
          setDisputes(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load disputes'))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    loadDisputes(1);
  }, [loadDisputes]);

  const handlePageChange = (page: number): void => {
    loadDisputes(page);
  };

  const renderDispute = (dispute: DisputeSummary): React.ReactNode => (
    <Card sx={{ width: '100%', mb: 1 }} data-testid={`dispute-item-${dispute.disputeId}`}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2">{dispute.disputeId}</Typography>
          <Chip label={dispute.status} size="small" color={getStatusColor(dispute.status)} />
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {dispute.reason}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="primary">
            {formatCurrency(dispute.amount)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(dispute.createdAt)}
          </Typography>
        </Box>
        {dispute.escalatedAt && (
          <Typography variant="caption" color="error">
            Escalated: {formatDateTime(dispute.escalatedAt)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Disputes
      </Typography>

      <ListWithPagination
        items={disputes}
        renderItem={renderDispute}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No disputes found"
        getItemKey={(d) => d.disputeId}
      />
    </Box>
  );
}

function RefundsTab(): React.ReactElement {
  const { token } = useAuth();
  const [refunds, setRefunds] = useState<RefundSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRefunds = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getSupportRefunds(token, { page, limit: 10 })
        .then((result) => {
          setRefunds(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load refunds'))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    loadRefunds(1);
  }, [loadRefunds]);

  const handlePageChange = (page: number): void => {
    loadRefunds(page);
  };

  const renderRefund = (refund: RefundSummary): React.ReactNode => (
    <Card sx={{ width: '100%', mb: 1 }} data-testid={`refund-item-${refund.refundId}`}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2">{refund.refundId}</Typography>
          <Chip label={refund.status} size="small" color={getStatusColor(refund.status)} />
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {refund.reason}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="primary">
            {formatCurrency(refund.amount)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(refund.createdAt)}
          </Typography>
        </Box>
        {refund.processedAt && (
          <Typography variant="caption" color="success.main">
            Processed: {formatDateTime(refund.processedAt)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Refunds
      </Typography>

      <ListWithPagination
        items={refunds}
        renderItem={renderRefund}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No refunds found"
        getItemKey={(r) => r.refundId}
      />
    </Box>
  );
}

function RecentPaymentsTab(): React.ReactElement {
  const { token } = useAuth();
  const [payments, setPayments] = useState<PaymentActivitySummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getSupportRecentPayments(token, { page, limit: 10 })
        .then((result) => {
          setPayments(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load payments'))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    loadPayments(1);
  }, [loadPayments]);

  const handlePageChange = (page: number): void => {
    loadPayments(page);
  };

  const renderPayment = (payment: PaymentActivitySummary): React.ReactNode => (
    <Card sx={{ width: '100%', mb: 1 }} data-testid={`payment-item-${payment.paymentIntentId}`}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2">{payment.paymentIntentId}</Typography>
          <Chip label={payment.status} size="small" color={getStatusColor(payment.status)} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="primary">
            {payment.currency} {payment.amount.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDateTime(payment.createdAt)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Recent Payments
      </Typography>

      <ListWithPagination
        items={payments}
        renderItem={renderPayment}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No recent payments found"
        getItemKey={(p) => p.paymentIntentId}
      />
    </Box>
  );
}

function SupportDashboardContent(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getTabFromPath(location.pathname);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: SupportTab): void => {
    navigate(TAB_PATHS[newValue]);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Support Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Support dashboard tabs">
          <Tab label="Metrics" value="metrics" id="support-tab-metrics" />
          <Tab label="Disputes" value="disputes" id="support-tab-disputes" />
          <Tab label="Refunds" value="refunds" id="support-tab-refunds" />
          <Tab label="Recent Payments" value="payments" id="support-tab-payments" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="disputes" element={<DisputesTab />} />
        <Route path="refunds" element={<RefundsTab />} />
        <Route path="history" element={<RecentPaymentsTab />} />
        <Route path="*" element={<Navigate to="/dashboard/support" replace />} />
      </Routes>
    </Container>
  );
}

export function SupportDashboard(): React.ReactElement {
  return (
    <DashboardLayout title="Support Dashboard">
      <SupportDashboardContent />
    </DashboardLayout>
  );
}
