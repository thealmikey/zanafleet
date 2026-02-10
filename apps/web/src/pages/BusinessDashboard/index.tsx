import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Container,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

import { DashboardLayout } from '../../components/Layout';

type BusinessTab = 'metrics' | 'orders' | 'history';

const TAB_PATHS: Record<BusinessTab, string> = {
  metrics: '/dashboard/business',
  orders: '/dashboard/business/orders',
  history: '/dashboard/business/history',
};

function getTabFromPath(pathname: string): BusinessTab {
  if (pathname.includes('/orders')) return 'orders';
  if (pathname.includes('/history')) return 'history';
  return 'metrics';
}

function MetricsTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Business Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Order volume, delivery performance, and cost analytics will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Metrics data coming soon...
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function OrdersTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Orders
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Active orders, deliveries, and invoices will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Orders data coming soon...
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function HistoryTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Delivery History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Completed deliveries and historical data will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            History data coming soon...
          </Typography>
        </Box>
      </CardContent>
    </Card>
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
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Metrics" value="metrics" />
          <Tab label="Orders" value="orders" />
          <Tab label="History" value="history" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="orders" element={<OrdersTab />} />
        <Route path="history" element={<HistoryTab />} />
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
