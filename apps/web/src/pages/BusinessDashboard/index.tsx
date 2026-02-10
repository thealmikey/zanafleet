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
  ShoppingCart as OrdersIcon,
  LocalShipping as DeliveriesIcon,
  AttachMoney as SpentIcon,
  Timer as TimeIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

import { DashboardLayout } from '../../components/Layout';
import {
  KPIGrid,
  DeliveryCard,
  ListWithPagination,
  BarChart,
  sampleDeliveryVolumes,
} from '../../components/common';
import type { KPIGridItem } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import {
  getBusinessMetrics,
  getBusinessOrders,
  getBusinessDeliveries,
  getBusinessInvoices,
  BusinessMetrics,
  OrderSummary,
  DeliveryHistorySummary,
  InvoiceSummary,
  PaginationMeta,
} from '../../services/dashboardApi';

type BusinessTab = 'metrics' | 'orders' | 'deliveries' | 'invoices';

const TAB_PATHS: Record<BusinessTab, string> = {
  metrics: '/dashboard/business',
  orders: '/dashboard/business/orders',
  deliveries: '/dashboard/business/deliveries',
  invoices: '/dashboard/business/invoices',
};

function getTabFromPath(pathname: string): BusinessTab {
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/deliveries')) return 'deliveries';
  if (pathname.includes('/invoices')) return 'invoices';
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
  if (s === 'delivered' || s === 'paid' || s === 'completed') return 'success';
  if (s === 'pending' || s === 'in_progress') return 'warning';
  if (s === 'cancelled' || s === 'overdue' || s === 'failed') return 'error';
  if (s === 'in_transit') return 'primary';
  return 'default';
}

function useBusinessId(): string {
  const { user } = useAuth();
  return user?.id ?? 'unknown';
}

function MetricsTab(): React.ReactElement {
  const theme = useTheme();
  const { token } = useAuth();
  const businessId = useBusinessId();
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    setLoading(true);
    setError(null);

    getBusinessMetrics(token, businessId, 30)
      .then(setMetrics)
      .catch((err) => setError(err.message || 'Failed to load metrics'))
      .finally(() => setLoading(false));
  }, [token, businessId]);

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
          title: 'Total Spent',
          value: formatCurrency(metrics.totalSpent),
          icon: <SpentIcon fontSize="large" />,
          color: 'secondary',
          loading,
        },
        {
          title: 'Avg Delivery Time',
          value: `${metrics.averageDeliveryTime} min`,
          icon: <TimeIcon fontSize="large" />,
          color: 'warning',
          loading,
        },
      ]
    : [
        { title: 'Total Orders', value: '-', loading: true },
        { title: 'Total Deliveries', value: '-', loading: true },
        { title: 'Total Spent', value: '-', loading: true },
        { title: 'Avg Delivery Time', value: '-', loading: true },
      ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom>
        Business Overview
      </Typography>
      <Box sx={{ mb: 4 }}>
        <KPIGrid items={kpiItems} md={3} />
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Delivery Volume (Last 7 Days)
          </Typography>
          <BarChart
            data={sampleDeliveryVolumes(theme.palette)}
            height={240}
            ariaLabel="Delivery volume bar chart"
          />
        </CardContent>
      </Card>
    </Box>
  );
}

