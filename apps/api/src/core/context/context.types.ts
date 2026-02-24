/**
 * Context Resolution Types
 *
 * Core types for multi-workspace context inference and role projection.
 * Enables seamless workspace switching without manual user intervention.
 */

import { MembershipRole } from '@api/modules/workspace/dto/workspace.enums';

/**
 * Source of context resolution request
 */
export type ContextSource =
  | 'job_event' // From job-related event
  | 'assignment' // From job assignment
  | 'notification' // From notification origin
  | 'user_action' // From explicit user action
  | 'active_job' // From currently active job
  | 'route_access'; // From API route access

/**
 * Inferred intent from context
 */
export interface ContextIntent {
  action: 'view' | 'create' | 'accept' | 'complete' | 'cancel' | 'manage';
  resource: 'job' | 'earnings' | 'profile' | 'workspace' | 'notification';
  resourceId?: string;
}

/**
 * Workspace context resolved for an actor
 */
export interface WorkspaceContext {
  actorId: string;
  workspaceId: string;
  workspaceName: string;
  roles: MembershipRole[];
  primaryRole: MembershipRole;
  inferredIntent?: ContextIntent;
  source: ContextSource;
  isMultiWorkspace: boolean;
}

/**
 * Request for context resolution
 */
export interface ContextResolutionRequest {
  actorId: string;
  source: ContextSource;
  // Source-specific data
  jobId?: string;
  jobWorkspaceId?: string;
  notificationId?: string;
  route?: string;
  action?: string;
  explicitWorkspaceId?: string;
}

/**
 * Role projection for an actor across workspaces
 */
export interface RoleProjection {
  actorId: string;
  currentRole: MembershipRole;
  currentWorkspaceId: string;
  currentWorkspaceName: string;
  effectivePermissions: string[];
  allWorkspaces: WorkspaceMembershipInfo[];
  inferredIntent?: ContextIntent;
}

export interface WorkspaceMembershipInfo {
  workspaceId: string;
  workspaceName: string;
  role: MembershipRole;
  isDefault: boolean;
}

/**
 * Context resolution result
 */
export interface ContextResolutionResult {
  success: boolean;
  context?: WorkspaceContext;
  error?: string;
}

/**
 * Job feed item for unified aggregation
 */
export interface JobFeedItem {
  jobId: string;
  jobType: JobType;
  workspaceId: string;
  workspaceName: string;
  status: string;
  score: number;
  earnings: number;
  distanceMeters?: number;
  slaDeadline?: Date;
  scheduledPickup?: Date;
  pickupLocation?: GeoPoint;
  dropoffLocation?: GeoPoint;
  metadata?: Record<string, unknown>;
}

export type JobType = 'delivery' | 'order' | 'move_request' | 'commitment';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Job feed request
 */
export interface JobFeedRequest {
  actorId: string;
  roles: MembershipRole[];
  workspaces?: string[];
  status?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Job feed response
 */
export interface JobFeedResponse {
  jobs: JobFeedItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Job scoring factors
 */
export interface JobScoreFactors {
  distanceWeight: number;
  earningsWeight: number;
  slaUrgencyWeight: number;
  acceptanceProbabilityWeight: number;
  preferenceMatchWeight: number;
}

export const DEFAULT_JOB_SCORE_FACTORS: JobScoreFactors = {
  distanceWeight: -1, // Negative = closer is better
  earningsWeight: 1, // Positive = higher is better
  slaUrgencyWeight: 0.5, // Within SLA = slightly better
  acceptanceProbabilityWeight: 0.3,
  preferenceMatchWeight: 0.2,
};

/**
 * Conflict detection result
 */
export interface ConflictCheck {
  hasConflict: boolean;
  conflicts: JobConflict[];
  lockedJobIds: string[];
}

export interface JobConflict {
  type: 'double_booking' | 'sla_conflict' | 'policy_violation';
  existingJobId: string;
  proposedJobId: string;
  reason: string;
}
