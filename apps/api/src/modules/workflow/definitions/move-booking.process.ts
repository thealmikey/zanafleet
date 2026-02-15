import {
  ProcessDefinitionEntity,
  ProcessState,
} from '../entities/process-definition.entity';
import {
  ProcessTransitionEntity,
  TransitionTriggerType,
  GuardType,
} from '../entities/process-transition.entity';

/**
 * MoveBookingProcess Definition
 *
 * Example process definition for booking a move with driver and vehicle.
 *
 * States:
 * ESTIMATE_REQUESTED → OPTIONS_PRESENTED → BOOKING_CONFIRMED → PAYMENT_AUTHORIZED
 * → DRIVER_ASSIGNED → IN_PROGRESS → COMPLETED
 *
 * Terminal States: COMPLETED, CANCELLED, FAILED
 */
export const MOVE_BOOKING_PROCESS_DEFINITION: Partial<ProcessDefinitionEntity> = {
  definitionId: 'move-booking-v1',
  name: 'MoveBookingProcess',
  description: 'Process for booking a move with driver and vehicle',
  version: '1.0.0',
  isActive: true,
  initialState: ProcessState.ESTIMATE_REQUESTED,
  terminalStates: [ProcessState.COMPLETED, ProcessState.CANCELLED, ProcessState.FAILED],
  allowedStates: [
    ProcessState.DRAFT,
    ProcessState.ESTIMATE_REQUESTED,
    ProcessState.OPTIONS_PRESENTED,
    ProcessState.BOOKING_CONFIRMED,
    ProcessState.PAYMENT_AUTHORIZED,
    ProcessState.DRIVER_ASSIGNED,
    ProcessState.VEHICLE_ASSIGNED,
    ProcessState.IN_PROGRESS,
    ProcessState.COMPLETED,
    ProcessState.CANCELLED,
    ProcessState.FAILED,
  ],
  metadata: {
    category: 'booking',
    slaMinutes: 480, // 8 hours
    requiresPayment: true,
    requiresDriver: true,
  },
};

/**
 * MoveBookingProcess Transitions
 *
 * The state transitions for the MoveBookingProcess.
 */
