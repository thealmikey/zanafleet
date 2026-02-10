/**
 * Role-based routing utilities.
 * Determines which dashboard a user should see based on their roles.
 */

export type DashboardRole = 'admin' | 'support' | 'operator' | 'business' | 'rider';

/**
 * Role priority order (highest privilege first).
 * When a user has multiple roles, they are routed to the highest-privilege dashboard.
 */
const ROLE_PRIORITY: readonly DashboardRole[] = [
  'admin',
  'support',
  'operator',
  'business',
  'rider',
] as const;

/**
 * Maps user role strings to dashboard roles.
 * Multiple user roles can map to the same dashboard role.
 */
const ROLE_TO_DASHBOARD: Record<string, DashboardRole> = {
  Admin: 'admin',
  SiteOwner: 'admin',
  Support: 'support',
  SaccoAdmin: 'operator',
  Operator: 'operator',
  BusinessOwner: 'business',
  Business: 'business',
  Rider: 'rider',
  Driver: 'rider',
};

/**
 * Dashboard route paths for each role.
 */
export const DASHBOARD_ROUTES: Record<DashboardRole, string> = {
  admin: '/dashboard/admin',
  support: '/dashboard/support',
  operator: '/dashboard/operator',
  business: '/dashboard/business',
  rider: '/dashboard/rider',
};

/**
 * Given an array of user roles, returns the highest-privilege dashboard role.
 * Returns null if no recognized roles are found.
 */
export function getHighestPriorityRole(roles: string[] | undefined): DashboardRole | null {
  if (!roles || roles.length === 0) {
    return null;
  }

  const dashboardRoles = roles
    .map((role) => ROLE_TO_DASHBOARD[role])
    .filter((dr): dr is DashboardRole => dr !== undefined);

  if (dashboardRoles.length === 0) {
    return null;
  }

  for (const priorityRole of ROLE_PRIORITY) {
    if (dashboardRoles.includes(priorityRole)) {
      return priorityRole;
    }
  }

  return dashboardRoles[0];
}

/**
 * Given user roles, returns the route path for the appropriate dashboard.
 * Returns the default dashboard route if no recognized roles are found.
 */
export function getDashboardRoute(roles: string[] | undefined): string {
  const dashboardRole = getHighestPriorityRole(roles);
  if (!dashboardRole) {
    return '/dashboard/rider';
  }
  return DASHBOARD_ROUTES[dashboardRole];
}
