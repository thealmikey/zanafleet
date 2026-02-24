import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  DashboardLayout,
  DashboardWidget,
  DashboardWidgetType,
  ReportType,
} from '../dto/reporting.enums';

/**
 * DashboardService
 *
 * Manages dashboard layouts and widget configurations:
 * - Predefined dashboard layouts for different roles
 * - Dynamic widget configuration
 * - Dashboard data fetching
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  // Predefined dashboards
  private readonly defaultDashboards: DashboardLayout[] = [
    {
      id: 'rider-dashboard',
      name: 'Rider Dashboard',
      description: 'Personal performance view for riders',
      isDefault: true,
      widgets: [
        {
          id: 'rider-earnings',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Total Earnings',
          reportType: ReportType.REVENUE_ANALYTICS,
          position: { x: 0, y: 0, width: 1, height: 1 },
          config: { metric: 'earnings' },
        },
        {
          id: 'rider-jobs',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Completed Jobs',
          reportType: ReportType.RIDER_PERFORMANCE,
          position: { x: 1, y: 0, width: 1, height: 1 },
          config: { metric: 'completedJobs' },
        },
        {
          id: 'rider-rating',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Average Rating',
          reportType: ReportType.RIDER_PERFORMANCE,
          position: { x: 2, y: 0, width: 1, height: 1 },
          config: { metric: 'rating' },
        },
        {
          id: 'rider-activity',
          type: DashboardWidgetType.LINE_CHART,
          title: 'Activity Over Time',
          reportType: ReportType.CONTACT_ACTIVITY,
          position: { x: 0, y: 1, width: 3, height: 2 },
        },
      ],
    },
    {
      id: 'business-dashboard',
      name: 'Business Dashboard',
      description: 'Overview for business owners',
      isDefault: true,
      widgets: [
        {
          id: 'business-contacts',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Total Contacts',
          reportType: ReportType.CONTACT_SUMMARY,
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
        {
          id: 'business-conversion',
          type: DashboardWidgetType.FUNNEL,
          title: 'Conversion Funnel',
          reportType: ReportType.CONVERSION_FUNNEL,
          position: { x: 1, y: 0, width: 2, height: 2 },
        },
        {
          id: 'business-growth',
          type: DashboardWidgetType.LINE_CHART,
          title: 'Contact Growth',
          reportType: ReportType.CONTACT_GROWTH,
          position: { x: 0, y: 2, width: 2, height: 2 },
        },
        {
          id: 'business-segments',
          type: DashboardWidgetType.PIE_CHART,
          title: 'Segment Distribution',
          reportType: ReportType.SEGMENT_ANALYTICS,
          position: { x: 2, y: 2, width: 1, height: 1 },
        },
        {
          id: 'business-referrals',
          type: DashboardWidgetType.BAR_CHART,
          title: 'Referral Analytics',
          reportType: ReportType.REFERRAL_ANALYTICS,
          position: { x: 2, y: 3, width: 1, height: 1 },
        },
      ],
    },
    {
      id: 'fleet-dashboard',
      name: 'Fleet Manager Dashboard',
      description: 'Fleet operations overview',
      isDefault: true,
      widgets: [
        {
          id: 'fleet-utilization',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Fleet Utilization',
          reportType: ReportType.FLEET_UTILIZATION,
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
        {
          id: 'fleet-performance',
          type: DashboardWidgetType.BAR_CHART,
          title: 'Rider Performance',
          reportType: ReportType.RIDER_PERFORMANCE,
          position: { x: 1, y: 0, width: 2, height: 2 },
        },
        {
          id: 'fleet-contacts',
          type: DashboardWidgetType.TABLE,
          title: 'Team Contacts',
          reportType: ReportType.CONTACT_ACTIVITY,
          position: { x: 0, y: 2, width: 3, height: 2 },
        },
      ],
    },
    {
      id: 'marketplace-dashboard',
      name: 'Marketplace Dashboard',
      description: 'Marketplace analytics',
      isDefault: true,
      widgets: [
        {
          id: 'marketplace-business',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Active Businesses',
          reportType: ReportType.BUSINESS_METRICS,
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
        {
          id: 'marketplace-revenue',
          type: DashboardWidgetType.LINE_CHART,
          title: 'Revenue Trend',
          reportType: ReportType.REVENUE_ANALYTICS,
          position: { x: 1, y: 0, width: 2, height: 2 },
        },
        {
          id: 'marketplace-segments',
          type: DashboardWidgetType.PIE_CHART,
          title: 'Business Segments',
          reportType: ReportType.SEGMENT_ANALYTICS,
          position: { x: 0, y: 2, width: 1, height: 1 },
        },
        {
          id: 'marketplace-conversion',
          type: DashboardWidgetType.FUNNEL,
          title: 'Conversion Flow',
          reportType: ReportType.CONVERSION_FUNNEL,
          position: { x: 1, y: 2, width: 2, height: 2 },
        },
      ],
    },
    {
      id: 'platform-dashboard',
      name: 'Platform Admin Dashboard',
      description: 'Platform-wide analytics',
      isDefault: true,
      widgets: [
        {
          id: 'platform-total',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Total Contacts',
          reportType: ReportType.CONTACT_SUMMARY,
          position: { x: 0, y: 0, width: 1, height: 1 },
        },
        {
          id: 'platform-revenue',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Platform Revenue',
          reportType: ReportType.REVENUE_ANALYTICS,
          position: { x: 1, y: 0, width: 1, height: 1 },
        },
        {
          id: 'platform-commission',
          type: DashboardWidgetType.KPI_CARD,
          title: 'Commission Earned',
          reportType: ReportType.COMMISSION_SUMMARY,
          position: { x: 2, y: 0, width: 1, height: 1 },
        },
        {
          id: 'platform-growth',
          type: DashboardWidgetType.LINE_CHART,
          title: 'Platform Growth',
          reportType: ReportType.CONTACT_GROWTH,
          position: { x: 0, y: 1, width: 2, height: 2 },
        },
        {
          id: 'platform-segments',
          type: DashboardWidgetType.PIE_CHART,
          title: 'Segments',
          reportType: ReportType.SEGMENT_ANALYTICS,
          position: { x: 2, y: 1, width: 1, height: 1 },
        },
        {
          id: 'platform-funnel',
          type: DashboardWidgetType.FUNNEL,
          title: 'Conversion Funnel',
          reportType: ReportType.CONVERSION_FUNNEL,
          position: { x: 0, y: 3, width: 3, height: 2 },
        },
      ],
    },
  ];

  /**
   * Get dashboard by ID
   */
  getDashboard(dashboardId: string): DashboardLayout | undefined {
    return this.defaultDashboards.find((d) => d.id === dashboardId);
  }

  /**
   * Get default dashboard for a role
   */
  getDefaultDashboardForRole(role: string): DashboardLayout {
    const roleToDashboard: Record<string, string> = {
      RIDER: 'rider-dashboard',
      BUSINESS: 'business-dashboard',
      FLEET_MANAGER: 'fleet-dashboard',
      MARKETPLACE: 'marketplace-dashboard',
      PLATFORM_ADMIN: 'platform-dashboard',
    };

    const dashboardId = roleToDashboard[role] || 'business-dashboard';
    return this.getDashboard(dashboardId) || this.defaultDashboards[0];
  }

  /**
   * Get all available dashboards
   */
  getAllDashboards(): DashboardLayout[] {
    return this.defaultDashboards;
  }

  /**
   * Get widgets for a dashboard
   */
  getDashboardWidgets(dashboardId: string): DashboardWidget[] {
    const dashboard = this.getDashboard(dashboardId);
    return dashboard?.widgets || [];
  }

  /**
   * Create custom dashboard layout
   */
  createDashboard(name: string, description: string, widgets: DashboardWidget[]): DashboardLayout {
    const id = `custom-${Date.now()}`;

    return {
      id,
      name,
      description,
      widgets,
      isDefault: false,
    };
  }

  /**
   * Add widget to dashboard
   */
  addWidgetToDashboard(dashboardId: string, widget: DashboardWidget): DashboardLayout | null {
    const dashboard = this.getDashboard(dashboardId);

    if (!dashboard) {
      return null;
    }

    dashboard.widgets.push(widget);
    return dashboard;
  }

  /**
   * Remove widget from dashboard
   */
  removeWidgetFromDashboard(dashboardId: string, widgetId: string): DashboardLayout | null {
    const dashboard = this.getDashboard(dashboardId);

    if (!dashboard) {
      return null;
    }

    dashboard.widgets = dashboard.widgets.filter((w) => w.id !== widgetId);
    return dashboard;
  }
}