function OrdersTab(): React.ReactElement {
  const { token } = useAuth();
  const businessId = useBusinessId();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getBusinessOrders(token, businessId, { page, limit: 10 })
        .then((result) => {
          setOrders(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load orders'))
        .finally(() => setLoading(false));
    },
    [token, businessId]
  );

  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  const handlePageChange = (page: number): void => {
    loadOrders(page);
  };

  const renderOrder = (order: OrderSummary): React.ReactNode => (
    <Card sx={{ width: '100%', mb: 1 }} data-testid={`order-item-${order.orderId}`}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2">{order.orderId}</Typography>
          <Chip label={order.status} size="small" color={getStatusColor(order.status)} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
          </Typography>
          <Typography variant="body2" color="primary">
            {formatCurrency(order.totalAmount)}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Created: {formatDateTime(order.createdAt)}
        </Typography>
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
        Orders
      </Typography>

      <ListWithPagination
        items={orders}
        renderItem={renderOrder}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No orders found"
        getItemKey={(o) => o.orderId}
      />
    </Box>
  );
}

function DeliveriesTab(): React.ReactElement {
  const { token } = useAuth();
  const businessId = useBusinessId();
  const [deliveries, setDeliveries] = useState<DeliveryHistorySummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveries = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getBusinessDeliveries(token, businessId, { page, limit: 10 })
        .then((result) => {
          setDeliveries(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load deliveries'))
        .finally(() => setLoading(false));
    },
    [token, businessId]
  );

  useEffect(() => {
    loadDeliveries(1);
  }, [loadDeliveries]);

  const handlePageChange = (page: number): void => {
    loadDeliveries(page);
  };

  const renderDelivery = (delivery: DeliveryHistorySummary): React.ReactNode => (
    <Box sx={{ width: '100%', mb: 1 }} data-testid={`delivery-item-${delivery.deliveryId}`}>
      <DeliveryCard
        deliveryId={delivery.deliveryId}
        status={delivery.status}
        pickupAddress={delivery.pickupAddress}
        dropoffAddress={delivery.dropoffAddress}
        assignedRider={delivery.assignedRider}
        createdAt={new Date(delivery.createdAt)}
        completedAt={delivery.completedAt ? new Date(delivery.completedAt) : null}
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
        Deliveries
      </Typography>

      <ListWithPagination
        items={deliveries}
        renderItem={renderDelivery}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No deliveries found"
        getItemKey={(d) => d.deliveryId}
      />
    </Box>
  );
}

function InvoicesTab(): React.ReactElement {
  const { token } = useAuth();
  const businessId = useBusinessId();
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = useCallback(
    (page: number) => {
      if (!token) return;

      setLoading(true);
      setError(null);

      getBusinessInvoices(token, businessId, { page, limit: 10 })
        .then((result) => {
          setInvoices(result.data);
          setMeta(result.meta);
        })
        .catch((err) => setError(err.message || 'Failed to load invoices'))
        .finally(() => setLoading(false));
    },
    [token, businessId]
  );

  useEffect(() => {
    loadInvoices(1);
  }, [loadInvoices]);

  const handlePageChange = (page: number): void => {
    loadInvoices(page);
  };

  const renderInvoice = (invoice: InvoiceSummary): React.ReactNode => (
    <Card sx={{ width: '100%', mb: 1 }} data-testid={`invoice-item-${invoice.invoiceId}`}>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2">{invoice.invoiceId}</Typography>
          <Chip label={invoice.status} size="small" color={getStatusColor(invoice.status)} />
        </Box>
        <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
          {formatCurrency(invoice.totalAmount)}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Due: {formatDateTime(invoice.dueDate)}
        </Typography>
        {invoice.paidAt && (
          <Typography variant="caption" color="success.main" display="block">
            Paid: {formatDateTime(invoice.paidAt)}
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
        Invoices
      </Typography>

      <ListWithPagination
        items={invoices}
        renderItem={renderInvoice}
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        onPageChange={handlePageChange}
        loading={loading}
        emptyText="No invoices found"
        getItemKey={(i) => i.invoiceId}
      />
    </Box>
  );
}

function BusinessDashboardContent(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getTabFromPath(location.pathname);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: BusinessTab): void => {
    navigate(TAB_PATHS[newValue]);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Business Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} aria-label="Business dashboard tabs">
          <Tab label="Metrics" value="metrics" id="business-tab-metrics" />
          <Tab label="Orders" value="orders" id="business-tab-orders" />
          <Tab label="Deliveries" value="deliveries" id="business-tab-deliveries" />
          <Tab label="Invoices" value="invoices" id="business-tab-invoices" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="orders" element={<OrdersTab />} />
        <Route path="deliveries" element={<DeliveriesTab />} />
        <Route path="invoices" element={<InvoicesTab />} />
        <Route path="*" element={<Navigate to="/dashboard/business" replace />} />
      </Routes>
    </Container>
  );
}

export function BusinessDashboard(): React.ReactElement {
  return (
    <DashboardLayout title="Business Dashboard">
      <BusinessDashboardContent />
    </DashboardLayout>
  );
}
