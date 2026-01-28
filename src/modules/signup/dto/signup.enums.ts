/**
 * SignUp Session Status Enum
 * Represents the current stage of the multi-step sign-up process
 */
export enum SignUpSessionStatus {
  INITIATED = 'INITIATED',
  PARTIAL = 'PARTIAL',
  PENDING_FINALIZATION = 'PENDING_FINALIZATION',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}
