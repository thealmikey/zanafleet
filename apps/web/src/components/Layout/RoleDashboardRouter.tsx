import React from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { getDashboardRoute } from '../../utils/roleRouting';

/**
 * RoleDashboardRouter redirects users from /dashboard to their role-specific dashboard.
 * Uses the highest-priority role when a user has multiple roles.
 */
export function RoleDashboardRouter(): React.ReactElement {
  const { user } = useAuth();

  const targetRoute = getDashboardRoute(user?.roles);

  return <Navigate to={targetRoute} replace />;
}
