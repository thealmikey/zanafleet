import React, { useCallback, useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
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
  Popover,
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
  LocalShipping as FleetIcon,
  Logout as LogoutIcon,
  Mail as MessagesIcon,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Paid as EarningsIcon,
  People as ManagementIcon,
  Person as ProfileIcon,
  Receipt as SettlementsIcon,
  Settings as SettingsIcon,
  SmartToy as AIIcon,
  SupportAgent as SupportIcon,
  TwoWheeler as RiderIcon,
  Workspaces as OperatorIcon,
} from '@mui/icons-material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { DashboardRole, getHighestPriorityRole } from '../../utils/roleRouting';
import { NotificationList, NotificationItem } from '../common/NotificationList';
import { getNotifications, markNotificationRead } from '../../services/notificationsApi';
import { SearchBar } from '../Search/SearchBar';

const DRAWER_WIDTH = 240;

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  disabled?: boolean;
}

/**
 * Role-based navigation configuration.
 *
 * Each dashboard role maps to a title, icon, and set of navigation items.
 * The user's highest-priority role (determined by `getHighestPriorityRole`)
 * selects which configuration to display in the sidebar.
 *
 * Priority order: admin > support > operator > business > rider
 */
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
      { label: 'Assets', icon: <FleetIcon />, path: '/assets' },
    ],
  },
  business: {
    title: 'Business Dashboard',
    icon: <BusinessIcon />,
    items: [
      { label: 'Overview', icon: <MetricsIcon />, path: '/dashboard/business' },
      { label: 'Deliveries', icon: <HistoryIcon />, path: '/dashboard/business/deliveries' },
      { label: 'New Request', icon: <SettlementsIcon />, path: '/dashboard/business/request' },
      { label: 'Active', icon: <RiderIcon />, path: '/dashboard/business/active' },
      { label: 'Billing', icon: <EarningsIcon />, path: '/dashboard/business/billing' },
      { label: 'Fleet Assets', icon: <FleetIcon />, path: '/assets' },
    ],
  },
  rider: {
    title: 'Rider Dashboard',
    icon: <RiderIcon />,
    items: [
      { label: 'Active', icon: <MetricsIcon />, path: '/dashboard/rider' },
      { label: 'History', icon: <HistoryIcon />, path: '/dashboard/rider/history' },
      { label: 'Earnings', icon: <EarningsIcon />, path: '/dashboard/rider/earnings' },
      { label: 'My Assets', icon: <FleetIcon />, path: '/assets' },
    ],
  },
  shopper: {
    title: 'Shopper Dashboard',
    icon: <HistoryIcon />,
    items: [
      { label: 'Overview', icon: <MetricsIcon />, path: '/dashboard/shopper' },
      { label: 'Orders', icon: <HistoryIcon />, path: '/dashboard/shopper/orders' },
      { label: 'Insights', icon: <EarningsIcon />, path: '/dashboard/shopper/insights' },
    ],
  },
};

/**
 * Navigation items shown for all authenticated users regardless of role.
 */
const COMMON_NAV_ITEMS: NavItem[] = [
  { label: 'Home', icon: <HomeIcon />, path: '/' },
  { label: 'Profile', icon: <ProfileIcon />, path: '/profile' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  { label: 'Messages', icon: <MessagesIcon />, path: '/messages' },
  { label: 'History', icon: <HistoryIcon />, path: '/history' },
  { label: 'AI Assistant', icon: <AIIcon />, path: '/ai' },
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
  const { user, token, logout, isLoading } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsAnchor, setNotificationsAnchor] = useState<HTMLButtonElement | null>(null);

  // Determine which role-specific nav config to use based on highest-priority role
  const dashboardRole = getHighestPriorityRole(user?.roles);
  const roleConfig = dashboardRole ? ROLE_NAV_CONFIG[dashboardRole] : null;

  // Badge displays the count of unread notifications
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch notifications on mount and when user/token changes
  useEffect(() => {
    let cancelled = false;

    async function fetchNotifications(): Promise<void> {
      try {
        const result = await getNotifications(token ?? undefined);
        if (!cancelled) {
          setNotifications(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    }

    if (user) {
      void fetchNotifications();
    }

    return () => {
      cancelled = true;
    };
  }, [user, token]);

  const handleDrawerToggle = useCallback((): void => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleNotificationsOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      setNotificationsAnchor(event.currentTarget);
    },
    []
  );

  const handleNotificationsClose = useCallback((): void => {
    setNotificationsAnchor(null);
  }, []);

  /**
   * Marks a notification as read via API and updates local state.
   * The badge count updates automatically since it derives from `notifications`.
   */
  const handleNotificationClick = useCallback(
    async (id: string): Promise<void> => {
      try {
        const updated = await markNotificationRead(id, token ?? undefined);
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? updated : n))
        );
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [token]
  );

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
          <Typography variant="h6" noWrap component="div" sx={{ display: { xs: 'none', md: 'block' }, fontWeight: 600 }}>
            {title ?? roleConfig?.title ?? 'Dashboard'}
          </Typography>

          <Box sx={{ flexGrow: 1, px: 2, display: 'flex', justifyContent: 'center' }}>
            <SearchBar />
          </Box>
          {user && (
            <>
              <IconButton
                color="inherit"
                onClick={handleNotificationsOpen}
                aria-label="Open notifications"
                sx={{ mr: 1 }}
              >
                <Badge badgeContent={unreadCount} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <Popover
                open={Boolean(notificationsAnchor)}
                anchorEl={notificationsAnchor}
                onClose={handleNotificationsClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                slotProps={{
                  paper: {
                    sx: { width: 360, maxHeight: 480 },
                  },
                }}
              >
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Notifications
                  </Typography>
                </Box>
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  <NotificationList
                    items={notifications}
                    onItemClick={handleNotificationClick}
                  />
                </Box>
              </Popover>
            </>
          )}
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
