/**
 * @zanafleet/contracts
 *
 * Shared DTOs, event interfaces, and type definitions for the ZanaFleet platform.
 * All cross-module contracts should be defined here to ensure consistency.
 */

// ============================================================================
// Event Bus Contracts
// ============================================================================

export interface BaseEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly eventVersion: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly aggregateType: string;
  readonly correlationId?: string;
  readonly causationId?: string;
}

export interface SerializedEvent {
  eventId: string;
  eventType: string;
  eventVersion: string;
  occurredAt: string;
  aggregateId: string;
  aggregateType: string;
  correlationId?: string;
  causationId?: string;
  payload: Record<string, unknown>;
}

// ============================================================================
// Auth Contracts
// ============================================================================

export interface JwtPayload {
  sub: string;
  email: string;
  workspaceId: string;
  roles: string[];
  iss?: string;
  iat?: number;
  exp?: number;
}

export interface ValidatedUser {
  actorId: string;
  email: string;
  workspaceId: string;
  roles: string[];
}

// ============================================================================
// Enums (Shared across modules)
// ============================================================================

export enum ActorType {
  Rider = 'Rider',
  Driver = 'Driver',
  Admin = 'Admin',
  Support = 'Support',
  HUMAN = 'HUMAN',
  SaccoAdmin = 'SaccoAdmin',
  Business = 'Business',
  BusinessOwner = 'BusinessOwner',
  Internal = 'Internal',
  AIService = 'AIService',
}

export enum RoleScope {
  Global = 'Global',
  Organization = 'Organization',
  Workspace = 'Workspace',
}

export enum WorkspaceType {
  Operations = 'Operations',
  Support = 'Support',
  Admin = 'Admin',
}

export enum WorkspaceStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Suspended = 'SUSPENDED',
}

export enum OwnerType {
  Actor = 'Actor',
  Organization = 'Organization',
}

export enum WalletType {
  Primary = 'Primary',
  Escrow = 'Escrow',
  Rewards = 'Rewards',
}

export enum SignUpSessionStatus {
  Partial = 'PARTIAL',
  PendingVerification = 'PENDING_VERIFICATION',
  Completed = 'COMPLETED',
  Expired = 'EXPIRED',
}

export enum VehicleType {
  Bike = 'Bike',
  Car = 'Car',
  TukTuk = 'TukTuk',
  Pickup = 'Pickup',
  Lorry = 'Lorry',
  Van = 'Van',
}

export enum BusinessType {
  Retail = 'Retail',
  Restaurant = 'Restaurant',
  Logistics = 'Logistics',
  Wholesale = 'Wholesale',
  Services = 'Services',
  Other = 'Other',
}

// ============================================================================
// Placeholder DTOs (to be expanded as modules migrate)
// ============================================================================

export interface CreateActorInput {
  type: ActorType;
  email: string;
  username: string;
  password: string;
  location?: string | null;
  roles: string[];
  workspaceId: string;
  linkedWallets?: string[];
}

