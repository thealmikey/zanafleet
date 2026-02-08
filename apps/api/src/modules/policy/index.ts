/**
 * Policy Module Barrel Export
 *
 * Re-exports the PolicyModule and its public services/types
 * for use by other modules in the application.
 */

// Module
export { PolicyModule } from './policy.module';

// Services
export { PolicyEnforcementAdapter } from './services/policy-enforcement.adapter';
export type {
  FilterCandidatesResult,
  FilterCandidatesContext,
  DeliveryCreationResult,
  DeliveryCreationInput,
  RiderAssignmentResult,
  RiderAssignmentInput,
} from './services/policy-enforcement.adapter';

export {
  PolicyEvaluationEngineService,
} from './services/policy-evaluation-engine.service';
export type { EvaluationOptions } from './services/policy-evaluation-engine.service';

// DTOs & Types
export {
  PolicyScope,
  PolicyEffect,
  PolicyStatus,
  PolicyTrigger,
} from './dto/policy.enums';

export type {
  PolicyCondition,
  EvaluationContext,
  PolicyDecision,
  EvaluatedPolicy,
  EvaluationResult,
} from './dto/policy.types';

export type { EvaluatedPolicyLogEntry } from './entities/policy-decision-log.entity';
