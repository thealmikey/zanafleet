import React, { useState } from 'react';
import { Box, Container, Divider, Paper, Typography, useTheme } from '@mui/material';
import {
  TrendingUp as TrendingIcon,
  ShoppingCart as OrdersIcon,
  LocalShipping as DeliveryIcon,
  AttachMoney as RevenueIcon,
} from '@mui/icons-material';

import {
  MetricsCard,
  KPIGrid,
  DeliveryCard,
  ListWithPagination,
  TabContainer,
  Filters,
  NotificationList,
  GeoMap,
  LineChart,
  BarChart,
  DoughnutChart,
  sampleEarningsTrend,
  sampleDeliveryVolumes,
  sampleSettlementStatusBreakdown,
} from '../../components/common';
import type {
  KPIGridItem,
  NotificationItem,
  GeoPoint,
  FilterValues,
} from '../../components/common';

const MOCK_KPI_ITEMS: KPIGridItem[] = [
  { title: 'Total Orders', value: 1247, icon: <OrdersIcon />, color: 'primary', trend: { direction: 'up', label: '+12% this week' } },
  { title: 'Active Deliveries', value: 47, icon: <DeliveryIcon />, color: 'success' },
  { title: 'Revenue', value: 'KES 2.4M', icon: <RevenueIcon />, color: 'secondary', trend: { direction: 'up', label: '+8%' } },
  { title: 'Pending', value: 12, icon: <TrendingIcon />, color: 'warning', trend: { direction: 'flat' } },
];

const MOCK_DELIVERIES = [
  { deliveryId: 'DEL-001', status: 'in_transit', pickupAddress: '123 Warehouse Ave, Nairobi', dropoffAddress: '456 Customer St, Westlands', assignedRider: 'John Kamau', estimatedEarnings: 350, createdAt: new Date() },
  { deliveryId: 'DEL-002', status: 'delivered', pickupAddress: '789 Mall Rd, Kilimani', dropoffAddress: '321 Home Lane, Karen', assignedRider: 'Mary Wanjiku', estimatedEarnings: 420, createdAt: new Date(Date.now() - 86400000), completedAt: new Date() },
  { deliveryId: 'DEL-003', status: 'pending_assignment', pickupAddress: '555 Restaurant Row', dropoffAddress: '666 Office Park', estimatedEarnings: 280, createdAt: new Date() },
];

const MOCK_LIST_ITEMS = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry', 'Fig', 'Grape', 'Honeydew'];

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'New delivery assigned', message: 'You have been assigned delivery DEL-004', createdAt: new Date(), type: 'info', read: false },
  { id: 'n2', title: 'Payment received', message: 'KES 350 deposited to your wallet', createdAt: new Date(Date.now() - 3600000), type: 'success', read: true },
  { id: 'n3', title: 'Delivery delayed', message: 'DEL-002 is running 15 minutes late', createdAt: new Date(Date.now() - 7200000), type: 'warning', read: false },
  { id: 'n4', title: 'System maintenance', createdAt: new Date(Date.now() - 86400000), type: 'error', read: true },
];

const MOCK_GEO_POINTS: GeoPoint[] = [
  { id: 'r1', lat: -1.2864, lng: 36.8172, label: 'CBD' },
  { id: 'r2', lat: -1.2673, lng: 36.8110, label: 'Westlands' },
  { id: 'r3', lat: -1.2891, lng: 36.7832, label: 'Kilimani' },
  { id: 'r4', lat: -1.3186, lng: 36.7119, label: 'Karen' },
];

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Transit', value: 'in_transit' },
  { label: 'Delivered', value: 'delivered' },
  { label: 'Cancelled', value: 'cancelled' },
];

