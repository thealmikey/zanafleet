import React, { useCallback, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  ButtonBase,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Assessment as MetricsIcon,
  Business as BusinessIcon,
  Gavel as DisputesIcon,
  History as HistoryIcon,
  Home as HomeIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Paid as EarningsIcon,
  People as ManagementIcon,
  Person as ProfileIcon,
  Receipt as SettlementsIcon,
  SupportAgent as SupportIcon,
  TwoWheeler as RiderIcon,
  Workspaces as OperatorIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { DashboardRole, getHighestPriorityRole } from '../../utils/roleRouting';

const DRAWER_WIDTH = 240;

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  disabled?: boolean;
}

const ROLE_NAV_CONFIG: Record<DashboardRole, { title: string; icon: React.ReactNode; items: NavItem[] }> = {
  admin: {
    title: 'Admin Dashboard',
    icon: <AdminIcon />,
    items: [
      { label: 'Metrics', icon: <MetricsIcon />, path: '/dashboard/admin' },
      { label: 'Settlements', icon: <SettlementsIcon />, path: '/dashboard/admin/settlements' },
      { label: 'Management', icon: <ManagementIcon />, path: '/dashboard/admin/management' },
    ],
  },
  support: {
    title: 'Support Dashboard',
    icon: <SupportIcon />,
    items: [
      { label: 'Metrics', icon: <MetricsIcon />, path: '/dashboard/support' },
      { label: 'Disputes', icon: <DisputesIcon />, path: '/dashboard/support/disputes' },
      { label: 'Refunds', icon: <EarningsIcon />, path: '/dashboard/support/refunds' },
      { label: 'Payments', icon: <HistoryIcon />, path: '/dashboard/support/history' },
    ],
  },
  operator: {
    title: 'Operator Dashboard',
    icon: <OperatorIcon />,
    items: [
      { label: 'Metrics', icon: <MetricsIcon />, path: '/dashboard/operator' },
      { label: 'Queue', icon: <ManagementIcon />, path: '/dashboard/operator/queue' },
      { label: 'Candidates', icon: <RiderIcon />, path: '/dashboard/operator/candidates' },
      { label: 'Route', icon: <HistoryIcon />, path: '/dashboard/operator/route' },
    ],
  },
  business: {
    title: 'Business Dashboard',
    icon: <BusinessIcon />,
    items: [
      { label: 'Metrics', icon: <MetricsIcon />, path: '/dashboard/business' },
      { label: 'Orders', icon: <SettlementsIcon />, path: '/dashboard/business/orders' },
      { label: 'Deliveries', icon: <HistoryIcon />, path: '/dashboard/business/deliveries' },
      { label: 'Invoices', icon: <EarningsIcon />, path: '/dashboard/business/invoices' },
    ],
  },
  rider: {
    title: 'Rider Dashboard',
    icon: <RiderIcon />,
    items: [
      { label: 'Active', icon: <MetricsIcon />, path: '/dashboard/rider' },
      { label: 'History', icon: <HistoryIcon />, path: '/dashboard/rider/history' },
      { label: 'Earnings', icon: <EarningsIcon />, path: '/dashboard/rider/earnings' },
    ],
  },
};

const COMMON_NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: <HomeIcon />, path: '/' },
  { label: 'Profile', icon: <ProfileIcon />, path: '/profile' },
];

export interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps): React.ReactElement {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardRole = getHighestPriorityRole(user?.roles);
  const roleConfig = dashboardRole ? ROLE_NAV_CONFIG[dashboardRole] : null;

  const handleDrawerToggle = useCallback((): void => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleLogout = useCallback(async (): Promise<void> => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActiveRoute = (path: string): boolean => {
    if (path === location.pathname) return true;
    if (path !== '/' && location.pathname.startsWith(path + '/')) return true;
    return false;
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          ZanaFleet
        </Typography>
      </Toolbar>
      <Divider />

      {roleConfig && (
        <>
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {roleConfig.icon}
              <Typography variant="subtitle2" color="text.secondary">
                {roleConfig.title}
              </Typography>
            </Box>
          </Box>
          <List>
            {roleConfig.items.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  component={RouterLink}
                  to={item.path}
                  selected={isActiveRoute(item.path)}
                  onClick={isMobile ? handleDrawerToggle : undefined}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </>
      )}

      <List sx={{ flexGrow: 1 }}>
        {COMMON_NAV_ITEMS.map((item) => (
          <ListItem key={item.label} disablePadding>
            <ListItemButton
              component={item.disabled ? 'div' : RouterLink}
              to={item.disabled ? undefined : item.path}
              disabled={item.disabled}
              selected={isActiveRoute(item.path)}
              onClick={isMobile ? handleDrawerToggle : undefined}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                secondary={item.disabled ? 'Coming soon' : undefined}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} disabled={isLoading}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {title ?? roleConfig?.title ?? 'Dashboard'}
          </Typography>
          {user && (
            <ButtonBase
              onClick={() => navigate('/profile')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderRadius: 1,
                p: 0.5,
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
              aria-label="Go to profile"
            >
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', sm: 'block' }, color: 'inherit' }}
              >
                {user.name}
              </Typography>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {getInitials(user.name)}
              </Avatar>
            </ButtonBase>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          bgcolor: 'grey.50',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
