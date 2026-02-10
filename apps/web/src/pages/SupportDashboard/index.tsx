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

type SupportTab = 'metrics' | 'disputes' | 'history';

const TAB_PATHS: Record<SupportTab, string> = {
  metrics: '/dashboard/support',
  disputes: '/dashboard/support/disputes',
  history: '/dashboard/support/history',
};

function getTabFromPath(pathname: string): SupportTab {
  if (pathname.includes('/disputes')) return 'disputes';
  if (pathname.includes('/history')) return 'history';
  return 'metrics';
}

function MetricsTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Support Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Support team performance metrics and ticket statistics will be displayed here.
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

function DisputesTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Disputes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Active and escalated disputes requiring attention will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Disputes data coming soon...
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
          Support History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Resolved tickets, refunds, and payment activity history will be displayed here.
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
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Metrics" value="metrics" />
          <Tab label="Disputes" value="disputes" />
          <Tab label="History" value="history" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="disputes" element={<DisputesTab />} />
        <Route path="history" element={<HistoryTab />} />
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
