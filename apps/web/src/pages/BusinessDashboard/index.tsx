import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { DashboardLayout } from '../../components/Layout';
import { ListWithPagination } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import {
  BillingSummary,
  BusinessDeliveriesQuery,
  BusinessDeliveryRequest,
  BusinessOverview,
  DeliveryDetail,
  DeliveryHistorySummary,
  DeliveryRequestResult,
  PaginationMeta,
  getBusinessBillingSummary,
  getBusinessDeliveries,
  getBusinessDeliveryDetail,
  getBusinessOverview,
  getMyBusinesses,
  requestBusinessDelivery,
} from '../../services/dashboardApi';

type BusinessTab = 'overview' | 'deliveries' | 'request' | 'active' | 'billing';

const TAB_PATHS: Record<BusinessTab, string> = {
  overview: '/dashboard/business',
  deliveries: '/dashboard/business/deliveries',
  request: '/dashboard/business/request',
  active: '/dashboard/business/active',
  billing: '/dashboard/business/billing',
};

const DELIVERY_STATUS_OPTIONS = [
  'Requested',
  'Assigned',
  'PickedUp',
  'InTransit',
  'Delivered',
  'Cancelled',
];

function getTabFromPath(pathname: string): BusinessTab {
  if (pathname.includes('/deliveries')) return 'deliveries';
  if (pathname.includes('/request')) return 'request';
  if (pathname.includes('/active')) return 'active';
  if (pathname.includes('/billing')) return 'billing';
  return 'overview';
}

function formatCurrency(amount: number, currency = 'KES'): string {
  return `${currency} ${amount.toLocaleString()}`;
}

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' | 'primary' {
  const normalized = status.toLowerCase();
  if (normalized === 'delivered' || normalized === 'paid' || normalized === 'succeeded') return 'success';
  if (normalized === 'requested' || normalized === 'pending' || normalized === 'processing') return 'warning';
  if (normalized === 'cancelled' || normalized === 'failed') return 'error';
  return 'primary';
}

function parseApiError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function useBusinessIdentity(token: string | null): {
  businessId: string | null;
  businessName: string | null;
  loading: boolean;
  error: string | null;
} {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    getMyBusinesses(token)
      .then((businesses) => {
        const first = businesses[0];
        if (!first) {
          setError('No business is linked to your account');
          setBusinessId(null);
          setBusinessName(null);
          return;
        }
        setBusinessId(first.businessId);
        setBusinessName(first.businessName);
      })
      .catch((error) => setError(parseApiError(error, 'Failed to load business identity')))
      .finally(() => setLoading(false));
  }, [token]);

  return { businessId, businessName, loading, error };
}

