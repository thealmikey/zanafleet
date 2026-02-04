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

export * from './test-accounts';
