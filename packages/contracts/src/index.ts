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
