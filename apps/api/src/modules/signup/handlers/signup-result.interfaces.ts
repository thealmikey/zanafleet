import { ActorType } from '@api/modules/actor/dto/actor.enums';

import { SignUpSessionStatus } from '../dto/signup.enums';

/**
 * Result returned by InitiateSignUpCommandHandler
 */
export interface InitiateSignUpResult {
  sessionId: string;
  expiresAt: Date;
}

/**
 * Result returned by UpdateSignUpStepCommandHandler
 */
export interface UpdateSignUpStepResult {
  sessionId: string;
  status: SignUpSessionStatus;
  completedSteps: string[];
}

/**
 * Result returned by GetSignUpSessionQueryHandler
 * Matches the domain object from SignUpSessionEntity.toDomain()
 */
export interface SignUpSessionResult {
  sessionId: string;
  status: SignUpSessionStatus;
  actorType: ActorType;
  workspaceIds: string[];
  roles: string[];
  linkedWallets: string[];
  idempotencyKey?: string | null;
  completedSteps: string[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
