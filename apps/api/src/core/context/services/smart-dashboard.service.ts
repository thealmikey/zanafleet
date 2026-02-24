import { Injectable, Logger } from '@nestjs/common';

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';
import { MembershipEntity } from '@api/modules/workspace/entities/membership.entity';

import {
  DashboardDataSource,
  DashboardMergeConfig,
  DashboardResponse,
  WorkspaceMembershipInfo,
} from '../context.types';

/**
 * Dashboard merge configurations by role
 */
const DASHBOARD_MERGE_CONFIGS: Record<MembershipRole, DashboardMergeConfig> = {
  [MembershipRole.RIDER]: {
    role: MembershipRole.RIDER,
    priority: 10,
    dataSources: [
      { type: 'my_jobs', workspaceScope: 'current' },
      { type: 'available_jobs', workspaceScope: 'current' },
      { type: 'earnings', workspaceScope: 'all_rider_workspaces' },
      { type: 'performance', workspaceScope: 'current' },
    ],
    layout: 'unified',
  },
  [MembershipRole.CUSTOMER]: {
    role: MembershipRole.CUSTOMER,
    priority: 10,
    dataSources: [
      { type: 'my_orders', workspaceScope: 'current' },
      { type: 'addresses', workspaceScope: 'current' },
      { type: 'payment_methods', workspaceScope: 'current' },
    ],
    layout: 'unified',
  },
  [MembershipRole.BUSINESS_OWNER]: {
    role: MembershipRole.BUSINESS_OWNER,
    priority: 20,
    dataSources: [
      { type: 'my_jobs', workspaceScope: 'current' },
      { type: 'team_members', workspaceScope: 'current' },
      { type: 'analytics', workspaceScope: 'current' },
      { type: 'pricing', workspaceScope: 'current' },
    ],
    layout: 'tabs',
  },
  [MembershipRole.ADMIN]: {
    role: MembershipRole.ADMIN,
    priority: 30,
    dataSources: [
      { type: 'workspace_overview', workspaceScope: 'current' },
      { type: 'member_list', workspaceScope: 'current' },
      { type: 'system_settings', workspaceScope: 'current' },
      { type: 'analytics', workspaceScope: 'current' },
    ],
    layout: 'sidebar',
  },
  [MembershipRole.OPS]: {
    role: MembershipRole.OPS,
    priority: 25,
    dataSources: [
      { type: 'active_jobs', workspaceScope: 'current' },
      { type: 'rider_overview', workspaceScope: 'current' },
      { type: 'analytics', workspaceScope: 'current' },
      { type: 'reassignments', workspaceScope: 'current' },
    ],
    layout: 'tabs',
  },
};

/**
 * SmartDashboardService
 *
 * Intelligently builds dashboards based on the user's projected role.
 * Automatically merges data from multiple sources based on role configuration.
 */

@Injectable()
export class SmartDashboardService {
  private readonly logger = new Logger(SmartDashboardService.name);

  /**
   * Build dashboard based on projected role
   */
  async buildDashboard(
    actorId: string,
    projectedRole: MembershipRole,
    workspaceId: string,
    memberships: MembershipEntity[]
  ): Promise<DashboardResponse> {
    // 1. Get merge config for role
    const config = this.getMergeConfig(projectedRole);

    // 2. Get available workspaces for switching
    const allWorkspaces = await this.getSwitchableWorkspaces(memberships);

    // 3. Fetch data from configured sources
    const dataPromises = config.dataSources.map((source) =>
      this.fetchDashboardData(actorId, source, workspaceId, memberships)
    );

    const dataResults = await Promise.allSettled(dataPromises);

    // 4. Merge data based on layout type
    const mergedData = this.mergeData(dataResults, config.layout);

    this.logger.debug(
      `Built dashboard for actor ${actorId} with role ${projectedRole} in workspace ${workspaceId}`
    );

    return {
      role: projectedRole,
      workspaceId,
      layout: config.layout,
      data: mergedData,
      availableWorkspaces: allWorkspaces,
    };
  }

  /**
   * Get merge configuration for a role
   */
  getMergeConfig(role: MembershipRole): DashboardMergeConfig {
    return DASHBOARD_MERGE_CONFIGS[role];
  }

