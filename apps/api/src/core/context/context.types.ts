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
  | 'job_event'
  | 'assignment'
  | 'notification'
  | 'user_action'
  | 'active_job'
  | 'route_access';

/**
 * Context source priority for conflict resolution
 */
export const CONTEXT_SOURCE_PRIORITY: Record<ContextSource, number> = {
  active_job: 100, // Highest - from current job
  job_event: 90, // From job event
  assignment: 80, // From assignment
  notification: 70, // From notification deep link
  user_action: 60, // From explicit user action
  route_access: 50, // Lowest - from route
};

/**
 * Delivery status enum (inline to avoid import issues in some contexts)
 */
export const DeliveryStatus = {
  Requested: 'Requested',
  Assigned: 'Assigned',
  PickedUp: 'PickedUp',
  InTransit: 'InTransit',
  Delivered: 'Delivered',
  Cancelled: 'Cancelled',
} as const;

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
  resourceId?: string;
  resourceType?: string;
}

// ============================================================================
// UNIFIED PROFILE MODEL - NEW TYPES
// ============================================================================

/**
 * Unified Actor Profile - aggregates all roles across workspaces
 */
export interface UnifiedActorProfile {
  actorId: string;
  primaryEmail: string;

  // All workspace memberships aggregated
  workspaceMemberships: WorkspaceRoleBinding[];

  // Computed: Active context for quick lookups
  activeContexts: ActiveContext[];

  // Computed: Role precedence for conflict resolution
  rolePrecedence: RolePrecedenceConfig;

  // Preference: Default role per action type
  rolePreferences: RolePreferenceMap;
}

/**
 * Workspace role binding - links actor to workspace with role
 */
export interface WorkspaceRoleBinding {
  workspaceId: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
  role: MembershipRole;
  isDefault: boolean;
  joinedAt: Date;
  permissions: string[];
}

/**
 * Workspace types
 */
export enum WorkspaceType {
  SACCO = 'SACCO',
  BUSINESS = 'BUSINESS',
  MARKET = 'MARKET',
  OPS = 'OPS',
}

/**
 * Active context - temporary context from job/notification/etc
 */
export interface ActiveContext {
  contextType: 'job' | 'route' | 'notification' | 'websocket';
  contextId: string;
  workspaceId: string;
  role: MembershipRole;
  expiresAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Role preference map for action-based defaults
 */
export interface RolePreferenceMap {
  [actionType: string]: RolePreference;
}

/**
 * Role preference configuration
 */
export interface RolePreference {
  preferredRole: MembershipRole;
  preferredWorkspaceId?: string;
  fallbackRole: MembershipRole;
}

/**
 * Role precedence configuration
 */
export interface RolePrecedenceConfig {
  precedence: Record<MembershipRole, number>;
  defaultRole: MembershipRole;
}

// ============================================================================
// RESOLUTION TYPES
// ============================================================================

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
  source: ContextSource;
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
 * Resolved context from various sources
 */
export interface ResolvedContext {
  workspaceId: string;
  role: MembershipRole;
  source: ContextSource;
  contextId?: string;
  reasoning: string;
}

// ============================================================================
// GUARDRAIL TYPES
// ============================================================================

/**
 * Guardrail result
 */
export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

/**
 * Boundary check result
 */
export interface BoundaryCheckResult extends GuardrailResult {}

/**
 * Contamination check result
 */
export interface ContaminationResult extends GuardrailResult {}

/**
 * Role projection request
 */
export interface RoleProjectionRequest {
  actorId: string;
  context?: {
    jobId?: string;
    notificationId?: string;
    route?: string;
    action?: string;
    resourceId?: string;
  };
  explicitWorkspaceId?: string;
  explicitRole?: MembershipRole;
}

// ============================================================================
// CONFLICT RESOLUTION TYPES
// ============================================================================

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  selectedRole: MembershipRole;
  selectedWorkspaceId: string;
  reasoning: string;
}

/**
 * Stale context handling
 */
export interface StaleContextResult {
  isValid: boolean;
  refreshedContext?: ActiveContext;
  error?: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

/**
 * Dashboard merge configuration
 */
export interface DashboardMergeConfig {
  role: MembershipRole;
  priority: number;
  dataSources: DashboardDataSource[];
  layout: 'tabs' | 'sidebar' | 'unified';
}

/**
 * Dashboard data source
 */
export interface DashboardDataSource {
  type: string;
  workspaceScope: 'current' | 'all_rider_workspaces' | 'all_business_workspaces';
}

/**
 * Dashboard response
 */
export interface DashboardResponse {
  role: MembershipRole;
  workspaceId: string;
  layout: 'tabs' | 'sidebar' | 'unified';
  data: Record<string, unknown>;
  availableWorkspaces: WorkspaceMembershipInfo[];
}

// ============================================================================
// EXISTING TYPES (preserved)
// ============================================================================

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
  distanceRadiusMeters?: number;
  jobTypes?: JobType[];
}

/**
 * Job feed response
 */
export interface JobFeedResponse {
  jobs: JobFeedItem[];
  total: number;
  hasMore: boolean;
  workspaces: WorkspaceJobCount[];
}

export interface WorkspaceJobCount {
  workspaceId: string;
  workspaceName: string;
  jobCount: number;
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
  ratingWeight: number;
}

export interface ScoringConfig {
  weights: JobScoreFactors;
  factors: {
    maxDistanceMeters: number;
    maxEarningsDiff: number;
    slaWindowMinutes: number;
  };
}

