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
  workspaceId?: string;
  roles?: string[];
  linkedWallets?: string[];
  idempotencyKey?: string;
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
  workspaceId?: string | null;
  roles: string[];
  linkedWallets: string[];
  completedSteps: string[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response from finalizing a sign-up session
 */
export interface FinalizeSignupResponse {
  actorId: string;
  workspaceId: string;
}
