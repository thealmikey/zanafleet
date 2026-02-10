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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  useTheme,
} from '@mui/material';
import {
  LocalShipping as DeliveriesIcon,
  AttachMoney as RevenueIcon,
  TwoWheeler as RidersIcon,
  ShoppingCart as OrdersIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

import { DashboardLayout } from '../../components/Layout';
import {
  KPIGrid,
  ListWithPagination,
  LineChart,
  DoughnutChart,
  sampleEarningsTrend,
  sampleSettlementStatusBreakdown,
} from '../../components/common';
import type { KPIGridItem } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import {
  getAdminMetrics,
  getAdminSettlements,
  getAdminPolicies,
  SystemMetrics,
  SettlementSummary,
  PolicySummary,
  PaginationMeta,
} from '../../services/dashboardApi';

type AdminTab = 'metrics' | 'settlements' | 'policies';

const TAB_PATHS: Record<AdminTab, string> = {
  metrics: '/dashboard/admin',
  settlements: '/dashboard/admin/settlements',
  policies: '/dashboard/admin/management',
};

function getTabFromPath(pathname: string): AdminTab {
  if (pathname.includes('/settlements')) return 'settlements';
  if (pathname.includes('/management')) return 'policies';
  return 'metrics';
}

function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
}

function getStatusColor(status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'active') return 'success';
  if (s === 'processing' || s === 'pending') return 'warning';
  if (s === 'paused' || s === 'failed') return 'error';
  return 'default';
}

function MetricsTab(): React.ReactElement {
  const theme = useTheme();
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    getAdminMetrics(token, 30)
      .then(setMetrics)
      .catch((err) => setError(err.message || 'Failed to load metrics'))
      .finally(() => setLoading(false));
  }, [token]);

  const kpiItems: KPIGridItem[] = metrics
    ? [
        {
          title: 'Total Orders',
          value: metrics.totalOrders.toLocaleString(),
          icon: <OrdersIcon fontSize="large" />,
          color: 'primary',
          loading,
        },
        {
          title: 'Total Deliveries',
          value: metrics.totalDeliveries.toLocaleString(),
          icon: <DeliveriesIcon fontSize="large" />,
          color: 'success',
          loading,
        },
        {
          title: 'Total Revenue',
          value: formatCurrency(metrics.totalRevenue),
          icon: <RevenueIcon fontSize="large" />,
          color: 'secondary',
          loading,
        },
        {
          title: 'Active Riders',
          value: metrics.activeRiders.toLocaleString(),
          icon: <RidersIcon fontSize="large" />,
          color: 'warning',
          loading,
        },
      ]
    : [
        { title: 'Total Orders', value: '-', loading: true },
        { title: 'Total Deliveries', value: '-', loading: true },
        { title: 'Total Revenue', value: '-', loading: true },
        { title: 'Active Riders', value: '-', loading: true },
      ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        System Overview
      </Typography>
      <Box sx={{ mb: 4 }}>
        <KPIGrid items={kpiItems} md={3} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Revenue Trend
            </Typography>
            <LineChart
              data={sampleEarningsTrend(theme.palette)}
              height={240}
              ariaLabel="Revenue trend over time"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Settlement Status
            </Typography>
            <DoughnutChart
              data={sampleSettlementStatusBreakdown(theme.palette)}
              height={240}
              ariaLabel="Settlement status breakdown"
            />
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function SettlementsTab(): React.ReactElement {
  const { token } = useAuth();
  const [settlements, setSettlements] = useState<SettlementSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettlements = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getAdminSettlements(token, { page, limit: 10 })
        .then((result) => {
          setSettlements(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load settlements'))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    loadSettlements(1);
  }, [loadSettlements]);

  const handlePageChange = (page: number): void => {
    loadSettlements(page);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Settlement Batches
      </Typography>

      <Card>
        <TableContainer>
          <Table aria-label="Settlements table">
            <TableHead>
              <TableRow>
                <TableCell>Batch ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Recipients</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Processed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : settlements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No settlements found
                  </TableCell>
                </TableRow>
              ) : (
                settlements.map((s) => (
                  <TableRow key={s.batchId} data-testid={`settlement-row-${s.batchId}`}>
                    <TableCell>{s.batchId}</TableCell>
                    <TableCell>
                      <Chip label={s.status} size="small" color={getStatusColor(s.status)} />
                    </TableCell>
                    <TableCell align="right">{formatCurrency(s.totalAmount)}</TableCell>
                    <TableCell align="right">{s.recipientCount}</TableCell>
                    <TableCell>{formatDate(s.createdAt)}</TableCell>
                    <TableCell>{formatDate(s.processedAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {meta.totalPages > 1 && (
          <Box sx={{ p: 2 }}>
            <ListWithPagination
              items={[]}
              renderItem={() => null}
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPageChange={handlePageChange}
            />
          </Box>
        )}
      </Card>
    </Box>
  );
}

function PoliciesTab(): React.ReactElement {
  const { token } = useAuth();
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getAdminPolicies(token, { page, limit: 10 })
        .then((result) => {
          setPolicies(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load policies'))
        .finally(() => setLoading(false));
    },
    [token]
  );

  useEffect(() => {
    loadPolicies(1);
  }, [loadPolicies]);

  const handlePageChange = (page: number): void => {
    loadPolicies(page);
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Platform Policies
      </Typography>

      <Card>
        <TableContainer>
          <Table aria-label="Policies table">
            <TableHead>
              <TableRow>
                <TableCell>Policy ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Trigger</TableCell>
                <TableCell align="right">Priority</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : policies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No policies found
                  </TableCell>
                </TableRow>
              ) : (
                policies.map((p) => (
                  <TableRow key={p.policyId} data-testid={`policy-row-${p.policyId}`}>
                    <TableCell>{p.policyId}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.scope}</TableCell>
                    <TableCell>
                      <Chip label={p.status} size="small" color={getStatusColor(p.status)} />
                    </TableCell>
                    <TableCell>{p.trigger}</TableCell>
                    <TableCell align="right">{p.priority}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {meta.totalPages > 1 && (
          <Box sx={{ p: 2 }}>
            <ListWithPagination
              items={[]}
              renderItem={() => null}
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              onPageChange={handlePageChange}
            />
          </Box>
        )}
      </Card>
    </Box>
  );
}

function AdminDashboardContent(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getTabFromPath(location.pathname);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: AdminTab): void => {
    navigate(TAB_PATHS[newValue]);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Admin Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Admin dashboard tabs">
          <Tab label="Metrics" value="metrics" id="admin-tab-metrics" />
          <Tab label="Settlements" value="settlements" id="admin-tab-settlements" />
          <Tab label="Policies" value="policies" id="admin-tab-policies" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="settlements" element={<SettlementsTab />} />
        <Route path="management" element={<PoliciesTab />} />
        <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
      </Routes>
    </Container>
  );
}

export function AdminDashboard(): React.ReactElement {
  return (
    <DashboardLayout title="Admin Dashboard">
      <AdminDashboardContent />
    </DashboardLayout>
  );
}
