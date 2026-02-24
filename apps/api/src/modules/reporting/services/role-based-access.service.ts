import { Injectable, Logger, ForbiddenException } from '@nestjs/common';

import { ReportType, ViewPermission, ReportAccess } from '../dto/reporting.enums';

/**
 * User context with roles and permissions
 */
export interface UserContext {
  userId: string;
  workspaceId: string | null;
  roles: string[];
  permissions: string[];
}

/**
 * RoleBasedAccessService
 *
 * Manages role-based access control for reports:
 * - Defines which reports each role can access
 * - Validates user permissions
 * - Filters data based on user context
 */
@Injectable()
export class RoleBasedAccessService {
  private readonly logger = new Logger(RoleBasedAccessService.name);

  // Report access control matrix
  private readonly reportAccessMatrix: ReportAccess[] = [
    // Contact Reports
    {
      reportType: ReportType.CONTACT_SUMMARY,
      requiredPermissions: [ViewPermission.PUBLIC],
      workspaceScoped: true,
      platformWide: true,
    },
    {
      reportType: ReportType.CONTACT_GROWTH,
      requiredPermissions: [ViewPermission.RIDER, ViewPermission.BUSINESS],
      workspaceScoped: true,
      platformWide: false,
    },
    {
      reportType: ReportType.CONTACT_ACTIVITY,
      requiredPermissions: [ViewPermission.BUSINESS, ViewPermission.FLEET_MANAGER],
      workspaceScoped: true,
      platformWide: false,
    },
    // Relationship Reports
    {
      reportType: ReportType.RELATIONSHIP_NETWORK,
      requiredPermissions: [ViewPermission.BUSINESS, ViewPermission.FLEET_MANAGER],
      workspaceScoped: true,
      platformWide: false,
    },
    {
      reportType: ReportType.REFERRAL_ANALYTICS,
      requiredPermissions: [ViewPermission.BUSINESS, ViewPermission.MARKETPLACE],
      workspaceScoped: true,
      platformWide: false,
    },
    // Business Reports
    {
      reportType: ReportType.CONVERSION_FUNNEL,
      requiredPermissions: [ViewPermission.BUSINESS, ViewPermission.MARKETPLACE],
      workspaceScoped: true,
      platformWide: false,
    },
    {
      reportType: ReportType.SEGMENT_ANALYTICS,
      requiredPermissions: [
        ViewPermission.BUSINESS,
        ViewPermission.FLEET_MANAGER,
        ViewPermission.MARKETPLACE,
      ],
      workspaceScoped: true,
      platformWide: false,
    },
    // Performance Reports
    {
      reportType: ReportType.RIDER_PERFORMANCE,
      requiredPermissions: [
        ViewPermission.RIDER,
        ViewPermission.BUSINESS,
        ViewPermission.FLEET_MANAGER,
      ],
      workspaceScoped: true,
      platformWide: false,
    },
    {
      reportType: ReportType.BUSINESS_METRICS,
      requiredPermissions: [ViewPermission.BUSINESS],
      workspaceScoped: true,
      platformWide: false,
    },
    {
      reportType: ReportType.FLEET_UTILIZATION,
      requiredPermissions: [ViewPermission.FLEET_MANAGER],
      workspaceScoped: true,
      platformWide: false,
    },
    // Financial Reports
    {
      reportType: ReportType.REVENUE_ANALYTICS,
      requiredPermissions: [
        ViewPermission.BUSINESS,
        ViewPermission.MARKETPLACE,
        ViewPermission.PLATFORM_ADMIN,
      ],
      workspaceScoped: true,
      platformWide: true,
    },
    {
      reportType: ReportType.COMMISSION_SUMMARY,
      requiredPermissions: [ViewPermission.PLATFORM_ADMIN],
      workspaceScoped: false,
      platformWide: true,
    },
  ];

