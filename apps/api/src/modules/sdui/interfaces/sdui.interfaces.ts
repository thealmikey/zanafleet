/**
 * SDUI (Server-Driven UI) Interfaces
 *
 * Type definitions for screen-based server-driven UI.
 * Extends the existing UIComposer module with full-page screen support.
 *
 * Architecture:
 * - Screens are defined as JSON schemas delivered from the server
 * - Client renders based on schema without business logic
 * - Actions are executed via API calls to the server
 * - State is managed server-side with client-side caching
 */

// =============================================================================
// Screen Schema Types
// =============================================================================

/**
 * UISchema
 *
 * Complete UI schema for a screen/page.
 * This is the main schema structure delivered to clients.
 */
export interface UISchema {
  /**
   * Schema version for versioning and migrations
   */
  version: string;

  /**
   * Unique screen identifier (e.g., 'login', 'dashboard.admin', 'profile.edit')
   */
  screenId: string;

  /**
   * Screen metadata
   */
  metadata: ScreenMetadata;

  /**
   * Data sources for fetching dynamic data
   */
  data?: DataSource[];

  /**
   * Layout definition for the screen
   */
  layout: LayoutNode;

  /**
   * Actions available on this screen
   */
  actions: ActionDefinition[];

  /**
   * Validation rules for forms
   */
  validations?: ValidationRule[];

  /**
   * Conditional rendering rules
   */
  conditions?: ConditionRule[];

  /**
   * Theme/style overrides
   */
  theme?: ThemeConfig;
}

/**
 * ScreenMetadata
 *
 * Metadata about the screen.
 */
export interface ScreenMetadata {
  /**
   * Display title
   */
  title: string;

  /**
   * Optional description/subtitle
   */
  description?: string;

  /**
   * Screen type for routing
   */
  type: ScreenType;

  /**
   * Authentication requirement
   */
  auth: AuthRequirement;

  /**
   * Roles that can access this screen (empty = all authenticated)
   */
  allowedRoles?: string[];

  /**
   * Cache duration in seconds (0 = no cache)
   */
  cacheDuration?: number;

  /**
   * Whether screen supports offline mode
   */
  offlineCapable?: boolean;
}

/**
 * ScreenType
 *
 * Classification of screen types.
 */
export type ScreenType =
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'form'
  | 'detail'
  | 'list'
  | 'wizard'
  | 'settings'
  | 'error';

/**
 * AuthRequirement
 *
 * Authentication requirement for a screen.
 */
export type AuthRequirement = 'required' | 'optional' | 'none';

// =============================================================================
// Data Source Types
// =============================================================================

/**
 * DataSource
 *
 * Definition of data to fetch for the screen.
 */
export interface DataSource {
  /**
   * Unique identifier for this data source
   */
  id: string;

  /**
   * Data source type
   */
  type: DataSourceType;

  /**
   * Endpoint or query path
   */
  endpoint: string;

  /**
   * HTTP method (for REST sources)
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';

  /**
   * Query parameters
   */
  params?: Record<string, unknown>;

  /**
   * Static data (for static sources)
   */
  staticData?: unknown;

  /**
   * Transform function name
   */
  transform?: string;

  /**
   * Whether to cache this data
   */
  cacheable?: boolean;

  /**
   * Cache duration in seconds
   */
  cacheDuration?: number;

  /**
   * Dependencies on other data sources
   */
  dependsOn?: string[];

  /**
   * Error handling configuration
   */
  errorConfig?: DataSourceErrorConfig;
}

/**
 * DataSourceType
 *
 * Types of data sources supported.
 */
export type DataSourceType = 'rest' | 'graphql' | 'static' | 'derived';

/**
 * DataSourceErrorConfig
 *
 * Error handling configuration for data sources.
 */
export interface DataSourceErrorConfig {
  /**
   * Error message to display
   */
  message?: string;

  /**
   * Fallback data to use on error
   */
  fallbackData?: unknown;

