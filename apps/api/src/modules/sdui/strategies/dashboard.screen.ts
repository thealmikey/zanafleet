/**
 * Dashboard Screen Strategy
 *
 * Schema definition for role-based dashboards using seeded data.
 */

import { ScreenRenderer, SDUIService } from '../services/sdui.service';
import {
  UISchema,
  SDUIRequest,
  SDUIActionRequest,
  SDUIActionResponse,
  ScreenMetadata,
  ScreenType,
  AuthRequirement,
  LayoutNode,
  LayoutType,
  DataSource,
  ActionDefinition,
  ActionType,
  ComponentRef,
} from '../interfaces';

// Dynamically import sandbox to avoid build issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let InMemoryStoreFactoryClass: any = null;
let isSandboxAvailable = false;

try {
  const sandboxModule = require('../../../core/sandbox/in-memory-store.factory');
  InMemoryStoreFactoryClass = sandboxModule.InMemoryStoreFactoryService;
  isSandboxAvailable = true;
} catch {
  // Sandbox not available - will use demo data
}

/**
 * Dashboard Screen Schema
 *
 * Server-driven UI schema for role-based dashboards.
 */
export class DashboardScreenStrategy implements ScreenRenderer {
  private readonly sduiService: SDUIService;

  constructor(sduiService: SDUIService) {
    this.sduiService = sduiService;
  }

  /**
   * Render the dashboard screen schema
   */
  async render(request: SDUIRequest): Promise<UISchema> {
    const { screenId } = request;

    // Extract role from screenId (e.g., 'dashboard.admin', 'dashboard.dispatcher')
    const role = this.extractRole(screenId);

    const metadata: ScreenMetadata = {
      title: this.getDashboardTitle(role),
      description: `${role.charAt(0).toUpperCase() + role.slice(1)} Dashboard`,
      type: 'dashboard' as ScreenType,
      auth: 'required' as AuthRequirement,
      allowedRoles: [role, 'admin'],
      cacheDuration: 30, // Cache for 30 seconds
      offlineCapable: true,
    };

    // Build data sources - try sandbox first, then demo
    const dataSources = await this.buildDataSources(role);

    // Build layout based on role
    const layout = this.buildLayout(role);

    // Build actions based on role
    const actions = this.buildActions(role);

    return {
      version: '1.0.0',
      screenId,
      metadata,
      data: dataSources,
      layout,
      actions,
    };
  }

  /**
   * Execute dashboard action
   */
  async executeAction(request: SDUIActionRequest): Promise<SDUIActionResponse> {
    const { actionId } = request;

    switch (actionId) {
      case 'refresh':
        return {
          success: true,
          data: { lastRefresh: new Date().toISOString() },
          toast: {
            message: 'Dashboard refreshed',
            type: 'success',
          },
        };

      case 'create-booking':
        return {
          success: true,
          data: { bookingId: 'BK-' + Date.now() },
          navigateTo: '/bookings/new',
          toast: {
            message: 'Booking created successfully',
            type: 'success',
          },
        };

      case 'assign-driver':
        return {
          success: true,
          data: { assignmentId: 'ASG-' + Date.now() },
          toast: {
            message: 'Driver assigned successfully',
            type: 'success',
          },
        };

      default:
        return {
          success: false,
          error: `Unknown action: ${actionId}`,
          errorCode: 'UNKNOWN_ACTION',
        };
    }
  }

  /**
   * Extract role from screen ID
   */
  private extractRole(screenId: string): string {
    const parts = screenId.split('.');
    return parts.length > 1 ? parts[1] : 'default';
  }

  /**
   * Get dashboard title based on role
   */
  private getDashboardTitle(role: string): string {
    const titles: Record<string, string> = {
      admin: 'Admin Dashboard',
      dispatcher: 'Dispatcher Dashboard',
      driver: 'Driver Dashboard',
      business: 'Business Dashboard',
      rider: 'Rider Dashboard',
      operator: 'Operator Dashboard',
      default: 'Dashboard',
    };
    return titles[role] || titles.default;
  }

