/**
 * Process State Enum
 *
 * Defines all possible states for process instances.
 * States are process-agnostic - specific processes use subsets.
 */
export enum ProcessState {
  // Initial states
  DRAFT = 'draft',
  ESTIMATE_REQUESTED = 'estimate_requested',
  OPTIONS_PRESENTED = 'options_presented',

  // Confirmation states
  BOOKING_CONFIRMED = 'booking_confirmed',
  PAYMENT_AUTHORIZED = 'payment_authorized',

  // Assignment states
  DRIVER_ASSIGNED = 'driver_assigned',
  VEHICLE_ASSIGNED = 'vehicle_assigned',

  // Active states
  IN_PROGRESS = 'in_progress',
  ARRIVED = 'arrived',
  LOADING = 'loading',
  UNLOADING = 'unloading',

  // Terminal states
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}
