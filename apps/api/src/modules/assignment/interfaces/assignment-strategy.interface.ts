/**
 * Assignment Strategy Types
 *
 * Defines the available assignment strategy types for the pluggable assignment engine.
 */

export enum AssignmentStrategyType {
  SINGLE_WORKER = 'single_worker',
  MULTI_WORKER = 'multi_worker',
  FLEET_MATCHING = 'fleet_matching',
  ROUND_ROBIN = 'round_robin',
  GEO_NEAREST = 'geo_nearest',
  MARKETPLACE_BID = 'marketplace_bid',
  MANUAL_OVERRIDE = 'manual_override',
  SCHEDULED = 'scheduled',
}

/**
 * Assignment Worker Role
 *
 * Defines the role of a worker in a multi-worker assignment.
 */
export enum AssignmentWorkerRole {
  PRIMARY = 'primary',
  HELPER = 'helper',
  SUPERVISOR = 'supervisor',
}

/**
 * Assignment Status
 *
 * Represents the current status of an assignment.
 */
export enum AssignmentStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Validation Result
 *
 * Result of validating a worker candidate against assignment criteria.
 */
export interface ValidationResult {
  valid: boolean;
  reasons: string[];
  score?: number;
  warnings?: string[];
}

/**
 * Geo Location
 *
 * Represents a geographic location with latitude and longitude.
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

/**
 * Worker Requirement
 *
 * Defines a worker requirement from JobType configuration.
 */
export interface WorkerRequirement {
  workerType: string;
  minWorkers: number;
  maxWorkers?: number;
  required: boolean;
  qualifications?: Record<string, unknown>;
}

/**
 * Assigned Worker
 *
 * Represents a worker already assigned to a job.
 */
export interface AssignedWorker {
  workerId: string;
  workerType: string;
  role: AssignmentWorkerRole;
  assignedAt: Date;
  status: AssignmentStatus;
}

/**
 * Job Destination
 *
 * Represents a destination for a job.
 */
export interface JobDestination {
  destinationId: string;
  address: string;
  location: GeoLocation;
  sequence: number;
  estimatedArrival?: Date;
}

/**
 * Bidding Configuration
 *
 * Configuration for marketplace bidding assignment.
 */
export interface BiddingConfig {
  biddingWindowMinutes: number;
  minBidders: number;
  visibility: 'all' | 'nearby' | 'preferred';
  minBidAmount?: number;
  maxBidAmount?: number;
}

/**
 * Assignment Constraints
 *
 * Constraints for assignment that must be respected.
 */
export interface AssignmentConstraints {
  maxDistanceKm?: number;
  maxLoadFactor?: number;
  minRating?: number;
  requiredCapabilities?: string[];
  forbiddenWorkerIds?: string[];
  preferredWorkerIds?: string[];
  workerTypes?: string[];
  maxWorkers?: number;
  deadline?: Date;
}

/**
 * Assignment Context
 *
 * The complete context needed for assignment strategies to make decisions.
 */
export interface AssignmentContext {
  // Job information
  jobId: string;
  jobTypeId: string;
  jobTypeName: string;

  // Workspace context
  workspaceId: string;

  // Requirements from JobType
  requiredWorkerTypes: WorkerRequirement[];

  // Current job state
  currentWorkers: AssignedWorker[];
  destinations: JobDestination[];

  // Constraints
  deadline?: Date;
  constraints: AssignmentConstraints;

  // For marketplace bidding
  biddingConfig?: BiddingConfig;

  // For scheduled assignment
  scheduledTime?: Date;

  // Additional metadata
  metadata?: Record<string, unknown>;
}

/**
 * Assignment Result
 *
 * The result of an assignment operation.
 */
export interface AssignmentResult {
  success: boolean;
  assignments: AssignmentAssignment[];
  errors: string[];
  warnings?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Assignment Assignment
 *
 * Represents a single worker assignment.
 */
export interface AssignmentAssignment {
  workerId: string;
  workerType: string;
  role: AssignmentWorkerRole;
  assignedAt: Date;
  assignmentMethod: string;
  status: AssignmentStatus;
}

/**
 * Worker Candidate
 *
 * Represents a potential worker that can be assigned to a job.
 */
export interface WorkerCandidate {
  workerId: string;
  workerType: string;
  actorId: string;
  actorEmail: string;
  actorUsername: string;
  location?: GeoLocation;
  currentLoad: number;
  maxCapacity: number;
  qualifications: Record<string, unknown>[];
  rating: number;
  availabilityStatus: AvailabilityStatus;
  workspaceId: string;
  capabilities?: string[];
}

/**
 * Availability Status
 *
 * Represents the availability status of a worker.
 */
export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
  ON_DUTY = 'on_duty',
  ON_LEAVE = 'on_leave',
}

/**
 * Assignment Strategy Interface
 *
 * Defines the contract for all assignment strategies.
 * Each strategy implements a specific algorithm for assigning workers to jobs.
 */
export interface AssignmentStrategy {
  readonly type: AssignmentStrategyType;
  readonly name: string;

  /**
   * Check if this strategy can handle the given context.
   * Used for automatic strategy selection.
   */
  canHandle(context: AssignmentContext): Promise<boolean>;

  /**
   * Execute the assignment strategy.
   * Returns the assignment result with selected workers.
   */
  assign(context: AssignmentContext, candidates: WorkerCandidate[]): Promise<AssignmentResult>;

  /**
   * Validate a candidate against assignment criteria.
   * Used for filtering and scoring candidates.
   */
  validateCandidate(
    candidate: WorkerCandidate,
    context: AssignmentContext
  ): Promise<ValidationResult>;

  /**
   * Get the priority of this strategy for auto-selection.
   * Higher priority strategies are preferred when multiple strategies can handle a context.
   */
  getPriority(context: AssignmentContext): number;
}