export const DEFAULT_JOB_SCORE_FACTORS: JobScoreFactors = {
  distanceWeight: -0.3, // Negative = closer is better
  earningsWeight: 0.25,
  slaUrgencyWeight: 0.2,
  acceptanceProbabilityWeight: 0.15,
  preferenceMatchWeight: 0.1,
  ratingWeight: 0.1,
};

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: DEFAULT_JOB_SCORE_FACTORS,
  factors: {
    maxDistanceMeters: 10000,
    maxEarningsDiff: 500,
    slaWindowMinutes: 120,
  },
};

/**
 * Conflict detection result
 */
export interface ConflictCheck {
  hasConflict: boolean;
  conflicts: JobConflict[];
  lockedJobIds: string[];
}

/**
 * Job conflict details
 */
export interface JobConflict {
  type: ConflictType;
  existingJobId: string;
  proposedJobId: string;
  severity: 'blocking' | 'warning';
  message: string;
  resolution?: ConflictResolution;
}

export enum ConflictType {
  DOUBLE_BOOKING = 'double_booking',
  SLA_VIOLATION = 'sla_violation',
  POLICY_VIOLATION = 'policy_violation',
  ZONE_RESTRICTION = 'zone_restriction',
  CAPABILITY_MISMATCH = 'capability_mismatch',
}

export interface ConflictResolution {
  action: 'block' | 'warn' | 'auto_resolve';
  suggestedAlternative?: string;
}

/**
 * Time window for conflict detection
 */
export interface TimeWindow {
  start: Date;
  end: Date;
  bufferMinutes: number;
}

/**
 * Authorization types
 */
export interface AuthorizationRequest {
  actorId: string;
  action: string;
  resource: string;
  resourceId?: string;
  workspaceId: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: AuthorizationRejectionReason;
  role?: MembershipRole;
}

export type AuthorizationRejectionReason =
  | 'ACTOR_NOT_IN_WORKSPACE'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'RESOURCE_ACCESS_DENIED'
  | 'CROSS_WORKSPACE_ESCALATION_BLOCKED';

/**
 * Role permissions mapping - enhanced with CUSTOMER
 */
export const ROLE_PERMISSIONS: Record<MembershipRole, string[]> = {
  [MembershipRole.RIDER]: [
    'job:view_own',
    'job:accept',
    'job:complete',
    'job:view_available',
    'earnings:view_own',
    'earnings:view_by_workspace',
    'profile:view_own',
    'profile:update_own',
    'notification:view_own',
  ],
  [MembershipRole.CUSTOMER]: [
    'order:view_own',
    'order:create',
    'order:cancel',
    'address:view_own',
    'address:manage',
    'payment:view_own',
    'profile:view_own',
    'profile:update_own',
  ],
  [MembershipRole.ADMIN]: [
    'workspace:view',
    'workspace:manage',
    'member:view',
    'member:invite',
    'member:remove',
    'role:assign',
    'policy:view',
    'policy:manage',
    'job:view_all',
    'job:assign',
    'job:reassign',
    'analytics:view_workspace',
  ],
  [MembershipRole.OPS]: [
    'job:view_all',
    'job:assign',
    'job:reassign',
    'rider:view_all',
    'rider:manage_status',
    'analytics:view_all',
  ],
  [MembershipRole.BUSINESS_OWNER]: [
    'workspace:view',
    'job:view_all',
    'job:create',
    'job:assign',
    'job:cancel',
    'earnings:view_workspace',
    'analytics:view_workspace',
    'rider:view_workspace',
    'shop:manage',
  ],
};

/**
 * Role precedence - higher number = higher priority
 */
export const ROLE_PRECEDENCE: Record<MembershipRole, number> = {
  [MembershipRole.ADMIN]: 100,
  [MembershipRole.OPS]: 80,
  [MembershipRole.BUSINESS_OWNER]: 60,
  [MembershipRole.RIDER]: 40,
  [MembershipRole.CUSTOMER]: 20,
};

/**
 * Route role mapping
 */
export interface RouteRoleMapping {
  pattern: RegExp;
  role: MembershipRole;
  workspaceSource:
    | 'active_job_or_default'
    | 'job_id'
    | 'order_id'
    | 'shop_id'
    | 'route_param'
    | 'default';
  workspaceParamName?: string;
}

/**
 * Active job status values (for querying) - using inline DeliveryStatus
 */
export const ACTIVE_JOB_STATUSES = [
  DeliveryStatus.Assigned,
  DeliveryStatus.PickedUp,
  DeliveryStatus.InTransit,
] as const;

/**
 * Feed request job status - using inline DeliveryStatus
 */
export const FEED_JOB_STATUSES = [DeliveryStatus.Requested, DeliveryStatus.Assigned] as const;

/**
 * Notification context types
 */
export interface NotificationContext {
  notificationId: string;
  workspaceId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  deepLink: string;
}

export interface NotificationDelivery {
  delivery: 'immediate' | 'deferred';
  requiresContextSwitch: boolean;
  targetWorkspace: string;
  contextSource?: string;
  message?: string;
}

/**
 * Job offer for simultaneous resolution
 */
export interface JobOffer {
  jobId: string;
  job: JobFeedItem;
  offeredAt: Date;
  expiresAt: Date;
}

export interface OfferResolution {
  selectedJob: JobFeedItem;
  rejectedJobs: JobFeedItem[];
  reason: string;
}

/**
 * Actor profile for scoring
 */
export interface ActorProfile {
  actorId: string;
  historicalAcceptanceRate?: number;
  preferences?: ActorPreferences;
  averageRating?: number;
}

export interface ActorPreferences {
  preferredDistanceMeters?: number;
  preferredEarningsMin?: number;
  preferredZones?: string[];
  preferredJobTypes?: JobType[];
}