  /**
   * Whether to show error to user
   */
  showError?: boolean;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;
}

/**
 * RetryConfig
 *
 * Configuration for retrying failed requests.
 */
export interface RetryConfig {
  /**
   * Maximum number of retries
   */
  maxRetries: number;

  /**
   * Delay between retries in milliseconds
   */
  delayMs: number;

  /**
   * Whether to use exponential backoff
   */
  exponentialBackoff?: boolean;
}

// =============================================================================
// Layout Types
// =============================================================================

/**
 * LayoutNode
 *
 * Root layout container.
 */
export interface LayoutNode {
  /**
   * Layout type
   */
  type: LayoutType;

  /**
   * Child nodes
   */
  children?: LayoutNode[];

  /**
   * Direct components (inline)
   */
  components?: ComponentRef[];

  /**
   * Layout-specific properties
   */
  props?: Record<string, unknown>;
}

/**
 * LayoutType
 *
 * Supported layout container types.
 */
export type LayoutType =
  | 'root'
  | 'stack'
  | 'grid'
  | 'flex'
  | 'tabs'
  | 'drawer'
  | 'modal'
  | 'split-view';

/**
 * ComponentRef
 *
 * Reference to a component with its configuration.
 */
export interface ComponentRef {
  /**
   * Component type identifier
   */
  component: string;

  /**
   * Unique instance ID
   */
  id?: string;

  /**
   * Bindings for dynamic data
   */
  bindings?: Record<string, DataBinding>;

  /**
   * Static props
   */
  props?: Record<string, unknown>;

  /**
   * Visibility condition
   */
  when?: DataBinding;

  /**
   * Layout configuration
   */
  layout?: ComponentLayoutConfig;
}

/**
 * DataBinding
 *
 * Binding to a data source field.
 */
export interface DataBinding {
  /**
   * Data source ID
   */
  source: string;

  /**
   * Path to the data (dot notation)
   */
  path: string;

  /**
   * Optional default value
   */
  defaultValue?: unknown;

  /**
   * Transform function
   */
  transform?: DataTransform;
}

/**
 * DataTransform
 *
 * Data transformation functions.
 */
export type DataTransform =
  | { type: 'format'; format: string }
  | { type: 'map'; mapping: Record<string, unknown> }
  | { type: 'filter'; condition: Record<string, unknown> }
  | { type: 'slice'; start?: number; end?: number }
  | { type: 'sort'; by: string; order?: 'asc' | 'desc' }
  | { type: 'custom'; fn: string };

/**
 * ComponentLayoutConfig
 *
 * Layout configuration for a component.
 */
export interface ComponentLayoutConfig {
  /**
   * Grid column span (1-12)
   */
  colSpan?: number;

  /**
   * Grid row span
   */
  rowSpan?: number;

  /**
   * Horizontal alignment
   */
  align?: 'start' | 'center' | 'end' | 'stretch';

  /**
   * Vertical alignment
   */
  valign?: 'top' | 'middle' | 'bottom' | 'stretch';

  /**
   * Spacing
   */
  spacing?: SpacingConfig;

  /**
   * Order in parent
   */
  order?: number;

  /**
   * CSS class name
   */
  className?: string;

  /**
   * Styles
   */
  style?: Record<string, string>;
}

/**
 * SpacingConfig
 *
 * Spacing configuration.
 */
export interface SpacingConfig {
  /**
   * All sides
   */
  all?: number;

  /**
   * Top
   */
  top?: number;

  /**
   * Right
   */
  right?: number;

  /**
   * Bottom
   */
  bottom?: number;

  /**
   * Left
   */
  left?: number;

  /**
   * Horizontal (left + right)
   */
  x?: number;

  /**
   * Vertical (top + bottom)
   */
  y?: number;
}

// =============================================================================
// Action Types
// =============================================================================

/**
 * ActionDefinition
 *
 * Definition of an action a user can perform.
 */
export interface ActionDefinition {
  /**
   * Unique action identifier
   */
  id: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Action type
   */
  type: ActionType;

