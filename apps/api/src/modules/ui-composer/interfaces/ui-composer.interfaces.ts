/**
 * UIComposer Interfaces
 *
 * Defines all types and DTOs for the UIComposer Presentation Engine.
 * Follows the Command → Event → Handler → Projection flow pattern.
 *
 * Architecture Boundaries:
 * - UIComposer must NOT mutate state
 * - UIComposer must NOT execute commands
 * - UIComposer must NOT duplicate business rules
 * - UIComposer must NOT enforce capability (only READ allowed capabilities)
 * - UIComposer must NOT enforce consent (only MARK if required)
 * - UIComposer is purely declarative
 */

// =============================================================================
// Request/Response DTOs
// =============================================================================

/**
 * UIComposeRequest
 *
 * Request to compose a UI response for a specific context.
 */
export interface UIComposeRequest {
  /**
   * The ID of the actor requesting the UI
   */
  actorId: string;

  /**
   * The type of context (e.g., MOVE_BOOKING, DELIVERY, BUSINESS)
   */
  contextType: string;

  /**
   * The ID of the context entity
   */
  contextId: string;

  /**
   * Optional: Additional options for UI composition
   */
  options?: UIComposeOptions;
}

/**
 * UIComposeOptions
 *
 * Optional configuration for UI composition.
 */
export interface UIComposeOptions {
  /**
   * Whether to include preview mode (showing all possible actions)
   */
  previewMode?: boolean;

  /**
   * Locale for i18n
   */
  locale?: string;

  /**
   * Custom component overrides
   */
  componentOverrides?: Record<string, unknown>;
}

/**
 * UIResponse
 *
 * Complete UI response including screen, components, and actions.
 */
export interface UIResponse {
  /**
   * Screen identifier
   */
  screen: string;

  /**
   * Metadata about the screen
   */
  metadata: UIMetadata;

  /**
   * List of UI components to render
   */
  components: UIComponent[];

  /**
   * List of actions available to the user
   */
  actions: UIAction[];
}

/**
 * UIMetadata
 *
 * Metadata about the composed UI screen.
 */
export interface UIMetadata {
  /**
   * Screen title
   */
  title: string;

  /**
   * Optional subtitle
   */
  subtitle?: string;

  /**
   * Optional breadcrumb navigation
   */
  breadcrumbs?: Breadcrumb[];

  /**
   * Additional custom metadata
   */
  [key: string]: unknown;
}

/**
 * Breadcrumb
 *
 * Navigation breadcrumb item.
 */
export interface Breadcrumb {
  /**
   * Label to display
   */
  label: string;

  /**
   * Link URL (optional for current page)
   */
  href?: string;

  /**
   * Whether this is the current page
   */
  isCurrent?: boolean;
}

// =============================================================================
// UI Component Types
// =============================================================================

/**
 * UIComponent
 *
 * Represents a single UI component in the response.
 */
export interface UIComponent {
  /**
   * Component type identifier
   */
  type: string;

  /**
   * Component props/data
   */
  props: Record<string, unknown>;

  /**
   * Optional visibility rule
   */
  visibility?: VisibilityRule;

  /**
   * Optional layout configuration
   */
  layout?: ComponentLayout;
}

/**
 * VisibilityRule
 *
 * Condition for component visibility.
 */
export interface VisibilityRule {
  /**
   * Field to evaluate
   */
  field: string;

  /**
   * Operator for evaluation
   */
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'exists';

  /**
   * Value to compare against
   */
  value: unknown;
}

/**
 * ComponentLayout
 *
 * Layout configuration for a component.
 */
export interface ComponentLayout {
  /**
   * Grid column span (1-12)
   */
  colSpan?: number;

  /**
   * Grid row span
   */
  rowSpan?: number;

  /**
   * Order in the layout
   */
  order?: number;

  /**
   * CSS class names
   */
  className?: string;
}

// =============================================================================
// UI Action Types
// =============================================================================

/**
 * UIAction
 *
 * Represents an action a user can take.
 */
export interface UIAction {
  /**
   * Unique action identifier
   */
  id: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Capability required to perform this action
   */
  capability: string;

  /**
   * Whether consent is required before executing
   */
  requiresConsent?: boolean;

  /**
   * Whether confirmation is required before executing
   */
  requiresConfirmation?: boolean;

  /**
   * Confirmation message to display
   */
  confirmationMessage?: string;

  /**
   * Visual style of the action
   */
  style?: UIActionStyle;

  /**
   * Whether the action is disabled (for actors without capability)
   */
  disabled?: boolean;