function OverviewTab({
  token,
  businessId,
}: {
  token: string;
  businessId: string;
}): React.ReactElement {
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [activeDeliveries, setActiveDeliveries] = useState<DeliveryHistorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    Promise.all([
      getBusinessOverview(token, businessId),
      getBusinessDeliveries(token, businessId, { page: 1, limit: 6, activeOnly: true }),
    ])
      .then(([overviewResult, activeResult]) => {
        setOverview(overviewResult);
        setActiveDeliveries(activeResult.data);
      })
      .catch((error) => setError(parseApiError(error, 'Failed to load overview')));
  }, [token, businessId]);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography variant="body2">Total Deliveries (Month)</Typography><Typography variant="h5">{overview?.totalDeliveries ?? '-'}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography variant="body2">Active Deliveries</Typography><Typography variant="h5">{overview?.activeDeliveries ?? '-'}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography variant="body2">Success vs Cancelled</Typography><Typography variant="h5">{overview ? `${overview.successfulDeliveries} / ${overview.cancelledDeliveries}` : '-'}</Typography></CardContent></Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card><CardContent><Typography variant="body2">Spend This Month</Typography><Typography variant="h5">{overview ? formatCurrency(overview.spendThisMonth, overview.currency) : '-'}</Typography></CardContent></Card>
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>Active Delivery Tracking</Typography>
      <ListWithPagination
        items={activeDeliveries}
        page={1}
        totalPages={1}
        onPageChange={() => undefined}
        getItemKey={(item) => item.deliveryId}
        renderItem={(item) => (
          <Card sx={{ width: '100%', mb: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2">{item.deliveryId}</Typography>
                <Chip size="small" color={statusColor(item.status)} label={item.status} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {item.pickupLocationId ?? 'N/A'} {'->'} {item.dropoffLocationId ?? 'N/A'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Customer: {item.customerName ?? '-'} {item.customerPhone ? `(${item.customerPhone})` : ''}
              </Typography>
            </CardContent>
          </Card>
        )}
      />
    </Box>
  );
}

function DeliveriesTab({
  token,
  businessId,
  activeOnly = false,
}: {
  token: string;
  businessId: string;
  activeOnly?: boolean;
}): React.ReactElement {
  const [items, setItems] = useState<DeliveryHistorySummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState<BusinessDeliveriesQuery>({
    page: 1,
    limit: 10,
    activeOnly,
  });
  const [detail, setDetail] = useState<DeliveryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((next: BusinessDeliveriesQuery) => {
    setError(null);
    getBusinessDeliveries(token, businessId, next)
      .then((result) => {
        setItems(result.data);
        setMeta(result.meta);
      })
      .catch((error) => setError(parseApiError(error, 'Failed to load deliveries')));
  }, [token, businessId]);

  useEffect(() => {
    load(filters);
  }, [filters, load]);

  const onFilterChange = (patch: Partial<BusinessDeliveriesQuery>): void => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }));
  };

  const onPageChange = (page: number): void => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const openDetail = (deliveryId: string): void => {
    getBusinessDeliveryDetail(token, businessId, deliveryId)
      .then(setDetail)
      .catch((error) => setError(parseApiError(error, 'Failed to load delivery detail')));
  };

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!activeOnly && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={2}>
            <TextField select fullWidth label="Status" value={filters.status ?? ''} onChange={(e) => onFilterChange({ status: e.target.value || undefined })}>
              <MenuItem value="">All</MenuItem>
              {DELIVERY_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>{status}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth label="From" type="date" InputLabelProps={{ shrink: true }} value={filters.from ?? ''} onChange={(e) => onFilterChange({ from: e.target.value || undefined })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth label="To" type="date" InputLabelProps={{ shrink: true }} value={filters.to ?? ''} onChange={(e) => onFilterChange({ to: e.target.value || undefined })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth label="Location ID" value={filters.locationId ?? ''} onChange={(e) => onFilterChange({ locationId: e.target.value || undefined })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField fullWidth label="Rider ID" value={filters.riderId ?? ''} onChange={(e) => onFilterChange({ riderId: e.target.value || undefined })} />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField select fullWidth label="Payment" value={filters.paymentState ?? ''} onChange={(e) => onFilterChange({ paymentState: (e.target.value as BusinessDeliveriesQuery['paymentState']) || undefined })}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="UNPAID">Unpaid</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="PAID">Paid</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      )}

      <ListWithPagination
        items={items}
        page={meta.page}
        totalPages={meta.totalPages || 1}
        total={meta.total}
        onPageChange={onPageChange}
        getItemKey={(item) => item.deliveryId}
        renderItem={(item) => (
          <Card sx={{ width: '100%', mb: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2">{item.deliveryId}</Typography>
                <Chip size="small" color={statusColor(item.status)} label={item.status} />
              </Box>
              <Typography variant="body2">Customer: {item.customerName ?? '-'} {item.customerPhone ? `(${item.customerPhone})` : ''}</Typography>
              <Typography variant="body2">{item.pickupLocationId ?? 'N/A'} {'->'} {item.dropoffLocationId ?? 'N/A'}</Typography>
              <Typography variant="body2">Rider: {item.assignedRiderName ?? item.assignedRiderId ?? '-'}</Typography>
              <Typography variant="body2">Price: {item.price != null ? formatCurrency(item.price, item.currency ?? 'KES') : '-'}</Typography>
              <Typography variant="body2">Payment: {item.paymentStatus ?? '-'}</Typography>
              <Box sx={{ mt: 1 }}>
                <Button size="small" onClick={() => openDetail(item.deliveryId)}>View Details</Button>
              </Box>
            </CardContent>
          </Card>
        )}
      />

      {detail && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6">Delivery Detail: {detail.deliveryId}</Typography>
            <Typography variant="body2">Rider: {detail.riderName ?? detail.riderId ?? '-'} {detail.riderPhone ? `(${detail.riderPhone})` : ''}</Typography>
            <Typography variant="body2">ETA: {detail.eta ? new Date(detail.eta).toLocaleString() : '-'}</Typography>
            <Typography variant="body2">Payment: {detail.paymentStatus ?? '-'}</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Timeline</Typography>
            {detail.timeline.map((event) => (
              <Box key={`${event.type}-${event.timestamp}`} sx={{ mb: 1 }}>
                <Typography variant="body2">{event.title}</Typography>
                <Typography variant="caption" color="text.secondary">{new Date(event.timestamp).toLocaleString()}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function RequestTab({
  token,
  businessId,
}: {
  token: string;
  businessId: string;
}): React.ReactElement {
  const initialState: BusinessDeliveryRequest = {
    pickupLocationId: '',
    dropoffLocationId: '',
    recipientName: '',
    recipientPhone: '',
    itemDescription: '',
    declaredItemValue: undefined,
    specialInstructions: '',
    distanceKm: undefined,
  };

  const [form, setForm] = useState<BusinessDeliveryRequest>(initialState);
  const [result, setResult] = useState<DeliveryRequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await requestBusinessDelivery(token, businessId, form);
      setResult(response);
      setForm(initialState);
    } catch (error) {
      setError(parseApiError(error, 'Failed to request delivery'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box component="form" onSubmit={onSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {result && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Delivery requested. Delivery ID: {result.deliveryId}, quote: {formatCurrency(result.estimatedCharges, result.currency)}.
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField required fullWidth label="Pickup Location ID" value={form.pickupLocationId} onChange={(e) => setForm((prev) => ({ ...prev, pickupLocationId: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField required fullWidth label="Dropoff Location ID" value={form.dropoffLocationId} onChange={(e) => setForm((prev) => ({ ...prev, dropoffLocationId: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField required fullWidth label="Recipient Name" value={form.recipientName} onChange={(e) => setForm((prev) => ({ ...prev, recipientName: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField required fullWidth label="Recipient Phone" value={form.recipientPhone} onChange={(e) => setForm((prev) => ({ ...prev, recipientPhone: e.target.value }))} />
        </Grid>
        <Grid item xs={12}>
          <TextField required fullWidth label="Item Description" value={form.itemDescription} onChange={(e) => setForm((prev) => ({ ...prev, itemDescription: e.target.value }))} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Scheduled Pickup (optional)" type="datetime-local" InputLabelProps={{ shrink: true }} value={form.scheduledPickupTime ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, scheduledPickupTime: e.target.value || undefined }))} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Declared Item Value" type="number" value={form.declaredItemValue ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, declaredItemValue: e.target.value ? Number(e.target.value) : undefined }))} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth label="Distance (km, optional)" type="number" value={form.distanceKm ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, distanceKm: e.target.value ? Number(e.target.value) : undefined }))} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Special Instructions" value={form.specialInstructions ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, specialInstructions: e.target.value }))} />
        </Grid>
      </Grid>
      <Box sx={{ mt: 2 }}>
        <Button type="submit" variant="contained" disabled={submitting}>Request Delivery</Button>
      </Box>
    </Box>
  );
}

function BillingTab({
  token,
  businessId,
}: {
  token: string;
  businessId: string;
}): React.ReactElement {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBusinessBillingSummary(token, businessId)
      .then(setSummary)
      .catch((error) => setError(parseApiError(error, 'Failed to load billing summary')));
  }, [token, businessId]);

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}><Card><CardContent><Typography variant="body2">Total Spend</Typography><Typography variant="h6">{summary ? formatCurrency(summary.totalSpend, summary.currency) : '-'}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} md={3}><Card><CardContent><Typography variant="body2">Pending Charges</Typography><Typography variant="h6">{summary ? formatCurrency(summary.pendingCharges, summary.currency) : '-'}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} md={3}><Card><CardContent><Typography variant="body2">Paid Deliveries</Typography><Typography variant="h6">{summary?.paidDeliveries ?? '-'}</Typography></CardContent></Card></Grid>
        <Grid item xs={12} md={3}><Card><CardContent><Typography variant="body2">Discounts/Subsidies</Typography><Typography variant="h6">{summary ? formatCurrency(summary.campaignSubsidyDiscounts, summary.currency) : '-'}</Typography></CardContent></Card></Grid>
      </Grid>

      <Typography variant="h6" sx={{ mb: 1 }}>Invoice History</Typography>
      {(summary?.invoiceHistory ?? []).map((invoice) => (
        <Card key={invoice.invoiceId} sx={{ mb: 1 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle2">{invoice.invoiceId}</Typography>
              <Chip size="small" color={statusColor(invoice.status)} label={invoice.status} />
            </Box>
            <Typography variant="body2">{formatCurrency(invoice.grandTotal, invoice.currency)}</Typography>
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(invoice.createdAt).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function BusinessDashboardShell(): React.ReactElement {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const tab = getTabFromPath(location.pathname);
  const business = useBusinessIdentity(token);

  const onTabChange = (_: React.SyntheticEvent, next: BusinessTab): void => {
    navigate(TAB_PATHS[next]);
  };

  const content = useMemo(() => {
    if (!token || !business.businessId) {
      return null;
    }

    if (tab === 'overview') return <OverviewTab token={token} businessId={business.businessId} />;
    if (tab === 'deliveries') return <DeliveriesTab token={token} businessId={business.businessId} />;
    if (tab === 'request') return <RequestTab token={token} businessId={business.businessId} />;
    if (tab === 'active') return <DeliveriesTab token={token} businessId={business.businessId} activeOnly />;
    return <BillingTab token={token} businessId={business.businessId} />;
  }, [token, business.businessId, tab]);

  return (
    <DashboardLayout title="Business Owner Dashboard">
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Typography variant="h5" gutterBottom>Business Owner Dashboard</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {business.businessName ? `Business: ${business.businessName}` : 'Loading business context...'}
        </Typography>

        {business.error && <Alert severity="error" sx={{ mb: 2 }}>{business.error}</Alert>}

        <Tabs value={tab} onChange={onTabChange} sx={{ mb: 3 }}>
          <Tab label="Overview" value="overview" />
          <Tab label="Deliveries" value="deliveries" />
          <Tab label="New Request" value="request" />
          <Tab label="Active" value="active" />
          <Tab label="Billing" value="billing" />
        </Tabs>

        {content}
      </Container>
    </DashboardLayout>
  );
}

export function BusinessDashboard(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<BusinessDashboardShell />} />
      <Route path="/deliveries" element={<BusinessDashboardShell />} />
      <Route path="/request" element={<BusinessDashboardShell />} />
      <Route path="/active" element={<BusinessDashboardShell />} />
      <Route path="/billing" element={<BusinessDashboardShell />} />
      <Route path="*" element={<Navigate to="/dashboard/business" replace />} />
    </Routes>
  );
}

export default BusinessDashboard;
