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

type OperatorTab = 'metrics' | 'queue' | 'history';

const TAB_PATHS: Record<OperatorTab, string> = {
  metrics: '/dashboard/operator',
  queue: '/dashboard/operator/queue',
  history: '/dashboard/operator/history',
};

function getTabFromPath(pathname: string): OperatorTab {
  if (pathname.includes('/queue')) return 'queue';
  if (pathname.includes('/history')) return 'history';
  return 'metrics';
}

function MetricsTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Operator Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Fleet operations metrics, active deliveries, and rider availability will be displayed here.
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

function QueueTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Assignment Queue
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Pending delivery assignments and candidate matching will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Queue data coming soon...
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
          Operations History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Completed assignments and delivery history will be displayed here.
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

function OperatorDashboardContent(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getTabFromPath(location.pathname);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: OperatorTab): void => {
    navigate(TAB_PATHS[newValue]);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 3 }}>
        Operator Dashboard
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Metrics" value="metrics" />
          <Tab label="Queue" value="queue" />
          <Tab label="History" value="history" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="queue" element={<QueueTab />} />
        <Route path="history" element={<HistoryTab />} />
        <Route path="*" element={<Navigate to="/dashboard/operator" replace />} />
      </Routes>
    </Container>
  );
}

export function OperatorDashboard(): React.ReactElement {
  return (
    <DashboardLayout title="Operator Dashboard">
      <OperatorDashboardContent />
    </DashboardLayout>
  );
}