export interface SignUpSessionResponse {
  sessionId: string;
  status: SignUpSessionStatus;
  actorType: ActorType;
  workspaceIds: string[];
  roles: string[];
  linkedWallets: string[];
  completedSteps: string[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Location Contracts
// ============================================================================

export interface LocationData {
  latitude: number;
  longitude: number;
  humanReadableName: string;
  administrativeArea: string;
  country: string;
}

// ============================================================================
// Rider Telemetry Contracts
// ============================================================================

/**
 * Raw telemetry data from rider mobile devices.
 * Used for ingesting real-time location updates.
 */
export interface RiderTelemetryData {
  riderId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: Date;
}

/**
 * Event published when a rider's location is updated.
 * Event type follows naming convention: Location.RiderLocation.UpdatedV1
 */
export interface RiderLocationUpdatedEventV1 extends BaseEvent {
  readonly aggregateType: 'RiderLocation';
  readonly payload: {
    riderId: string;
    latitude: number;
    longitude: number;
    h3IndexFine: string;
    h3IndexMedium: string;
    h3IndexCoarse: string;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
    timestamp: Date;
  };
}

export interface CreateLocationInput {
  latitude?: number;
  longitude?: number;
  humanReadableName: string;
  administrativeArea: string;
  country?: string;
}

// ============================================================================
// Sacco Contracts
// ============================================================================

export interface CreateSaccoInput {
  name: string;
  location: LocationData;
  contactPhone: string;
}

export interface SaccoResponse {
  saccoId: string;
  name: string;
  location: LocationData;
  contactPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Rider Contracts
// ============================================================================

export interface CreateRiderInput {
  fullName: string;
  nationalId: string;
  phone: string;  // Primary identity
  location: LocationData | undefined;
  vehicleType: VehicleType;
  saccoId?: string | null;  // Optional
  email?: string | null;    // Optional
}

export interface RiderResponse {
  riderId: string;
  fullName: string;
  nationalId: string;
  phone: string;
  location: LocationData;
  vehicleType: VehicleType;
  saccoId: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Business Contracts
// ============================================================================

export interface CreateBusinessInput {
  businessName: string;
  phone: string;  // Primary identity
  location: LocationData;
  businessType: BusinessType;
  email?: string | null;  // Optional
}

export interface BusinessResponse {
  businessId: string;
  businessName: string;
  phone: string;
  location: LocationData;
  businessType: BusinessType;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

 // ============================================================================
 // Delivery Contracts
 // ============================================================================
 
 export enum DeliveryStatus {
   Requested = 'Requested',
   Assigned = 'Assigned',
   PickedUp = 'PickedUp',
   InTransit = 'InTransit',
   Delivered = 'Delivered',
   Cancelled = 'Cancelled',
 }
 
 export interface DeliveryResponse {
   deliveryId: string;
   businessId: string;
   pickupLocationId: string;
   dropoffLocationId: string;
   assignedRiderId: string | null;
   status: DeliveryStatus;
   // Scheduling (optional)
   scheduledPickupTime?: Date | null;
   scheduledDropoffTime?: Date | null;
   isScheduled?: boolean;
   createdAt: Date;
   updatedAt: Date;
 }
 
 // ============================================================================
 // Test Account Definitions (Dev/Test Only)
 // ============================================================================

/**
 * ============================================================================
 * Order Contracts
 * ============================================================================
 */

export enum OrderStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  Fulfilled = 'Fulfilled',
  Cancelled = 'Cancelled',
}

export interface CreateOrderInput {
  businessId: string;
  itemSummary?: string;
  itemMetadata?: Record<string, unknown>;
  customerName?: string;
  customerPhone?: string;
  scheduledTime?: Date;
}

export interface OrderResponse {
  orderId: string;
  businessId: string;
  deliveryId: string | null;
  itemSummary: string | null;
  itemMetadata?: Record<string, unknown> | null;
  customerName: string | null;
  customerPhone: string | null;
  scheduledTime: Date | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Media Contracts
// ============================================================================

export enum MediaType {
  Image = 'Image',
  Video = 'Video',
  Document = 'Document',
  Audio = 'Audio',
}

export enum MediaAssetStatus {
  Pending = 'Pending',
  Uploading = 'Uploading',
  Active = 'Active',
  Archived = 'Archived',
  Deleted = 'Deleted',
}

export enum OwnerEntityType {
  Rider = 'Rider',
  Business = 'Business',
  Delivery = 'Delivery',
  Sacco = 'Sacco',
  Order = 'Order',
}

export interface MediaAssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  contentType?: string;
  originalFilename?: string;
}

export interface CreateMediaAssetInput {
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  ownerId: string;
  ownerType: OwnerEntityType;
  metadata?: MediaAssetMetadata;
}

export interface MediaAssetResponse {
  mediaAssetId: string;
  filename: string;
  mimeType: string;
  size: number;
  checksum: string;
  ownerId: string;
  ownerType: OwnerEntityType;
  status: MediaAssetStatus;
  storageKey: string;
  metadata: MediaAssetMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SignedUrlResponse {
  url: string;
  expiresAt: Date;
  method: 'GET' | 'PUT';
}

// ============================================================================
// Media Multipart Upload Contracts
// ============================================================================

export interface InitiateMultipartUploadInput {
  filename: string;
  mimeType: string;
  ownerId: string;
  ownerType: OwnerEntityType;
}

export interface InitiateMultipartUploadResponse {
  uploadId: string;
  mediaAssetId: string;
  partSize: number;
}

export interface UploadPartInput {
  uploadId: string;
  partNumber: number;
  body: Buffer | Uint8Array;
}

export interface UploadPartResponse {
  etag: string;
  partNumber: number;
}

export interface CompleteMultipartUploadInput {
  uploadId: string;
  parts: Array<{ partNumber: number; etag: string }>;
}

export interface AbortMultipartUploadInput {
  uploadId: string;
}

// ============================================================================
// Media Lifecycle Contracts
// ============================================================================

export interface ArchiveMediaAssetInput {
  mediaAssetId: string;
  reason?: string;
}

export interface DeleteMediaAssetInput {
  mediaAssetId: string;
  permanent?: boolean;
}

// ============================================================================
// Policy Contracts
// ============================================================================

/**
 * Policy Scope Enum
 * Defines the hierarchical scope levels for policies.
 * More specific scopes (RIDER) override more general scopes (GLOBAL).
 * Hierarchy: GLOBAL < NATIONAL < SACCO < BUSINESS < RIDER
 */
export enum PolicyScope {
  GLOBAL = 'GLOBAL',
  NATIONAL = 'NATIONAL',
  SACCO = 'SACCO',
  BUSINESS = 'BUSINESS',
  RIDER = 'RIDER',
}

/**
 * Policy Effect Enum
 * Defines the possible outcomes when a policy matches.
 */
export enum PolicyEffect {
  ALLOW = 'ALLOW',
  BLOCK = 'BLOCK',
  MODIFY = 'MODIFY',
  REQUIRE_APPROVAL = 'REQUIRE_APPROVAL',
}

/**
 * Policy Status Enum
 * Defines the lifecycle states of a policy.
 */
export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Policy Trigger Enum
 * Defines the events that can trigger policy evaluation.
 */
export enum PolicyTrigger {
  DELIVERY_CREATION = 'DELIVERY_CREATION',
  RIDER_ASSIGNMENT = 'RIDER_ASSIGNMENT',
  STATUS_TRANSITION = 'STATUS_TRANSITION',
  SLA_CHECK = 'SLA_CHECK',
}

/**
 * PolicyDecision Interface
 * Represents the outcome of a single policy evaluation.
 */
export interface PolicyDecision {
  /** The effect to apply */
  effect: PolicyEffect;
  /** ID of the policy that produced this decision */
  policyId: string;
  /** Human-readable name of the policy */
  policyName: string;
  /** Explanation of why this decision was made */
  reason: string;
  /** Field modifications to apply (when effect is MODIFY) */
  modifications?: Record<string, unknown>;
  /** Actor IDs required to approve (when effect is REQUIRE_APPROVAL) */
  requiresApprovalFrom?: string[];
}

/**
 * PolicyCondition Interface
 * Represents a JSON Logic-style condition for policy evaluation.
 */
export interface PolicyCondition {
  /** The field path to evaluate (e.g., 'delivery.status', 'rider.vehicleType') */
  field: string;
  /** The comparison operator (e.g., 'eq', 'ne', 'gt', 'lt', 'in', 'contains') */
  operator: string;
  /** The value to compare against */
  value: unknown;
  /** Logical operator for combining with sibling conditions */
  logic?: 'AND' | 'OR';
  /** Nested conditions for complex expressions */
  children?: PolicyCondition[];
}

export { TEST_ACCOUNTS, TEST_PASSWORD, TEST_WORKSPACE_ID } from './test-accounts';
export type { TestAccount } from './test-accounts';