  /**
   * Build data sources - tries sandbox first, falls back to demo
   */
  private async buildDataSources(role: string): Promise<DataSource[]> {
    const dataSources: DataSource[] = [];

    // Try to get data from sandbox
    if (isSandboxAvailable && InMemoryStoreFactoryClass) {
      try {
        const storeFactory = new InMemoryStoreFactoryClass();
        
        const actorStore = storeFactory.getStore('Actor');
        const processStore = storeFactory.getStore('ProcessInstance');
        const businessStore = storeFactory.getStore('Business');

        const totalActors = await actorStore.count();
        const processInstances = await processStore.findAll();
        const businesses = await businessStore.findAll();

        const activeBookings = processInstances.filter(
          (p: Record<string, unknown>) => p.status === 'ACTIVE'
        ).length;

        const completedBookings = processInstances.filter(
          (p: Record<string, unknown>) => p.status === 'COMPLETED'
        ).length;

        // Use seeded data
        dataSources.push({
          id: 'metrics',
          type: 'static',
          endpoint: 'sandbox://metrics',
          staticData: {
            totalActors,
            activeBookings,
            completedBookings,
            totalBusinesses: businesses.length,
            todayDeliveries: activeBookings,
            pendingAssignments: Math.floor(activeBookings * 0.3),
            ...this.getDemoMetrics(role),
          },
        });
      } catch {
        // Fall through to demo data
        dataSources.push({
          id: 'metrics',
          type: 'static',
          endpoint: 'demo://metrics',
          staticData: this.getDemoMetrics(role),
        });
      }
    } else {
      // Use demo data
      dataSources.push({
        id: 'metrics',
        type: 'static',
        endpoint: 'demo://metrics',
        staticData: this.getDemoMetrics(role),
      });
    }

    // Recent activity data source
    dataSources.push({
      id: 'activity',
      type: 'static',
      endpoint: 'demo://activity',
      staticData: this.getDemoActivity(),
    });

    // Pending tasks for dispatcher/admin
    if (role === 'admin' || role === 'dispatcher') {
      dataSources.push({
        id: 'pending-tasks',
        type: 'static',
        endpoint: 'demo://pending-tasks',
        staticData: this.getDemoPendingTasks(role),
      });
    }

    // Chart data sources for admin/dispatcher
    if (role === 'admin' || role === 'dispatcher') {
      dataSources.push({
        id: 'revenue-trend',
        type: 'static',
        endpoint: 'demo://revenue-trend',
        staticData: this.getRevenueTrendData(),
      });

      dataSources.push({
        id: 'settlement-status',
        type: 'static',
        endpoint: 'demo://settlement-status',
        staticData: this.getSettlementStatusData(),
      });
    }

    return dataSources;
  }

  /**
   * Get demo metrics based on role
   */
  private getDemoMetrics(role: string): Record<string, unknown> {
    const baseMetrics = {
      todayDeliveries: 24,
      activeRiders: 12,
      pendingAssignments: 5,
      completedToday: 18,
      onTimeRate: 94.5,
      customerRating: 4.8,
    };

    const roleMetrics: Record<string, Record<string, unknown>> = {
      admin: {
        ...baseMetrics,
        totalUsers: 156,
        activeBusinesses: 23,
        totalRevenue: 245000,
        systemHealth: 99.9,
      },
      dispatcher: {
        ...baseMetrics,
        assignedDrivers: 8,
        unassignedJobs: 5,
        urgentDeliveries: 2,
        etaViolations: 1,
      },
      driver: {
        ...baseMetrics,
        myDeliveries: 8,
        myEarnings: 2400,
        rating: 4.9,
        onlineHours: 6.5,
      },
      business: {
        ...baseMetrics,
        companyDeliveries: 45,
        activeContracts: 3,
        monthlySpend: 67500,
      },
    };

    return roleMetrics[role] || baseMetrics;
  }

