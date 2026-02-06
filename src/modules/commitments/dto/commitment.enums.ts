/**
 * Commitment Enums
 * Type definitions for commitment-related categorization
 */

/**
 * CommitmentStatus - Current status of a commitment
 */
export enum CommitmentStatus {
  PENDING = 'PENDING',
  FULFILLED = 'FULFILLED',
  BREACHED = 'BREACHED',
  CANCELLED = 'CANCELLED',
}

/**
 * CommitmentType - Type/category of commitment
 */
export enum CommitmentType {
  DELIVERY = 'DELIVERY',
  PAYMENT = 'PAYMENT',
  SERVICE = 'SERVICE',
  AVAILABILITY = 'AVAILABILITY',
}
