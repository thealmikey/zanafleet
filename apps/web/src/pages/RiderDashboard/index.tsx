import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Container,
  Grid,
  Tab,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import {
  AttachMoney as EarningsIcon,
  LocalShipping as DeliveriesIcon,
  AccountBalanceWallet as PayoutIcon,
  TrendingUp as AverageIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

import { DashboardLayout } from '../../components/Layout';
import {
  KPIGrid,
  DeliveryCard,
  ListWithPagination,
  LineChart,
  sampleEarningsTrend,
} from '../../components/common';
import type { KPIGridItem } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import {
  getRiderActiveDeliveries,
  getRiderDeliveryHistory,
  getRiderEarnings,
  ActiveDeliverySummary,
  EarningsSummary,
  PaginationMeta,
} from '../../services/dashboardApi';

type RiderTab = 'active' | 'history' | 'earnings';

const TAB_PATHS: Record<RiderTab, string> = {
  active: '/dashboard/rider',
  history: '/dashboard/rider/history',
  earnings: '/dashboard/rider/earnings',
};

function getTabFromPath(pathname: string): RiderTab {
  if (pathname.includes('/history')) return 'history';
  if (pathname.includes('/earnings')) return 'earnings';
  return 'active';
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function useRiderId(): string {
  const { user } = useAuth();
  return user?.id ?? 'unknown';
}

function ActiveTab(): React.ReactElement {
  const { token } = useAuth();
  const riderId = useRiderId();
  const [deliveries, setDeliveries] = useState<ActiveDeliverySummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveries = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getRiderActiveDeliveries(token, riderId, { page, limit: 10 })
        .then((result) => {
          setDeliveries(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load active deliveries'))
        .finally(() => setLoading(false));
    },
    [token, riderId]
  );

  useEffect(() => {
    loadDeliveries(1);
  }, [loadDeliveries]);

  const handlePageChange = (page: number): void => {
    loadDeliveries(page);
  };

  const renderDelivery = (delivery: ActiveDeliverySummary): React.ReactNode => (
    <Box sx={{ width: '100%', mb: 1 }} data-testid={`active-delivery-${delivery.deliveryId}`}>
      <DeliveryCard
        deliveryId={delivery.deliveryId}
        status={delivery.status}
        pickupAddress={delivery.pickupAddress}
        dropoffAddress={delivery.dropoffAddress}
        estimatedEarnings={delivery.estimatedEarnings}
        createdAt={new Date(delivery.createdAt)}
      />
    </Box>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Active Deliveries
      </Typography>

      <ListWithPagination
        items={deliveries}
        renderItem={renderDelivery}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No active deliveries"
        getItemKey={(d) => d.deliveryId}
      />
    </Box>
  );
}

function HistoryTab(): React.ReactElement {
  const { token } = useAuth();
  const riderId = useRiderId();
  const [deliveries, setDeliveries] = useState<ActiveDeliverySummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveries = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getRiderDeliveryHistory(token, riderId, { page, limit: 10 })
        .then((result) => {
          setDeliveries(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load delivery history'))
        .finally(() => setLoading(false));
    },
    [token, riderId]
  );

  useEffect(() => {
    loadDeliveries(1);
  }, [loadDeliveries]);

  const handlePageChange = (page: number): void => {
    loadDeliveries(page);
  };

  const renderDelivery = (delivery: ActiveDeliverySummary): React.ReactNode => (
    <Box sx={{ width: '100%', mb: 1 }} data-testid={`history-delivery-${delivery.deliveryId}`}>
      <DeliveryCard
        deliveryId={delivery.deliveryId}
        status={delivery.status}
        pickupAddress={delivery.pickupAddress}
        dropoffAddress={delivery.dropoffAddress}
        estimatedEarnings={delivery.estimatedEarnings}
        createdAt={new Date(delivery.createdAt)}
      />
    </Box>
  );

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Delivery History
      </Typography>

      <ListWithPagination
        items={deliveries}
        renderItem={renderDelivery}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No delivery history"
        getItemKey={(d) => d.deliveryId}
      />
    </Box>
  );
}

function EarningsTab(): React.ReactElement {
  const theme = useTheme();
  const { token } = useAuth();
  const riderId = useRiderId();
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    getRiderEarnings(token, riderId, 30)
      .then(setEarnings)
      .catch((err) => setError(err.message || 'Failed to load earnings'))
      .finally(() => setLoading(false));
  }, [token, riderId]);

  const kpiItems: KPIGridItem[] = earnings
    ? [
        {
          title: 'Total Earnings',
          value: formatCurrency(earnings.totalEarnings),
          icon: <EarningsIcon fontSize="large" />,
          color: 'success',
          loading,
        },
        {
          title: 'Pending Payout',
          value: formatCurrency(earnings.pendingPayout),
          icon: <PayoutIcon fontSize="large" />,
          color: 'warning',
          loading,
        },
        {
          title: 'Completed Deliveries',
          value: earnings.completedDeliveries.toLocaleString(),
          icon: <DeliveriesIcon fontSize="large" />,
          color: 'primary',
          loading,
        },
        {
          title: 'Avg Per Delivery',
          value: formatCurrency(earnings.averagePerDelivery),
          icon: <AverageIcon fontSize="large" />,
          color: 'secondary',
          loading,
        },
      ]
    : [
        { title: 'Total Earnings', value: '-', loading: true },
        { title: 'Pending Payout', value: '-', loading: true },
        { title: 'Completed Deliveries', value: '-', loading: true },
        { title: 'Avg Per Delivery', value: '-', loading: true },
      ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Earnings Summary
      </Typography>
      <Box sx={{ mb: 4 }}>
        <KPIGrid items={kpiItems} sm={6} md={3} />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Earnings Trend
              </Typography>
              <LineChart
                data={sampleEarningsTrend(theme.palette)}
                height={240}
                ariaLabel="Earnings trend line chart"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Settlement Info
              </Typography>
              {earnings ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Your earnings for the last {earnings.periodDays} days
                  </Typography>
                  <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Total:</strong> {formatCurrency(earnings.totalEarnings)}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Pending:</strong> {formatCurrency(earnings.pendingPayout)}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Deliveries:</strong> {earnings.completedDeliveries}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Settlements are processed weekly on Fridays.
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Loading settlement information...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function RiderDashboardContent(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getTabFromPath(location.pathname);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: RiderTab): void => {
    navigate(TAB_PATHS[newValue]);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Rider Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Rider dashboard tabs">
          <Tab label="Active" value="active" id="rider-tab-active" />
          <Tab label="History" value="history" id="rider-tab-history" />
          <Tab label="Earnings" value="earnings" id="rider-tab-earnings" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<ActiveTab />} />
        <Route path="history" element={<HistoryTab />} />
        <Route path="earnings" element={<EarningsTab />} />
        <Route path="*" element={<Navigate to="/dashboard/rider" replace />} />
      </Routes>
    </Container>
  );
}

export function RiderDashboard(): React.ReactElement {
  return (
    <DashboardLayout title="Rider Dashboard">
      <RiderDashboardContent />
    </DashboardLayout>
  );
}