  /**
   * Get chart data for revenue trend (LineChart)
   */
  private getRevenueTrendData(): Record<string, unknown> {
    return {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Revenue (KES)',
          data: [125000, 145000, 138000, 172000, 189000, 210000, 245000],
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
        },
      ],
    };
  }

  /**
   * Get chart data for settlement status (DoughnutChart)
   */
  private getSettlementStatusData(): Record<string, unknown> {
    return {
      labels: ['Completed', 'Processing', 'Pending', 'Failed'],
      datasets: [
        {
          label: 'Settlements',
          data: [145, 32, 18, 5],
          backgroundColor: ['#4caf50', '#2196f3', '#ff9800', '#f44336'],
        },
      ],
    };
  }

  /**
   * Get demo activity
   */
  private getDemoActivity(): unknown[] {
    return [
      {
        id: '1',
        type: 'delivery_completed',
        message: 'Delivery #1001 completed',
        timestamp: new Date().toISOString(),
        icon: 'check_circle',
      },
      {
        id: '2',
        type: 'new_booking',
        message: 'New booking #1002 received',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        icon: 'add_circle',
      },
      {
        id: '3',
        type: 'driver_assigned',
        message: 'Driver assigned to #1001',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        icon: 'person',
      },
    ];
  }

  /**
   * Get demo pending tasks based on role
   */
  private getDemoPendingTasks(role: string): unknown[] {
    const tasks = [
      {
        id: 'task-1',
        title: 'Review booking #1003',
        description: 'Pending driver assignment',
        priority: 'high',
        dueIn: '1 hour',
      },
      {
        id: 'task-2',
        title: 'Verify driver documents',
        description: 'Documents expiring soon',
        priority: 'medium',
        dueIn: '2 hours',
      },
      {
        id: 'task-3',
        title: 'Process refund request',
        description: 'Customer #456 request',
        priority: 'low',
        dueIn: '1 day',
      },
    ];

    return role === 'admin' ? tasks : tasks.slice(0, 2);
  }

  /**
   * Build layout based on role
   */
  private buildLayout(role: string): LayoutNode {
    const metricsCards = this.buildMetricsCards(role);
    const sidebarComponents: ComponentRef[] = [
      {
        component: 'Card',
        props: {
          title: 'Quick Actions',
        },
      },
    ];

    // Add pending tasks for admin/dispatcher
    if (role === 'admin' || role === 'dispatcher') {
      sidebarComponents.push({
        component: 'Card',
        props: {
          title: 'Pending Tasks',
        },
      });
    }

    sidebarComponents.push({
      component: 'Card',
      props: {
        title: 'System Status',
      },
    });

    return {
      type: 'grid' as LayoutType,
      props: {
        columns: 12,
        spacing: 3,
        maxWidth: 1200,
        width: '100%',
        padding: 3,
      },
      children: [
        // Metrics Cards Row
        {
          type: 'flex' as LayoutType,
          props: {
            gridColumn: 'span 12',
            spacing: 3,
            wrap: true,
          },
          components: metricsCards,
        },
        // Charts Row (for admin/dispatcher)
        ...(role === 'admin' || role === 'dispatcher' ? [
          {
            type: 'flex' as LayoutType,
            props: {
              gridColumn: 'span 12',
              spacing: 3,
            },
            components: [
              {
                component: 'LineChart',
                id: 'revenue-chart',
                props: {
                  title: 'Revenue Trend',
                  data: '{{revenue-trend}}',
                  height: 240,
                },
              },
              {
                component: 'DoughnutChart',
                id: 'settlement-chart',
                props: {
                  title: 'Settlement Status',
                  data: '{{settlement-status}}',
                  height: 240,
                },
              },
            ],
          },
        ] : []),
        // Main Content Area
        {
          type: 'stack' as LayoutType,
          props: {
            gridColumn: 'span 8',
            spacing: 3,
          },
          components: [
            {
              component: 'Tabs',
              props: {
                tabs: [
                  { label: 'Overview', value: 'overview' },
                  { label: 'Recent Activity', value: 'activity' },
                  { label: 'Reports', value: 'reports' },
                ],
              },
            },
            {
              component: 'DataTable',
              props: {
                dataSource: 'activity',
                columns: [
                  { field: 'icon', header: '', width: 40 },
                  { field: 'message', header: 'Activity' },
                  { field: 'timestamp', header: 'Time' },
                ],
              },
            },
          ],
        },
        // Sidebar
        {
          type: 'stack' as LayoutType,
          props: {
            gridColumn: 'span 4',
            spacing: 3,
          },
          components: sidebarComponents,
        },
      ],
    };
  }

  /**
   * Build metrics cards based on role
   */
  private buildMetricsCards(role: string): ComponentRef[] {
    const cardConfigs: Record<string, Array<{ id: string; label: string; dataPath: string; icon: string; color: string }>> = {
      admin: [
        { id: 'total-users', label: 'Total Users', dataPath: 'metrics.totalUsers', icon: 'people', color: 'blue' },
        { id: 'active-businesses', label: 'Active Businesses', dataPath: 'metrics.activeBusinesses', icon: 'business', color: 'green' },
        { id: 'revenue', label: 'Total Revenue', dataPath: 'metrics.totalRevenue', icon: 'attach_money', color: 'purple' },
        { id: 'system-health', label: 'System Health', dataPath: 'metrics.systemHealth', icon: 'health', color: 'teal' },
      ],
      dispatcher: [
        { id: 'today-deliveries', label: "Today's Deliveries", dataPath: 'metrics.todayDeliveries', icon: 'local_shipping', color: 'blue' },
        { id: 'active-riders', label: 'Active Riders', dataPath: 'metrics.assignedDrivers', icon: 'two_wheelers', color: 'green' },
        { id: 'unassigned', label: 'Unassigned Jobs', dataPath: 'metrics.unassignedJobs', icon: 'assignment', color: 'orange' },
        { id: 'urgent', label: 'Urgent', dataPath: 'metrics.urgentDeliveries', icon: 'warning', color: 'red' },
      ],
      driver: [
        { id: 'my-deliveries', label: 'My Deliveries', dataPath: 'metrics.myDeliveries', icon: 'local_shipping', color: 'blue' },
        { id: 'earnings', label: 'Earnings', dataPath: 'metrics.myEarnings', icon: 'attach_money', color: 'green' },
        { id: 'rating', label: 'Rating', dataPath: 'metrics.rating', icon: 'star', color: 'amber' },
        { id: 'hours', label: 'Online Hours', dataPath: 'metrics.onlineHours', icon: 'schedule', color: 'purple' },
      ],
      business: [
        { id: 'company-deliveries', label: 'Company Deliveries', dataPath: 'metrics.companyDeliveries', icon: 'local_shipping', color: 'blue' },
        { id: 'contracts', label: 'Active Contracts', dataPath: 'metrics.activeContracts', icon: 'description', color: 'green' },
        { id: 'spend', label: 'Monthly Spend', dataPath: 'metrics.monthlySpend', icon: 'credit_card', color: 'purple' },
        { id: 'on-time', label: 'On-Time Rate', dataPath: 'metrics.onTimeRate', icon: 'timer', color: 'teal' },
      ],
    };

    const configs = cardConfigs[role] || cardConfigs.admin;

    return configs.map((config) => ({
      component: 'MetricCard',
      id: config.id,
      props: {
        label: config.label,
        icon: config.icon,
        color: config.color,
        value: `{{${config.dataPath}}}`,
      },
      layout: {
        colSpan: 3,
      },
    }));
  }

  /**
   * Build actions based on role
   */
  private buildActions(role: string): ActionDefinition[] {
    const actions: ActionDefinition[] = [
      {
        id: 'refresh',
        label: 'Refresh',
        type: 'api' as ActionType,
        endpoint: `/api/sdui/screens/dashboard.${role}/actions/refresh`,
        method: 'POST',
        onSuccess: {
          type: 'refresh',
        },
      },
    ];

    // Role-specific actions
    if (role === 'admin' || role === 'dispatcher') {
      actions.push(
        {
          id: 'create-booking',
          label: 'New Booking',
          type: 'navigate' as ActionType,
          navigateTo: '/bookings/new',
          capability: 'move:booking:create',
        },
        {
          id: 'assign-driver',
          label: 'Assign Driver',
          type: 'api' as ActionType,
          endpoint: `/api/sdui/screens/dashboard.${role}/actions/assign-driver`,
          method: 'POST',
          capability: 'move:driver:assign',
        },
        {
          id: 'view-reports',
          label: 'View Reports',
          type: 'navigate' as ActionType,
          navigateTo: '/reports',
          capability: 'analytics:report:view',
        }
      );
    }

    if (role === 'driver') {
      actions.push(
        {
          id: 'accept-job',
          label: 'Accept Job',
          type: 'api' as ActionType,
          capability: 'move:booking:view',
        },
        {
          id: 'my-stats',
          label: 'My Stats',
          type: 'navigate' as ActionType,
          navigateTo: '/driver/stats',
        }
      );
    }

    return actions;
  }
}