  /**
   * Get all available workspaces for role switching
   */
  async getSwitchableWorkspaces(
    memberships: MembershipEntity[]
  ): Promise<WorkspaceMembershipInfo[]> {
    return memberships.map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: m.workspaceId, // Would join to get actual name
      role: m.role,
      isDefault: m.defaultWorkspace,
    }));
  }

  /**
   * Fetch dashboard data from a source
   */
  private async fetchDashboardData(
    actorId: string,
    source: DashboardDataSource,
    currentWorkspaceId: string,
    memberships: MembershipEntity[]
  ): Promise<{ type: string; data: unknown }> {
    // TODO: Implement actual data fetching based on source type
    // This is a placeholder that would query the appropriate services

    this.logger.debug(`Fetching dashboard data: ${source.type} (scope: ${source.workspaceScope})`);

    // Determine which workspaces to query based on scope
    let workspacesToQuery: string[];

    switch (source.workspaceScope) {
      case 'current':
        workspacesToQuery = [currentWorkspaceId];
        break;
      case 'all_rider_workspaces':
        workspacesToQuery = memberships
          .filter((m) => m.role === MembershipRole.RIDER)
          .map((m) => m.workspaceId);
        break;
      case 'all_business_workspaces':
        workspacesToQuery = memberships
          .filter((m) => m.role === MembershipRole.BUSINESS_OWNER)
          .map((m) => m.workspaceId);
        break;
      default:
        workspacesToQuery = [currentWorkspaceId];
    }

    // Placeholder data - would be replaced with actual queries
    return {
      type: source.type,
      data: {
        workspaceScope: workspacesToQuery,
        items: [],
      },
    };
  }

  /**
   * Merge data based on layout type
   */
  private mergeData(
    dataResults: PromiseSettledResult<{ type: string; data: unknown }>[],
    layout: 'tabs' | 'sidebar' | 'unified'
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = {};

    for (const result of dataResults) {
      if (result.status === 'fulfilled') {
        merged[result.value.type] = result.value.data;
      } else {
        this.logger.warn(`Failed to fetch dashboard data: ${result.reason}`);
      }
    }

    // Add layout-specific structure
    switch (layout) {
      case 'tabs':
        return {
          sections: Object.keys(merged),
          data: merged,
        };
      case 'sidebar':
        return {
          navigation: Object.keys(merged),
          content: merged,
        };
      case 'unified':
      default:
        return {
          unified: merged,
        };
    }
  }

  /**
   * Get available role switches for UI
   */
  getAvailableRoleSwitches(
    memberships: MembershipEntity[]
  ): { role: MembershipRole; workspaceId: string; label: string }[] {
    return memberships.map((m) => ({
      role: m.role,
      workspaceId: m.workspaceId,
      label: `${this.getRoleLabel(m.role)} - ${m.workspaceId}`, // Would include workspace name
    }));
  }

  /**
   * Get human-readable role label
   */
  getRoleLabel(role: MembershipRole): string {
    const labels: Record<MembershipRole, string> = {
      [MembershipRole.RIDER]: 'Rider',
      [MembershipRole.CUSTOMER]: 'Customer',
      [MembershipRole.BUSINESS_OWNER]: 'Business Owner',
      [MembershipRole.ADMIN]: 'Admin',
      [MembershipRole.OPS]: 'Operations',
    };
    return labels[role];
  }

  /**
   * Determine if role switching UI should be shown
   */
  shouldShowRoleSwitcher(memberships: MembershipEntity[]): boolean {
    // Show role switcher if user has more than one membership
    return memberships.length > 1;
  }

  /**
   * Get the primary role for dashboard (highest priority)
   */
  getPrimaryRole(memberships: MembershipEntity[]): MembershipRole {
    if (memberships.length === 0) {
      throw new Error('No memberships found');
    }

    // Sort by role priority
    const sorted = [...memberships].sort((a, b) => {
      const priorityA = this.getRolePriority(a.role);
      const priorityB = this.getRolePriority(b.role);
      return priorityB - priorityA;
    });

    return sorted[0].role;
  }

  /**
   * Get priority for a role
   */
  private getRolePriority(role: MembershipRole): number {
    const config = DASHBOARD_MERGE_CONFIGS[role];
    return config?.priority ?? 0;
  }
}