  /**
   * Endpoint to call
   */
  endpoint?: string;

  /**
   * HTTP method
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /**
   * Payload template
   */
  payload?: Record<string, unknown>;

  /**
   * Navigation target (for navigation actions)
   */
  navigateTo?: string;

  /**
   * Required capability
   */
  capability?: string;

  /**
   * Confirmation required
   */
  requiresConfirmation?: boolean;

  /**
   * Confirmation message
   */
  confirmationMessage?: string;

  /**
   * Loading state label
   */
  loadingLabel?: string;

  /**
   * Success behavior
   */
  onSuccess?: ActionBehavior;

  /**
   * Error behavior
   */
  onError?: ActionBehavior;

  /**
   * Visibility condition
   */
  visibility?: ConditionRule;
}

/**
 * ActionType
 *
 * Types of actions supported.
 */
export type ActionType =
  | 'submit'      // Form submission
  | 'navigate'   // Navigation
  | 'api'        // API call
  | 'mutation'   // State mutation
  | 'download'   // File download
  | 'external';  // External link

/**
 * ActionBehavior
 *
 * Behavior after action execution.
 */
export interface ActionBehavior {
  /**
   * Behavior type
   */
  type: 'navigate' | 'refresh' | 'close' | 'callback' | 'toast';

  /**
   * Target for navigate
   */
  target?: string;

  /**
   * Toast message
   */
  message?: string;

  /**
   * Toast type
   */
  toastType?: 'success' | 'error' | 'warning' | 'info';
}

// =============================================================================
// Validation Types
// =============================================================================

/**
 * ValidationRule
 *
 * Rule for form validation.
 */
export interface ValidationRule {
  /**
   * Field path to validate
   */
  field: string;

  /**
   * Validation type
   */
  type: ValidationType;

  /**
   * Custom error message
   */
  message?: string;

  /**
   * Validation parameters
   */
  params?: Record<string, unknown>;

  /**
   * Whether this rule is required
   */
  required?: boolean;

  /**
   * Custom validator function name
   */
  custom?: string;
}

/**
 * ValidationType
 *
 * Built-in validation types.
 */
export type ValidationType =
  | 'required'
  | 'email'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'custom'
  | 'oneOf'
  | 'url'
  | 'phone'
  | 'date'
  | 'datetime';

// =============================================================================
// Condition Types
// =============================================================================

/**
 * ConditionRule
 *
 * Rule for conditional rendering.
 */
export interface ConditionRule {
  /**
   * Unique condition identifier
   */
  id: string;

  /**
   * Condition expression
   */
  condition: ConditionExpression;

  /**
   * Action to take when condition is true
   */
  action: 'show' | 'hide' | 'enable' | 'disable';

  /**
   * Target (field or component ID)
   */
  target: string;
}

/**
 * ConditionExpression
 *
 * Condition expression for evaluations.
 */
export interface ConditionExpression {
  /**
   * Left operand
   */
  left: ConditionOperand;

  /**
   * Comparison operator
   */
  operator: ConditionOperator;

  /**
   * Right operand
   */
  right: ConditionOperand;
}

/**
 * ConditionOperand
 *
 * Operand in a condition expression.
 */
export type ConditionOperand =
  | { type: 'value'; value: unknown }
  | { type: 'binding'; source: string; path: string }
  | { type: 'context'; field: string };

/**
 * ConditionOperator
 *
 * Supported comparison operators.
 */
export type ConditionOperator =
  | 'eq'      // Equal
  | 'ne'      // Not equal
  | 'gt'      // Greater than
  | 'gte'     // Greater than or equal
  | 'lt'      // Less than
  | 'lte'     // Less than or equal
  | 'in'      // In array
  | 'not_in'  // Not in array
  | 'exists'  // Exists
  | 'contains'; // Contains

// =============================================================================
// Theme Types
// =============================================================================

/**
 * ThemeConfig
 *
 * Theme customization for a screen.
 */
