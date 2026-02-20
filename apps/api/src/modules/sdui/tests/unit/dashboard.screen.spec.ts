/**
 * Dashboard Screen Strategy Tests
 *
 * Unit tests for role-based dashboard schema generation.
 */

import { DashboardScreenStrategy } from '../../strategies/dashboard.screen';
import { SDUIService } from '../../services/sdui.service';

describe('DashboardScreenStrategy', () => {
  let strategy: DashboardScreenStrategy;
  let mockSduiService: jest.Mocked<SDUIService>;

  beforeEach(() => {
    mockSduiService = {
      getNavigation: jest.fn(),
      getScreen: jest.fn(),
      executeAction: jest.fn(),
      registerRenderer: jest.fn(),
      getAvailableScreens: jest.fn(),
      hasScreen: jest.fn(),
    } as unknown as jest.Mocked<SDUIService>;

    strategy = new DashboardScreenStrategy(mockSduiService);
  });

  describe('render - Admin Dashboard', () => {
    it('should render admin dashboard with correct screenId', async () => {
      const request = { screenId: 'dashboard.admin', actorId: 'actor-admin-001' };
      const schema = await strategy.render(request);

      expect(schema.screenId).toBe('dashboard.admin');
      expect(schema.version).toBe('1.0.0');
    });

    it('should have admin-specific title', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      expect(schema.metadata.title).toBe('Admin Dashboard');
    });

    it('should require authentication', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      expect(schema.metadata.auth).toBe('required');
    });

    it('should include metrics data source', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      const metricsSource = schema.data?.find(d => d.id === 'metrics');
      expect(metricsSource).toBeDefined();
      expect(metricsSource?.staticData).toHaveProperty('totalUsers');
      expect(metricsSource?.staticData).toHaveProperty('totalRevenue');
    });

    it('should include activity data source', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      const activitySource = schema.data?.find(d => d.id === 'activity');
      expect(activitySource).toBeDefined();
      expect(activitySource?.staticData).toBeInstanceOf(Array);
    });

    it('should include pending tasks for admin', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      const pendingTasks = schema.data?.find(d => d.id === 'pending-tasks');
      expect(pendingTasks).toBeDefined();
    });

    it('should include grid layout', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      expect(schema.layout.type).toBe('grid');
    });

    it('should include admin-specific actions', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      const refreshAction = schema.actions.find(a => a.id === 'refresh');
      expect(refreshAction).toBeDefined();

      const createBookingAction = schema.actions.find(a => a.id === 'create-booking');
      expect(createBookingAction).toBeDefined();

      const assignDriverAction = schema.actions.find(a => a.id === 'assign-driver');
      expect(assignDriverAction).toBeDefined();

      const viewReportsAction = schema.actions.find(a => a.id === 'view-reports');
      expect(viewReportsAction).toBeDefined();
    });
  });

  describe('render - Dispatcher Dashboard', () => {
    it('should render dispatcher dashboard with correct screenId', async () => {
      const request = { screenId: 'dashboard.dispatcher' };
      const schema = await strategy.render(request);

      expect(schema.screenId).toBe('dashboard.dispatcher');
      expect(schema.metadata.title).toBe('Dispatcher Dashboard');
    });

    it('should include dispatcher-specific metrics', async () => {
      const request = { screenId: 'dashboard.dispatcher' };
      const schema = await strategy.render(request);

      const metricsSource = schema.data?.find(d => d.id === 'metrics');
      expect(metricsSource?.staticData).toHaveProperty('assignedDrivers');
      expect(metricsSource?.staticData).toHaveProperty('unassignedJobs');
    });

    it('should include pending tasks for dispatcher', async () => {
      const request = { screenId: 'dashboard.dispatcher' };
      const schema = await strategy.render(request);

      const pendingTasks = schema.data?.find(d => d.id === 'pending-tasks');
      expect(pendingTasks).toBeDefined();
    });

    it('should include dispatcher-specific actions', async () => {
      const request = { screenId: 'dashboard.dispatcher' };
      const schema = await strategy.render(request);

      const createBookingAction = schema.actions.find(a => a.id === 'create-booking');
      expect(createBookingAction).toBeDefined();

      const assignDriverAction = schema.actions.find(a => a.id === 'assign-driver');
      expect(assignDriverAction).toBeDefined();
    });
  });

  describe('render - Driver Dashboard', () => {
    it('should render driver dashboard with correct screenId', async () => {
      const request = { screenId: 'dashboard.driver' };
      const schema = await strategy.render(request);

      expect(schema.screenId).toBe('dashboard.driver');
      expect(schema.metadata.title).toBe('Driver Dashboard');
    });

    it('should include driver-specific metrics', async () => {
      const request = { screenId: 'dashboard.driver' };
      const schema = await strategy.render(request);

      const metricsSource = schema.data?.find(d => d.id === 'metrics');
      expect(metricsSource?.staticData).toHaveProperty('myDeliveries');
      expect(metricsSource?.staticData).toHaveProperty('myEarnings');
      expect(metricsSource?.staticData).toHaveProperty('rating');
    });

    it('should NOT include pending tasks for driver', async () => {
      const request = { screenId: 'dashboard.driver' };
      const schema = await strategy.render(request);

      const pendingTasks = schema.data?.find(d => d.id === 'pending-tasks');
      expect(pendingTasks).toBeUndefined();
    });

    it('should include driver-specific actions', async () => {
      const request = { screenId: 'dashboard.driver' };
      const schema = await strategy.render(request);

      const acceptJobAction = schema.actions.find(a => a.id === 'accept-job');
      expect(acceptJobAction).toBeDefined();

      const myStatsAction = schema.actions.find(a => a.id === 'my-stats');
      expect(myStatsAction).toBeDefined();
    });

    it('should NOT include admin actions for driver', async () => {
      const request = { screenId: 'dashboard.driver' };
      const schema = await strategy.render(request);

      const createBookingAction = schema.actions.find(a => a.id === 'create-booking');
      expect(createBookingAction).toBeUndefined();

      const viewReportsAction = schema.actions.find(a => a.id === 'view-reports');
      expect(viewReportsAction).toBeUndefined();
    });
  });

  describe('render - Business Dashboard', () => {
    it('should render business dashboard with correct screenId', async () => {
      const request = { screenId: 'dashboard.business' };
      const schema = await strategy.render(request);

      expect(schema.screenId).toBe('dashboard.business');
      expect(schema.metadata.title).toBe('Business Dashboard');
    });

    it('should include business-specific metrics', async () => {
      const request = { screenId: 'dashboard.business' };
      const schema = await strategy.render(request);

      const metricsSource = schema.data?.find(d => d.id === 'metrics');
      expect(metricsSource?.staticData).toHaveProperty('companyDeliveries');
      expect(metricsSource?.staticData).toHaveProperty('activeContracts');
      expect(metricsSource?.staticData).toHaveProperty('monthlySpend');
    });
  });

  describe('render - Default Dashboard', () => {
    it('should handle dashboard without role suffix', async () => {
      const request = { screenId: 'dashboard' };
      const schema = await strategy.render(request);

      expect(schema.screenId).toBe('dashboard');
      expect(schema.metadata.title).toBe('Dashboard');
    });

    it('should use default metrics for unknown roles', async () => {
      const request = { screenId: 'dashboard.unknown' };
      const schema = await strategy.render(request);

      const metricsSource = schema.data?.find(d => d.id === 'metrics');
      expect(metricsSource?.staticData).toHaveProperty('todayDeliveries');
    });
  });

  describe('executeAction', () => {
    it('should handle refresh action', async () => {
      const request = {
        screenId: 'dashboard.admin',
        actionId: 'refresh',
        actorId: 'actor-admin-001',
        payload: {},
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('lastRefresh');
      expect(response.toast?.message).toBe('Dashboard refreshed');
    });

    it('should handle create-booking action', async () => {
      const request = {
        screenId: 'dashboard.admin',
        actionId: 'create-booking',
        actorId: 'actor-admin-001',
        payload: {},
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('bookingId');
      expect(response.navigateTo).toBe('/bookings/new');
    });

    it('should handle assign-driver action', async () => {
      const request = {
        screenId: 'dashboard.admin',
        actionId: 'assign-driver',
        actorId: 'actor-admin-001',
        payload: { driverId: 'driver-001', bookingId: 'booking-001' },
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('assignmentId');
    });

    it('should return error for unknown action', async () => {
      const request = {
        screenId: 'dashboard.admin',
        actionId: 'unknown-action',
        actorId: 'actor-admin-001',
        payload: {},
      };

      const response = await strategy.executeAction(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown action');
    });
  });

  describe('layout structure', () => {
    it('should have metrics cards row', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      // Find the flex container with metrics cards
      const flexChild = schema.layout.children?.find(
        child => child.type === 'flex' && child.props?.gridColumn === 'span 12'
      );
      expect(flexChild).toBeDefined();
      expect(flexChild?.components).toBeDefined();
    });

    it('should have main content area', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      const mainContent = schema.layout.children?.find(
        child => child.props?.gridColumn === 'span 8'
      );
      expect(mainContent).toBeDefined();
    });

    it('should have sidebar', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      const sidebar = schema.layout.children?.find(
        child => child.props?.gridColumn === 'span 4'
      );
      expect(sidebar).toBeDefined();
    });

    it('should include tabs component', async () => {
      const request = { screenId: 'dashboard.admin' };
      const schema = await strategy.render(request);

      const mainContent = schema.layout.children?.find(
        child => child.props?.gridColumn === 'span 8'
      );
      
      const tabsComponent = mainContent?.components?.find(
        c => c.component === 'Tabs'
      );
      expect(tabsComponent).toBeDefined();
    });
  });
});