export function ComponentsDemo(): React.ReactElement {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState('tab1');
  const [listPage, setListPage] = useState(1);
  const [filters, setFilters] = useState<FilterValues>({});
  const [clickedDelivery, setClickedDelivery] = useState<string | null>(null);
  const [clickedNotification, setClickedNotification] = useState<string | null>(null);
  const [clickedMarker, setClickedMarker] = useState<string | null>(null);

  const itemsPerPage = 3;
  const totalPages = Math.ceil(MOCK_LIST_ITEMS.length / itemsPerPage);
  const paginatedItems = MOCK_LIST_ITEMS.slice(
    (listPage - 1) * itemsPerPage,
    listPage * itemsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Components Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Showcase of reusable UI components with mock data and interactions.
      </Typography>

      {/* MetricsCard */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          MetricsCard
        </Typography>
        <Box sx={{ maxWidth: 300 }}>
          <MetricsCard
            title="Total Revenue"
            value="KES 2,456,780"
            subtitle="Last 30 days"
            icon={<RevenueIcon fontSize="large" />}
            color="success"
            trend={{ direction: 'up', label: '+15% from last month' }}
            ariaLabel="Total revenue metric card"
          />
        </Box>
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* KPIGrid */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          KPIGrid
        </Typography>
        <KPIGrid
          items={MOCK_KPI_ITEMS}
          xs={12}
          sm={6}
          md={3}
          getAriaLabel={(idx, item) => `KPI ${idx + 1}: ${item.title}`}
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* DeliveryCard */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          DeliveryCard
        </Typography>
        {clickedDelivery && (
          <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
            Clicked: {clickedDelivery}
          </Typography>
        )}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {MOCK_DELIVERIES.map((d) => (
            <Box key={d.deliveryId} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' } }}>
              <DeliveryCard
                {...d}
                onClick={setClickedDelivery}
              />
            </Box>
          ))}
        </Box>
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* ListWithPagination */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          ListWithPagination
        </Typography>
        <ListWithPagination
          items={paginatedItems}
          renderItem={(item) => (
            <Box sx={{ p: 2, width: '100%', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography>{item}</Typography>
            </Box>
          )}
          page={listPage}
          totalPages={totalPages}
          total={MOCK_LIST_ITEMS.length}
          onPageChange={setListPage}
          emptyText="No fruits available"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* TabContainer */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          TabContainer
        </Typography>
        <TabContainer
          tabs={[
            { label: 'Overview', value: 'tab1' },
            { label: 'Details', value: 'tab2' },
            { label: 'Settings', value: 'tab3', ariaLabel: 'Settings tab' },
          ]}
          value={selectedTab}
          onChange={setSelectedTab}
        >
          <Box>
            <Typography>This is the Overview panel content.</Typography>
          </Box>
          <Box>
            <Typography>This is the Details panel content with more information.</Typography>
          </Box>
          <Box>
            <Typography>This is the Settings panel for configuration options.</Typography>
          </Box>
        </TabContainer>
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Filters
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Current filters: {JSON.stringify(filters)}
        </Typography>
        <Filters
          startDate={filters.startDate}
          endDate={filters.endDate}
          status={filters.status}
          statusOptions={STATUS_OPTIONS}
          radius={filters.radius}
          limit={filters.limit}
          onChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
          onApply={() => alert('Filters applied!')}
          onClear={() => setFilters({})}
          title="Search Filters"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* NotificationList */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          NotificationList
        </Typography>
        {clickedNotification && (
          <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
            Clicked notification: {clickedNotification}
          </Typography>
        )}
        <NotificationList
          items={MOCK_NOTIFICATIONS}
          onItemClick={setClickedNotification}
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* GeoMap */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          GeoMap
        </Typography>
        {clickedMarker && (
          <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
            Clicked marker: {clickedMarker}
          </Typography>
        )}
        <GeoMap
          points={MOCK_GEO_POINTS}
          height={300}
          onMarkerClick={setClickedMarker}
          ariaLabel="Demo map showing Nairobi locations"
        />
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* Charts */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Charts
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <Box sx={{ height: 240 }}>
            <LineChart
              data={sampleEarningsTrend(theme.palette)}
              height={240}
              ariaLabel="Sample earnings line chart"
            />
          </Box>
          <Box sx={{ height: 240 }}>
            <BarChart
              data={sampleDeliveryVolumes(theme.palette)}
              height={240}
              ariaLabel="Sample delivery volumes bar chart"
            />
          </Box>
          <Box sx={{ height: 240 }}>
            <DoughnutChart
              data={sampleSettlementStatusBreakdown(theme.palette)}
              height={240}
              ariaLabel="Sample settlement breakdown doughnut chart"
            />
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