  /**
   * Reason why the action is disabled
   */
  disabledReason?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * UIActionStyle
 *
 * Visual style options for UI actions.
 */
export type UIActionStyle = 'primary' | 'secondary' | 'danger' | 'ghost';

// =============================================================================
// Component Registry Types
// =============================================================================

/**
 * ComponentDefinition
 *
 * Definition of a registered UI component.
 */
export interface ComponentDefinition {
  /**
   * Component type identifier
   */
  type: string;

  /**
   * Display name
   */
  displayName: string;

  /**
   * Description
   */
  description?: string;

  /**
   * Default props for the component
   */
  defaultProps?: Record<string, unknown>;

  /**
   * Schema for props validation
   */
  propsSchema?: Record<string, unknown>;

  /**
   * Whether this component requires context data
   */
  requiresContext?: boolean;
}

/**
 * RegisteredComponents
 *
 * Map of component type to definition.
 */
export interface RegisteredComponents {
  [type: string]: ComponentDefinition;
}

// =============================================================================
// State Renderer Types
// =============================================================================

/**
 * StateRenderer
 *
 * Interface for state-specific UI rendering.
 */
export interface StateRenderer {
  /**
   * Get the context type this renderer handles
   */
  readonly contextType: string;

  /**
   * Render UI for the given state
   *
   * @param state - Current process state
   * @param context - Process context data
   * @returns Array of UI components
   */
  renderComponents(state: string, context: Record<string, unknown>): UIComponent[];

  /**
   * Get available actions for the given state
   *
   * @param state - Current process state
   * @param context - Process context data
   * @returns Array of available actions
   */
  renderActions(state: string, context: Record<string, unknown>): UIActionDefinition[];
}

/**
 * UIActionDefinition
 *
 * Definition of an action without capability filtering.
 */
export interface UIActionDefinition {
  /**
   * Unique action identifier
   */
  id: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Capability required to perform this action
   */
  capability: string;

  /**
   * Whether consent is required
   */
  requiresConsent?: boolean;

  /**
   * Whether confirmation is required
   */
  requiresConfirmation?: boolean;

  /**
   * Confirmation message
   */
  confirmationMessage?: string;

  /**
   * Visual style
   */
  style?: UIActionStyle;

  /**
   * States where this action is available (empty = all states)
   */
  availableInStates?: string[];

  /**
   * States where this action is NOT available
   */
  notAvailableInStates?: string[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Screen Configuration Types
// =============================================================================

/**
 * ScreenConfig
 *
 * Configuration for a screen.
 */
export interface ScreenConfig {
  /**
   * Screen identifier
   */
  screen: string;

  /**
   * Screen title
   */
  title: string;

  /**
   * Optional subtitle
   */
  subtitle?: string;

  /**
   * Default breadcrumbs
   */
  breadcrumbs?: Breadcrumb[];
}

/**
 * ContextScreenMapping
 *
 * Maps context types to screen configurations.
 */
export interface ContextScreenMapping {
  [contextType: string]: ScreenConfig;
}

// =============================================================================
// Capability Integration Types
// =============================================================================

/**
 * ActorCapabilities
 *
 * Actor's capabilities with metadata.
 */
export interface ActorCapabilities {
  /**
   * List of capability names the actor has
   */
  capabilities: string[];

  /**
   * Map of capability to metadata (includes requiresConsent)
   */
  capabilityMetadata: Map<string, CapabilityMetadata>;
}

/**
 * CapabilityMetadata
 *
 * Metadata about a capability.
 */
export interface CapabilityMetadata {
  /**
   * Capability name
   */
  name: string;

  /**
   * Whether consent is required to use this capability
   */
  requiresConsent: boolean;

  /**
   * Additional metadata
   */
  [key: string]: unknown;
}

// =============================================================================
// Process Context Types
// =============================================================================

/**
 * ProcessContext
 *
 * Context data for a process instance.
 */
export interface ProcessContext {
  /**
   * Process instance ID
   */
  instanceId: string;

  /**
   * Process definition ID
   */
  definitionId: string;

  /**
   * Current state
   */
  currentState: string;

  /**
   * Process context data
   */
  context: Record<string, unknown>;

  /**
   * Related entities
   */
  relatedEntities?: ProcessRelatedEntity[];

  /**
   * Process status
   */
  status: string;
}

/**
 * ProcessRelatedEntity
 *
 * Related entity in a process context.
 */
export interface ProcessRelatedEntity {
  entityType: string;
  entityId: string;
  role: string;
  linkedAt: Date;
}
