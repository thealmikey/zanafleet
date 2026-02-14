/**
 * Consent Module Enums
 * 
 * Defines all enum types used in the consent-driven navigation architecture.
 * These enums control the proposal lifecycle, invocation modes, and confirmation actions.
 */

/**
 * CapabilityProposal Status Enum
 * 
 * Lifecycle: proposed → confirmed | rejected | expired → executed (if confirmed)
 */
export enum ProposalStatus {
  PROPOSED = 'proposed',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  EXECUTED = 'executed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * InvocationMode Enum
 * 
 * Defines how a capability should be invoked after user confirmation.
 */
export enum InvocationMode {
  CONVERSATIONAL = 'conversational',
  INLINE_PREVIEW = 'inline_preview',
  PAGE_REDIRECT = 'page_redirect',
  BACKGROUND_ACTION = 'background_action',
}

/**
 * ConfirmationAction Enum
 * 
 * All possible user responses to a capability proposal.
 */
export enum ConfirmationAction {
  CONFIRM = 'confirm',
  EDIT = 'edit',
  REJECT = 'reject',
  MODIFY = 'modify',
  CANCEL = 'cancel',
  SWITCH_CAPABILITY = 'switch_capability',
  REQUEST_CLARIFICATION = 'request_clarification',
}

/**
 * Action Types for suggested actions in chat responses
 */
export enum ActionType {
  CONFIRM = 'confirm',
  REJECT = 'reject',
  NAVIGATE = 'navigate',
  SEARCH = 'search',
  EDIT = 'edit',
  CANCEL = 'cancel',
  GET_HELP = 'get_help',
}

/**
 * UI Component Types for rich responses
 */
export enum ComponentType {
  CARD = 'card',
  FORM = 'form',
  LIST = 'list',
  MAP = 'map',
  TIMELINE = 'timeline',
  STATS = 'stats',
  BUTTON_GROUP = 'button_group',
}