export const MOVE_BOOKING_PROCESS_TRANSITIONS: Partial<ProcessTransitionEntity>[] = [
  // Transition 1: Request Estimate (DRAFT -> ESTIMATE_REQUESTED)
  {
    transitionId: 'move-booking-request-estimate',
    definitionId: 'move-booking-v1',
    name: 'RequestEstimate',
    description: 'Request a move estimate from the system',
    sourceState: ProcessState.DRAFT,
    targetState: ProcessState.ESTIMATE_REQUESTED,
    triggerType: TransitionTriggerType.MANUAL,
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 100,
  },

  // Transition 2: Present Options (ESTIMATE_REQUESTED -> OPTIONS_PRESENTED)
  {
    transitionId: 'move-booking-present-options',
    definitionId: 'move-booking-v1',
    name: 'PresentOptions',
    description: 'Present available move options to the customer',
    sourceState: ProcessState.ESTIMATE_REQUESTED,
    targetState: ProcessState.OPTIONS_PRESENTED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'EstimateGeneratedEvent-V1',
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 100,
  },

  // Transition 3: Confirm Booking (OPTIONS_PRESENTED -> BOOKING_CONFIRMED)
  {
    transitionId: 'move-booking-confirm',
    definitionId: 'move-booking-v1',
    name: 'ConfirmBooking',
    description: 'Customer confirms the booking',
    sourceState: ProcessState.OPTIONS_PRESENTED,
    targetState: ProcessState.BOOKING_CONFIRMED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'BookingConfirmedEvent-V1',
    guardConditions: [
      {
        guardType: GuardType.POLICY,
        guardName: 'booking_allowed',
        policyScope: 'move_booking',
        policyAction: 'confirm',
        failMessage: 'Booking is not allowed at this time',
      },
    ],
    actions: [],
    isActive: true,
    priority: 100,
  },

  // Transition 4: Authorize Payment (BOOKING_CONFIRMED -> PAYMENT_AUTHORIZED)
  {
    transitionId: 'move-booking-authorize-payment',
    definitionId: 'move-booking-v1',
    name: 'AuthorizePayment',
    description: 'Authorize payment for the booking',
    sourceState: ProcessState.BOOKING_CONFIRMED,
    targetState: ProcessState.PAYMENT_AUTHORIZED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'PaymentAuthorizedEvent-V1',
    guardConditions: [
      {
        guardType: GuardType.POLICY,
        guardName: 'payment_valid',
        policyScope: 'payment',
        policyAction: 'authorize',
        failMessage: 'Payment authorization failed',
      },
    ],
    actions: [],
    isActive: true,
    priority: 100,
  },

  // Transition 5: Assign Driver (PAYMENT_AUTHORIZED -> DRIVER_ASSIGNED)
  {
    transitionId: 'move-booking-assign-driver',
    definitionId: 'move-booking-v1',
    name: 'AssignDriver',
    description: 'Assign a driver to the booking',
    sourceState: ProcessState.PAYMENT_AUTHORIZED,
    targetState: ProcessState.DRIVER_ASSIGNED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'DriverAssignedEvent-V1',
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 100,
  },

  // Transition 6: Start Move (DRIVER_ASSIGNED -> IN_PROGRESS)
  {
    transitionId: 'move-booking-start',
    definitionId: 'move-booking-v1',
    name: 'StartMove',
    description: 'Driver starts the move',
    sourceState: ProcessState.DRIVER_ASSIGNED,
    targetState: ProcessState.IN_PROGRESS,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'MoveStartedEvent-V1',
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 100,
  },

  // Transition 7: Complete Move (IN_PROGRESS -> COMPLETED)
  {
    transitionId: 'move-booking-complete',
    definitionId: 'move-booking-v1',
    name: 'CompleteMove',
    description: 'Move is completed successfully',
    sourceState: ProcessState.IN_PROGRESS,
    targetState: ProcessState.COMPLETED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'DeliveryCompletedEvent-V1',
    guardConditions: [],
    actions: [
      {
        actionType: 'event',
        actionName: 'move.completed',
        payload: {},
        async: false,
        onFailure: 'continue',
      },
    ],
    isActive: true,
    priority: 100,
  },

  // Transition 8: Cancel Booking (OPTIONS_PRESENTED -> CANCELLED)
  {
    transitionId: 'move-booking-cancel',
    definitionId: 'move-booking-v1',
    name: 'CancelBooking',
    description: 'Cancel the booking',
    sourceState: ProcessState.OPTIONS_PRESENTED,
    targetState: ProcessState.CANCELLED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'BookingCancelledEvent-V1',
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 50,
  },

  // Transition 9: Cancel Booking (BOOKING_CONFIRMED -> CANCELLED)
  {
    transitionId: 'move-booking-cancel-confirmed',
    definitionId: 'move-booking-v1',
    name: 'CancelBookingConfirmed',
    description: 'Cancel a confirmed booking (may have fees)',
    sourceState: ProcessState.BOOKING_CONFIRMED,
    targetState: ProcessState.CANCELLED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'BookingCancelledEvent-V1',
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 50,
  },

  // Transition 10: Fail (Any -> FAILED)
  {
    transitionId: 'move-booking-fail',
    definitionId: 'move-booking-v1',
    name: 'FailBooking',
    description: 'Booking fails due to error',
    sourceState: ProcessState.ESTIMATE_REQUESTED,
    targetState: ProcessState.FAILED,
    triggerType: TransitionTriggerType.EVENT,
    triggerEventType: 'BookingFailedEvent-V1',
    guardConditions: [],
    actions: [],
    isActive: true,
    priority: 10,
  },
];