  /**
   * Check if user can access a specific report
   */
  canAccessReport(userContext: UserContext, reportType: ReportType): boolean {
    const access = this.reportAccessMatrix.find((a) => a.reportType === reportType);

    if (!access) {
      this.logger.warn(`No access config found for report type: ${reportType}`);
      return false;
    }

    // Check if user has any of the required permissions
    const hasPermission = access.requiredPermissions.some(
      (required) =>
        userContext.roles.includes(required) || userContext.permissions.includes(required)
    );

    if (!hasPermission) {
      return false;
    }

    // Platform-wide reports can be accessed without workspace
    if (access.platformWide) {
      return true;
    }

    // Workspace-scoped reports require a workspace
    return userContext.workspaceId !== null;
  }

  /**
   * Get accessible reports for user
   */
  getAccessibleReports(userContext: UserContext): ReportType[] {
    return this.reportAccessMatrix
      .filter((access) => this.canAccessReport(userContext, access.reportType))
      .map((access) => access.reportType);
  }

  /**
   * Validate and filter query based on user context
   */
  validateAndFilterContext(
    userContext: UserContext,
    requestedWorkspaceId: string | null
  ): string | null {
    // Platform admins can access any workspace
    if (userContext.roles.includes(ViewPermission.PLATFORM_ADMIN)) {
      return requestedWorkspaceId;
    }

    // If no workspace requested, use user's workspace
    if (!requestedWorkspaceId) {
      return userContext.workspaceId;
    }

    // Check if user can access this workspace
    if (requestedWorkspaceId !== userContext.workspaceId) {
      // Check for cross-workspace permission
      const hasCrossWorkspace = userContext.permissions.includes('CROSS_WORKSPACE_ACCESS');
      if (!hasCrossWorkspace) {
        throw new ForbiddenException('Access denied to this workspace');
      }
    }

    return requestedWorkspaceId;
  }

  /**
   * Get view permissions for user role
   */
  getViewPermissionsForRole(role: string): ViewPermission[] {
    const rolePermissions: Record<string, ViewPermission[]> = {
      [ViewPermission.RIDER]: [ViewPermission.RIDER],
      [ViewPermission.BUSINESS]: [
        ViewPermission.BUSINESS,
        ViewPermission.RIDER, // Can see rider reports
      ],
      [ViewPermission.FLEET_MANAGER]: [
        ViewPermission.FLEET_MANAGER,
        ViewPermission.RIDER,
        ViewPermission.BUSINESS,
      ],
      [ViewPermission.MARKETPLACE]: [ViewPermission.MARKETPLACE, ViewPermission.BUSINESS],
      [ViewPermission.PLATFORM_ADMIN]: [
        ViewPermission.PLATFORM_ADMIN,
        ViewPermission.MARKETPLACE,
        ViewPermission.FLEET_MANAGER,
        ViewPermission.BUSINESS,
        ViewPermission.RIDER,
        ViewPermission.PUBLIC,
      ],
    };

    return rolePermissions[role] || [];
  }

  /**
   * Create user context from request
   */
  createUserContext(userId: string, workspaceId: string | null, roles: string[]): UserContext {
    // Collect all permissions from roles
    const permissions = new Set<string>();

    for (const role of roles) {
      const rolePerms = this.getViewPermissionsForRole(role);
      rolePerms.forEach((p) => permissions.add(p));
    }

    return {
      userId,
      workspaceId,
      roles,
      permissions: Array.from(permissions),
    };
  }

  /**
   * Get default dashboard for user role
   */
  getDefaultDashboard(role: string): string {
    const dashboardMap: Record<string, string> = {
      [ViewPermission.RIDER]: 'rider-dashboard',
      [ViewPermission.BUSINESS]: 'business-dashboard',
      [ViewPermission.FLEET_MANAGER]: 'fleet-dashboard',
      [ViewPermission.MARKETPLACE]: 'marketplace-dashboard',
      [ViewPermission.PLATFORM_ADMIN]: 'platform-dashboard',
    };

    return dashboardMap[role] || 'default-dashboard';
  }
}