export interface ThemeConfig {
  /**
   * Primary color
   */
  primaryColor?: string;

  /**
   * Background color
   */
  backgroundColor?: string;

  /**
   * Text color
   */
  textColor?: string;

  /**
   * Border radius
   */
  borderRadius?: number;

  /**
   * Custom CSS
   */
  customCss?: string;
}

// =============================================================================
// Request/Response Types
// =============================================================================

/**
 * SDUIRequest
 *
 * Request to get a screen schema.
 */
export interface SDUIRequest {
  /**
   * Screen identifier
   */
  screenId: string;

  /**
   * Actor ID (for authenticated requests)
   */
  actorId?: string;

  /**
   * Query parameters
   */
  params?: Record<string, string>;

  /**
   * Preview mode (shows all actions)
   */
  preview?: boolean;
}

/**
 * SDUIActionRequest
 *
 * Request to execute an action.
 */
export interface SDUIActionRequest {
  /**
   * Screen ID
   */
  screenId: string;

  /**
   * Action ID
   */
  actionId: string;

  /**
   * Actor ID
   */
  actorId: string;

  /**
   * Form data / payload
   */
  payload?: Record<string, unknown>;

  /**
   * Context
   */
  context?: Record<string, unknown>;
}

/**
 * SDUIResponse
 *
 * Response from executing an action.
 */
export interface SDUIActionResponse {
  /**
   * Success flag
   */
  success: boolean;

  /**
   * Response data
   */
  data?: unknown;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Error code
   */
  errorCode?: string;

  /**
   * Navigation target (if action triggers navigation)
   */
  navigateTo?: string;

  /**
   * Toast message
   */
  toast?: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  };

  /**
   * Updated schema (if screen should update)
   */
  updatedSchema?: UISchema;
}

// =============================================================================
// Component Library Types
// =============================================================================

/**
 * SDUIComponent
 *
 * Definition of a reusable component in the SDUI system.
 */
export interface SDUIComponent {
  /**
   * Component type identifier
   */
  type: string;

  /**
   * Display name
   */
  displayName: string;

  /**
   * Category for organization
   */
  category: ComponentCategory;

  /**
   * Description
   */
  description?: string;

  /**
   * Default props
   */
  defaultProps?: Record<string, unknown>;

  /**
   * Prop types schema
   */
  propTypes?: Record<string, PropTypeDefinition>;

  /**
   * Example usage
   */
  example?: Record<string, unknown>;
}

/**
 * ComponentCategory
 *
 * Categories for organizing components.
 */
export type ComponentCategory =
  | 'layout'
  | 'form'
  | 'display'
  | 'navigation'
  | 'feedback'
  | 'data'
  | 'media';

/**
 * PropTypeDefinition
 *
 * Definition of a prop type.
 */
export interface PropTypeDefinition {
  /**
   * Type name
   */
  type: string;

  /**
   * Whether prop is required
   */
  required?: boolean;

  /**
   * Default value
   */
  defaultValue?: unknown;

  /**
   * Description
   */
  description?: string;

  /**
   * Allowed values (for enums)
   */
  allowedValues?: unknown[];
}

// =============================================================================
// Navigation Types
// =============================================================================

/**
 * NavigationConfig
 *
 * Navigation structure for role-based menus.
 */
export interface NavigationConfig {
  /**
   * Navigation items
   */
  items: NavigationItem[];

  /**
   * User menu items
   */
  userMenu?: NavigationItem[];

  /**
   * Footer links
   */
  footer?: NavigationItem[];
}

/**
 * NavigationItem
 *
 * Single navigation item.
 */
export interface NavigationItem {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Icon name
   */
  icon?: string;

  /**
   * Navigation target
   */
  path: string;

  /**
   * Child items (for nested menus)
   */
  children?: NavigationItem[];

  /**
   * Required roles (empty = all roles)
   */
  roles?: string[];

  /**
   * Badge/count
   */
  badge?: {
    value: number;
    color?: string;
  };
}
