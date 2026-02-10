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

function ActiveTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Active Deliveries
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your current active deliveries and assignments will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            No active deliveries
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
          Your completed deliveries and performance history will be displayed here.
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

function EarningsTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Earnings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your earnings summary and payout history will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Earnings data coming soon...
          </Typography>
        </Box>
      </CardContent>
    </Card>
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
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Active" value="active" />
          <Tab label="History" value="history" />
          <Tab label="Earnings" value="earnings" />
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
