/**
 * Actor Type Enum
 * Mirrors backend: src/modules/actor/dto/actor.enums.ts
 */
export enum ActorType {
  Internal = 'Internal',
  Business = 'Business',
  SaccoAdmin = 'SaccoAdmin',
  BusinessOwner = 'BusinessOwner',
  Rider = 'Rider',
  AIService = 'AIService',
}

/**
 * SignUp Session Status Enum
 * Mirrors backend: src/modules/signup/dto/signup.enums.ts
 */
export enum SignUpSessionStatus {
  INITIATED = 'INITIATED',
  PARTIAL = 'PARTIAL',
  PENDING_FINALIZATION = 'PENDING_FINALIZATION',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

/**
 * Workspace reference type for workspace selection
 */
export interface Workspace {
  workspaceId: string;
  name: string;
  type: string;
}

/**
 * Request payload for initiating a new sign-up session
 * Mirrors backend: InitiateSignUpDto
 */
export interface InitiateSignupRequest {
  actorType: ActorType;
  idempotencyKey?: string;
}

/**
 * Response from initiating a sign-up session
 */
export interface InitiateSignupResponse {
  sessionId: string;
  expiresAt: string;
}

/**
 * Request payload for updating a sign-up step
 * Mirrors backend: UpdateSignUpStepDto
 */
export interface UpdateStepRequest {
  stepName?: string;
  idempotencyKey?: string;
  fullName?: string;
  nationalId?: string;
  location?: string;
  saccoName?: string;
  businessName?: string;
}

/**
 * Response from updating a sign-up step
 */
export interface UpdateStepResponse {
  sessionId: string;
  status: SignUpSessionStatus;
  completedSteps: string[];
}

/**
 * Full sign-up session object
 * Mirrors backend: SignUpSessionDto
 */
export interface SignupSession {
  sessionId: string;
  status: SignUpSessionStatus;
  actorType: ActorType;
  completedSteps: string[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  fullName: string | null;
  nationalId: string | null;
  location: string | null;
  saccoName: string | null;
  businessName: string | null;
}

/**
 * Response from finalizing a sign-up session
 */
export interface FinalizeSignupResponse {
  actorId: string;
  workspaceId: string;
}
