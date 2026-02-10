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

type AdminTab = 'metrics' | 'settlements' | 'management';

const TAB_PATHS: Record<AdminTab, string> = {
  metrics: '/dashboard/admin',
  settlements: '/dashboard/admin/settlements',
  management: '/dashboard/admin/management',
};

function getTabFromPath(pathname: string): AdminTab {
  if (pathname.includes('/settlements')) return 'settlements';
  if (pathname.includes('/management')) return 'management';
  return 'metrics';
}

function MetricsTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          System Metrics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Platform-wide metrics and analytics will be displayed here.
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

function SettlementsTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Settlements
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Settlement batches and payout management will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Settlements data coming soon...
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function ManagementTab(): React.ReactElement {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Platform policies and configuration management will be displayed here.
        </Typography>
        <Box sx={{ mt: 2, p: 3, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Management tools coming soon...
          </Typography>
        </Box>
      </CardContent>
    </Card>
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
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Metrics" value="metrics" />
          <Tab label="Settlements" value="settlements" />
          <Tab label="Management" value="management" />
        </Tabs>
      </Box>

      <Routes>
        <Route index element={<MetricsTab />} />
        <Route path="settlements" element={<SettlementsTab />} />
        <Route path="management" element={<ManagementTab />} />
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
