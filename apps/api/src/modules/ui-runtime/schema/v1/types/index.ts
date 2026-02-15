// UISchema v1 Core Types
// These types define the complete structure for Server-Driven UI

/**
 * Component categories
 */
export type ComponentCategory = 
  | 'display' 
  | 'interactive' 
  | 'form' 
  | 'data' 
  | 'visualization' 
  | 'composite' 
  | 'container';

/**
 * Component definition
 */
export interface ComponentDefinition {
  /** Component type */
  type: string;
  /** Component version */
  version: string;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Category */
  category: ComponentCategory;
  /** Tags for search/filtering */
  tags?: string[];
  /** Props schema */
  propsSchema: PropSchema;
  /** Component slots */
  slots?: Record<string, ComponentSlot>;
  /** Component events */
  events?: ComponentEvent[];
  /** Component state definitions */
  states?: ComponentStateDefinition[];
  /** Required capabilities */
  requiredCapabilities?: string[];
  /** Required consents */
  requiredConsents?: string[];
  /** Supported platforms */
  platforms?: ('web' | 'ios' | 'android')[];
  /** Renderer key */
  renderer: string;
  /** Default props */
  defaultProps?: Record<string, PropValue>;
  /** Lifecycle hooks */
  lifecycle?: {
    mounted?: string;
    unmounted?: string;
  };
  /** AI configuration */
  aiConfig?: AIComponentConfig;
}

/**
 * Props schema entry
 */
export interface PropSchemaEntry {
  /** Property type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'enum' | 'union';
  /** Is required */
  required?: boolean;
  /** Default value */
  default?: PropValue;
  /** Validation rules */
  validation?: ValidationRuleSet[];
  /** Description */
  description?: string;
  /** Enum values (for enum type) */
  enum?: PropValue[];
  /** Items schema (for array type) */
  items?: PropSchemaEntry;
  /** Properties (for object type) */
  properties?: Record<string, PropSchemaEntry>;
}

/**
 * Props schema
 */
export interface PropSchema {
  [propName: string]: PropSchemaEntry;
}

/**
 * Component slot
 */
export interface ComponentSlot {
  /** Slot name */
  name: string;
  /** Description */
  description?: string;
  /** Allowed component types */
  allowedComponents?: string[];
  /** Multiple items allowed */
  multiple?: boolean;
  /** Is slot required */
  required?: boolean;
  /** Default component */
  default?: {
    type: string;
    props?: Record<string, PropValue>;
  };
}

/**
 * Component event
 */
export interface ComponentEvent {
  /** Event name */
  name: string;
  /** Description */
  description?: string;
  /** Event payload schema */
  payload?: Record<string, PropSchemaEntry>;
  /** Event bubbles */
  bubbles?: boolean;
}

/**
 * Component state definition
 */
export interface ComponentStateDefinition {
  /** State name */
  name: string;
  /** Initial value */
  initial: PropValue;
  /** Persistence */
  persistence?: 'session' | 'local' | 'server';
}

/**
 * AI component configuration
 */
export interface AIComponentConfig {
  /** Can be annotated */
  annotatable: boolean;
  /** Available suggestions */
  suggestions?: string[];
  /** Risk assessment enabled */
  riskAssessment?: boolean;
  /** Is explainable */
  explainable?: boolean;
}

/**
 * Root UISchema interface - the complete screen definition
 */
export interface UISchema {
  /** Schema version (e.g., "1.0.0") */
  version: string;
  /** Numeric schema version for comparison */
  schemaVersion: number;
  /** Screen definition */
  screen: Screen;
  /** Schema metadata */
  metadata: SchemaMetadata;
  /** Required capabilities for this screen */
  capabilities: CapabilityRequirement[];
  /** Telemetry configuration */
  telemetry: TelemetryConfig;
  /** AI annotations */
  aiAnnotations?: AIAnnotation[];
}

/**
 * Schema metadata
 */
export interface SchemaMetadata {
  /** Unique screen identifier */
  screenId: string;
  /** Human-readable screen title */
  screenTitle: string;
  /** Context type (e.g., "MOVE_BOOKING", "USER_PROFILE") */
  contextType: string;
  /** Context entity ID */
  contextId?: string;
  /** Locale code (e.g., "en", "sw") */
  locale: string;
  /** Theme name */
  theme?: string;
  /** Schema creation timestamp */
  createdAt: string;
  /** Schema expiration timestamp */
  expiresAt?: string;
  /** Whether schema can be cached */
  cacheable: boolean;
  /** Cache TTL in seconds */
  ttl?: number;
}

/**
 * Screen definition
 */
export interface Screen {
  /** Unique screen ID */
  id: string;
  /** Type discriminator */
  type: 'screen';
  /** Root layout node */
  layout: LayoutNode;
  /** Screen-level state */
  state: ScreenState;
  /** Data sources for this screen */
  dataSources: DataSource[];
  /** Data bindings */
  bindings: Binding[];
  /** Available actions */
  actions: ActionDefinition[];
  /** Validation rules */
  validators: ValidatorDefinition[];
  /** AI annotations */
  aiAnnotations?: AIAnnotation[];
  /** Telemetry config */
  telemetry: TelemetryConfig;
}

/**
 * Screen state
 */
export interface ScreenState {
  /** State ID */
  id: string;
  /** State version */
  version: string;
  /** State data */
  data: Record<string, unknown>;
  /** Last modification timestamp */
  lastModified: string;
  /** ETag for caching */
  etag: string;
  /** Time to live */
  ttl?: number;
}

// ============================================================================
// LAYOUT TYPES
// ============================================================================

/**
 * Layout node types
 */
export type LayoutType = 
  | 'grid' 
  | 'flex' 
  | 'stack' 
  | 'tabs' 
  | 'accordion' 
  | 'modal' 
  | 'drawer' 
  | 'carousel'
  | 'split-view'
  | 'master-detail';

/**
 * Base layout interface
 */
export interface BaseLayout {
  /** Unique layout ID */
  id: string;
  /** Layout type */
  type: LayoutType;
}

/**
 * Grid layout
 */
export interface GridLayout extends BaseLayout {
  type: 'grid';
  /** Column definitions */
  columns: ColumnDefinition[];
  /** Row definitions */
  rows?: RowDefinition[];
  /** Gap between items */
  gap?: Dimension;
  /** Grid alignment */
  alignment?: GridAlignment;
  /** Child layout nodes or component refs */
  children?: (LayoutNode | ComponentReference)[];
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  /** Column span (1-12) or responsive object */
  span: number | ResponsiveValue<number>;
  /** Column offset */
  offset?: number;
  /** Justify content */
  justify?: 'start' | 'center' | 'end' | 'stretch';
}

/**
 * Responsive value
 */
export type ResponsiveValue<T> = T | {
  base?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
};

/**
 * Dimension (with optional responsive)
 */
export type Dimension = string | number | ResponsiveValue<string | number>;

/**
 * Grid alignment
 */
export interface GridAlignment {
  justifyItems?: 'start' | 'center' | 'end' | 'stretch';
  alignItems?: 'start' | 'center' | 'end' | 'stretch';
  justifyContent?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around';
  alignContent?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around';
}

/**
 * Row definition
 */
export interface RowDefinition {
  /** Row height */
  height?: Dimension;
  /** Row template (for auto/FR) */
  template?: string;
}

/**
 * Flex layout
 */
export interface FlexLayout extends BaseLayout {
  type: 'flex';
  /** Flex direction */
  direction: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  /** Justify content */
  justify?: FlexJustify;
  /** Align items */
  align?: FlexAlign;
  /** Gap between items */
  gap?: Dimension;
  /** Wrap behavior */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** Children */
  children?: (LayoutNode | ComponentReference)[];
}

/** Flex justify options */
export type FlexJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';

/** Flex align options */
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';

/**
 * Stack layout (simplified vertical/horizontal)
 */
export interface StackLayout extends BaseLayout {
  type: 'stack';
  /** Stack direction */
  direction: 'vertical' | 'horizontal';
  /** Gap between items */
  gap?: Dimension;
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'space-between' | 'space-around';
  /** Children */
  children?: (LayoutNode | ComponentReference)[];
}

/**
 * Tabs layout
 */
export interface TabsLayout extends BaseLayout {
  type: 'tabs';
  /** Tab items */
  tabs: TabItem[];
  /** Initially active tab ID */
  activeTab?: string;
  /** Tab position */
  tabPosition: 'top' | 'bottom' | 'left' | 'right';
  /** Tab variant */
  variant: 'line' | 'pills' | 'enclosed';
}

/**
 * Tab item
 */
export interface TabItem {
  /** Tab ID */
  id: string;
  /** Tab label */
  label: string;
  /** Tab icon */
  icon?: string;
  /** Badge count */
  badge?: number | BindingReference;
  /** Disabled condition */
  disabled?: boolean | Condition;
  /** Tab content (layout) */
  content: LayoutNode;
}

/**
 * Modal layout
 */
export interface ModalLayout extends BaseLayout {
  type: 'modal';
  /** Show overlay */
  overlay: boolean;
  /** Show close button */
  closable: boolean;
  /** Close on overlay click */
  closeOnOverlayClick: boolean;
  /** Modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Modal position */
  position?: 'center' | 'top' | 'bottom';
  /** Animation config */
  animation?: AnimationConfig;
  /** Slots */
  slots: ModalSlots;
}

/**
 * Modal slots
 */
export interface ModalSlots {
  /** Header slot */
  header?: SlotDefinition;
  /** Body slot (required) */
  body: SlotDefinition;
  /** Footer slot */
  footer?: SlotDefinition;
}

/**
 * Drawer layout
 */
export interface DrawerLayout extends BaseLayout {
  type: 'drawer';
  /** Show overlay */
  overlay: boolean;
  /** Show close button */
  closable: boolean;
  /** Close on overlay click */
  closeOnOverlayClick: boolean;
  /** Drawer placement */
  placement: 'start' | 'end' | 'top' | 'bottom';
  /** Drawer width/height */
  width?: Dimension;
  height?: Dimension;
  /** Animation config */
  animation?: AnimationConfig;
  /** Slots */
  slots: ModalSlots;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Animation name */
  name?: string;
  /** Animation duration in ms */
  duration?: number;
  /** Animation easing */
  easing?: string;
}

/**
 * Union of all layout types
 */
export type LayoutNode = 
  | GridLayout 
  | FlexLayout 
  | StackLayout 
  | TabsLayout 
  | ModalLayout 
  | DrawerLayout;

/**
 * Slot definition
 */
export interface SlotDefinition {
  /** Slot ID */
  id: string;
  /** Slot name */
  name: string;
  /** Allowed component types */
  allowedComponents?: string[];
  /** Default component */
  defaultComponent?: string;
  /** Is slot required */
  required: boolean;
}

// ============================================================================
// COMPONENT TYPES
// ============================================================================

/**
 * Component reference (placeholder in layout)
 */
export interface ComponentReference {
  /** Reference ID */
  id: string;
  /** Component type */
  componentRef: string;
  /** Override props */
  props?: Record<string, PropValue>;
  /** Visibility condition */
  visibility?: Condition;
}

/**
 * Component node
 */
export interface ComponentNode {
  /** Component ID */
  id: string;
  /** Component type */
  type: string;
  /** Component variant */
  variant?: string;
  /** Named slots */
  slots?: Record<string, ComponentNode[]>;
  /** Component props */
  props: ComponentProps;
  /** Component-local state */
  state?: ComponentState;
  /** Data bindings */
  bindings?: Binding[];
  /** Event bindings */
  events?: EventBinding[];
  /** Action references */
  actions?: ActionReference[];
  /** Validation rules */
  validation?: ValidationRule[];
  /** Required capabilities */
  capabilities?: string[];
  /** AI annotations */
  aiAnnotations?: AIAnnotation[];
  /** Risk decoration */
  riskDecoration?: RiskDecoration;
  /** Accessibility config */
  accessibility?: AccessibilityConfig;
}

/**
 * Component props
 */
export interface ComponentProps {
  /** Dynamic props object */
  [key: string]: PropValue;
}

/**
 * Forward declaration for complex types to avoid circular reference
 */
type ComponentNodeRef = ComponentNode;

/**
 * Prop value types - simplified to avoid circular reference
 */
export type PropValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  | PropValue[]
  | Record<string, unknown>
  | BindingReference
  | Expression
  | StaticValue
  | ContextReference;

/**
 * Binding reference
 */
export interface BindingReference {
  /** Binding type marker */
  $binding?: {
    /** Data source ID */
    source: string;
    /** JSON path */
    path: string;
    /** Default value if not found */
    default?: PropValue;
    /** Transform functions */
    transform?: Transform[];
  };
}

/**
 * Static value marker
 */
export interface StaticValue {
  /** Static value marker */
  $value?: PropValue;
}

/**
 * Context reference
 */
export interface ContextReference {
  /** Context marker */
  $context?: {
    /** Context key */
    key: string;
    /** Default value */
    default?: PropValue;
  };
}

/**
 * Expression
 */
export interface Expression {
  /** Expression marker */
  $expr?: {
    /** Operator */
    operator: ExpressionOperator;
    /** Operands */
    operands: (Expression | BindingReference | PropValue)[];
  };
}

/** Expression operators */
export type ExpressionOperator = 
  | 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte'
  | 'and' | 'or' | 'not'
  | 'in' | 'notIn'
  | 'contains' | 'startsWith' | 'endsWith'
  | 'add' | 'sub' | 'mul' | 'div' | 'mod'
  | 'map' | 'filter' | 'reduce' | 'sort'
  | 'length' | 'toUpper' | 'toLower' | 'trim'
  | 'formatDate' | 'formatNumber' | 'formatCurrency';

/**
 * Component state
 */
export interface ComponentState {
  /** Component ID */
  componentId: string;
  /** Local state */
  local: Record<string, unknown>;
  /** Persistence */
  persistence?: 'none' | 'session' | 'local' | 'server';
}

/**
 * Accessibility config
 */
export interface AccessibilityConfig {
  /** ARIA label */
  ariaLabel?: string;
  /** ARIA description */
  ariaDescription?: string;
  /** Role */
  role?: string;
  /** Keyboard navigation */
  keyboardNavigation?: string[];
  /** Focusable */
  focusable?: boolean;
  /** Tab index */
  tabIndex?: number;
}

// ============================================================================
// DATA BINDING TYPES
// ============================================================================

/**
 * Data source types
 */
export type DataSourceType = 'static' | 'async' | 'computed' | 'websocket' | 'polling';

/**
 * Data source
 */
export interface DataSource {
  /** Data source ID */
  id: string;
  /** Data source type */
  type: DataSourceType;
  /** Endpoint URL */
  endpoint?: string;
  /** HTTP method */
  method?: 'GET' | 'POST';
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Query parameters */
  query?: Record<string, string>;
  /** Loading state config */
  loadingState?: LoadingStateConfig;
  /** Error state config */
  errorState?: ErrorStateConfig;
  /** Retry config */
  retry?: RetryConfig;
  /** Polling config */
  polling?: PollingConfig;
  /** WebSocket config */
  websocket?: WebSocketConfig;
}

/**
 * Loading state config
 */
export interface LoadingStateConfig {
  /** Component to show while loading */
  component?: string;
  /** Show skeleton */
  skeleton?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Error state config
 */
export interface ErrorStateConfig {
  /** Component to show on error */
  component?: string;
  /** Is retryable */
  retryable?: boolean;
  /** Retry action */
  retryAction?: string;
}

/**
 * Retry config
 */
export interface RetryConfig {
  /** Max retry attempts */
  maxAttempts: number;
  /** Backoff strategy */
  backoff: 'linear' | 'exponential';
  /** Initial delay in ms */
  initialDelay: number;
}

/**
 * Polling config
 */
export interface PollingConfig {
  /** Polling interval in ms */
  interval: number;
  /** Is polling enabled */
  enabled: boolean;
}

/**
 * WebSocket config
 */
export interface WebSocketConfig {
  /** Channel name */
  channel: string;
  /** Event name */
  event: string;
}

/**
 * Binding
 */
export interface Binding {
  /** Binding ID */
  id: string;
  /** Source data source ID */
  sourceId: string;
  /** Target component/slot ID */
  targetId: string;
  /** Target property path */
  targetPath: string;
  /** Transform functions */
  transform?: Transform[];
  /** Binding condition */
  conditional?: Condition;
}

/**
 * Transform
 */
export interface Transform {
  /** Transform type */
  type: 'map' | 'filter' | 'format' | 'cast';
  /** Transform config */
  config: Record<string, unknown>;
}

/**
 * Condition
 */
export interface Condition {
  /** When condition */
  $when?: ConditionExpression;
  /** AND conditions */
  $and?: Condition[];
  /** OR conditions */
  $or?: Condition[];
}

/**
 * Condition expression
 */
export interface ConditionExpression {
  /** Operator */
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'exists' | 'isNull';
  /** Left operand */
  left: BindingReference | ContextReference | string;
  /** Right operand */
  right: BindingReference | ContextReference | PropValue | PropValue[];
}

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Action types
 */
export type ActionType = 
  | 'submit' 
  | 'navigate' 
  | 'refresh' 
  | 'open-modal' 
  | 'close-modal'
  | 'open-drawer'
  | 'close-drawer'
  | 'reset'
  | 'custom';

/**
 * Action definition
 */
export interface ActionDefinition {
  /** Action ID */
  id: string;
  /** Action type */
  type: ActionType;
  /** Display label */
  label: string;
  /** Description */
  description?: string;
  /** Icon */
  icon?: string;
  /** Action handler */
  handler: ActionHandler;
  /** Action payload */
  payload?: Record<string, PropValue>;
  /** Required capability */
  requiresCapability?: string;
  /** Required consent */
  requiresConsent?: string;
  /** Validator IDs */
  validates?: string[];
  /** Navigation config */
  navigation?: NavigationConfig;
  /** Loading state */
  loadingState?: LoadingStateConfig;
  /** Success state */
  successState?: SuccessStateConfig;
  /** Error state */
  errorState?: ErrorStateConfig;
  /** Pre-actions */
  before?: string[];
  /** Post-actions */
  after?: string[];
  /** Action scope */
  scope: 'screen' | 'region' | 'component';
  /** Target ID for region/component scope */
  targetId?: string;
  /** Style variant */
  style?: 'primary' | 'secondary' | 'danger' | 'link';
  /** Disabled condition */
  disabled?: Condition;
  /** Hidden condition */
  hidden?: Condition;
}

/**
 * Action handler
 */
export interface ActionHandler {
  /** Handler type */
  type: 'command' | 'workflow' | 'external' | 'internal';
  /** Handler target (command name, workflow ID, or URL) */
  target: string;
}

/**
 * Navigation config
 */
export interface NavigationConfig {
  /** Navigation type */
  type: 'replace' | 'push' | 'back';
  /** Target screen */
  screen?: string;
  /** Navigation params */
  params?: Record<string, string>;
}

/**
 * Success state config
 */
export interface SuccessStateConfig {
  /** Show toast */
  toast?: string;
  /** Navigate */
  navigate?: NavigationConfig;
  /** Refresh regions */
  refreshRegions?: string[];
}

/**
 * Action reference (in component)
 */
export interface ActionReference {
  /** Action ID reference */
  actionId: string;
  /** Event that triggers action */
  trigger: string;
  /** Debounce in ms */
  debounce?: number;
  /** Throttle in ms */
  throttle?: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Event binding
 */
export interface EventBinding {
  /** Event name */
  event: string;
  /** Action to execute */
  action: string | ActionDefinition;
  /** Conditions */
  conditions?: Condition[];
  /** Debounce in ms */
  debounce?: number;
  /** Throttle in ms */
  throttle?: number;
  /** Capture phase */
  capture?: boolean;
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Validation rule
 */
export interface ValidationRule {
  /** Rule ID */
  id: string;
  /** Field path */
  field: string;
  /** Validation rules */
  rules: ValidationRuleSet[];
  /** Error messages by locale */
  message?: Record<string, string>;
}

/**
 * Validation rule set
 */
export interface ValidationRuleSet {
  /** Rule type */
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom' | 'email' | 'url' | 'phone' | 'match';
  /** Rule value */
  value?: unknown;
  /** Error message */
  message?: string;
  /** Severity */
  severity?: 'error' | 'warning';
}

/**
 * Validator definition
 */
export interface ValidatorDefinition {
  /** Validator ID */
  id: string;
  /** Validator name */
  name: string;
  /** Validator type */
  type: 'sync' | 'async';
  /** Validate function reference */
  validate: string; // Reference to handler function
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field path */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Severity */
  severity: 'error' | 'warning';
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Is valid */
  valid: boolean;
  /** Errors */
  errors: ValidationError[];
  /** Warnings */
  warnings: ValidationWarning[];
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field path */
  field: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
}

// ============================================================================
// AI TYPES
// ============================================================================

/**
 * AI annotation
 */
export interface AIAnnotation {
  /** Annotation ID */
  id: string;
  /** Target ID (component or action) */
  targetId: string;
  /** Target type */
  targetType: 'component' | 'action' | 'screen';
  /** Annotation type */
  type: 'explanation' | 'suggestion' | 'risk' | 'confidence' | 'ordering';
  /** Annotation content */
  content: AIAnnotationContent;
  /** Metadata */
  metadata: AIMetadata;
  /** Actions */
  actions?: AIAction[];
}

/**
 * AI annotation content
 */
export interface AIAnnotationContent {
  /** Title */
  title?: string;
  /** Body text */
  body: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Priority (1-5) */
  priority?: number;
}

/**
 * AI metadata
 */
export interface AIMetadata {
  /** Model name */
  model: string;
  /** Generation timestamp */
  generatedAt: string;
  /** Expiration timestamp */
  expiresAt?: string;
  /** Model version */
  version: string;
}

/**
 * AI action
 */
export interface AIAction {
  /** Action ID */
  id: string;
  /** Action label */
  label: string;
  /** Action style */
  style: 'primary' | 'secondary' | 'link';
  /** Action definition */
  action: ActionDefinition;
}

/**
 * Risk decoration
 */
export interface RiskDecoration {
  /** Risk level */
  level: 'low' | 'medium' | 'high' | 'critical';
  /** Risk factors */
  factors: RiskFactor[];
  /** Override allowed */
  overrideable: boolean;
  /** Warning message */
  warning?: string;
}

/**
 * Risk factor
 */
export interface RiskFactor {
  /** Category */
  category: string;
  /** Description */
  description: string;
  /** Weight */
  weight: number;
}

// ============================================================================
// CAPABILITY & CONSENT
// ============================================================================

/**
 * Capability requirement
 */
export interface CapabilityRequirement {
  /** Capability name */
  capability: string;
  /** Is required */
  required: boolean;
  /** Reason if denied */
  reason?: string;
}

// ============================================================================
// TELEMETRY
// ============================================================================

/**
 * Telemetry config
 */
export interface TelemetryConfig {
  /** Enable screen events */
  screenEvents?: boolean;
  /** Enable component events */
  componentEvents?: boolean;
  /** Enable action events */
  actionEvents?: boolean;
  /** Enable performance events */
  performanceEvents?: boolean;
  /** Sample rate (0-1) */
  sampleRate?: number;
}

/**
 * Telemetry event types
 */
export type TelemetryEventType = 
  | 'ScreenRendered'
  | 'ComponentRendered'
  | 'ActionInvoked'
  | 'ActionSucceeded'
  | 'ActionFailed'
  | 'SuggestionDisplayed'
  | 'SuggestionAccepted'
  | 'RegionRefreshed'
  | 'DataLoaded'
  | 'ErrorOccurred';

/**
 * Base telemetry event
 */
export interface TelemetryEvent {
  /** Event type */
  event: TelemetryEventType;
  /** Timestamp */
  timestamp: string;
  /** Actor ID */
  actorId: string;
  /** Context ID */
  contextId: string;
  /** Context type */
  contextType: string;
  /** Correlation ID */
  correlationId: string;
  /** Capability (if applicable) */
  capability?: string;
  /** Workflow state */
  workflowState?: string;
}

/**
 * Screen rendered event
 */
export interface ScreenRenderedEvent extends TelemetryEvent {
  event: 'ScreenRendered';
  screenId: string;
  schemaVersion: number;
  renderTime: number;
  componentCount: number;
}

/**
 * Action invoked event
 */
export interface ActionInvokedEvent extends TelemetryEvent {
  event: 'ActionInvoked';
  actionId: string;
  actionType: string;
  payloadSize?: number;
}

/**
 * Action succeeded event
 */
export interface ActionSucceededEvent extends TelemetryEvent {
  event: 'ActionSucceeded';
  actionId: string;
  duration: number;
}

/**
 * Action failed event
 */
export interface ActionFailedEvent extends TelemetryEvent {
  event: 'ActionFailed';
  actionId: string;
  errorCode: string;
  errorMessage: string;
  recoverable: boolean;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * UI compose request
 */
export interface UIComposeRequest {
  /** Actor ID */
  actorId: string;
  /** Context type */
  contextType: string;
  /** Context ID */
  contextId: string;
  /** Optional parameters */
  options?: UIComposeOptions;
}

/**
 * UI compose options
 */
export interface UIComposeOptions {
  /** Schema version preference */
  schemaVersion?: number;
  /** Feature flags */
  featureFlags?: Record<string, boolean>;
  /** Platform */
  platform?: 'web' | 'ios' | 'android';
  /** Locale override */
  locale?: string;
  /** Include debug info */
  debug?: boolean;
}

/**
 * UI compose response
 */
export interface UIComposeResponse {
  /** UISchema */
  schema: UISchema;
  /** Response metadata */
  metadata: ResponseMetadata;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /** Schema version */
  schemaVersion: number;
  /** ETag */
  etag: string;
  /** Timestamp */
  timestamp: string;
  /** Cache TTL */
  ttl?: number;
  /** Available features */
  features?: string[];
}

// ============================================================================
// ACTION INVOCATION
// ============================================================================

/**
 * Action invocation request
 */
export interface ActionInvocationRequest {
  /** Action ID */
  actionId: string;
  /** Actor ID */
  actorId: string;
  /** Context ID */
  contextId: string;
  /** Payload */
  payload?: Record<string, unknown>;
  /** Correlation ID */
  correlationId?: string;
  /** Timestamp */
  timestamp?: string;
}

/**
 * Action invocation result
 */
export interface ActionInvocationResult {
  /** Success flag */
  success: boolean;
  /** Correlation ID */
  correlationId: string;
  /** Result data */
  data?: Record<string, unknown>;
  /** Errors */
  errors?: ActionError[];
  /** Side effects */
  sideEffects?: SideEffect[];
  /** UI updates */
  uiUpdates?: UIUpdate[];
  /** Navigation */
  navigation?: NavigationInstruction;
}

/**
 * Action error
 */
export interface ActionError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field path */
  field?: string;
  /** Is recoverable */
  recoverable: boolean;
  /** Recovery action */
  recoveryAction?: string;
}

/**
 * Side effect
 */
export interface SideEffect {
  /** Effect type */
  type: 'emit-event' | 'update-cache' | 'trigger-action';
  /** Effect payload */
  payload: unknown;
}

/**
 * UI update
 */
export interface UIUpdate {
  /** Update type */
  type: 'refresh-region' | 'show-modal' | 'hide-modal' | 'show-toast' | 'navigate';
  /** Target ID */
  targetId?: string;
  /** Update data */
  data?: unknown;
}

/**
 * Navigation instruction
 */
export interface NavigationInstruction {
  /** Navigation type */
  type: 'replace' | 'push' | 'back';
  /** Target screen */
  screen?: string;
  /** Params */
  params?: Record<string, string>;
}

// ============================================================================
// PARTIAL UPDATE TYPES
// ============================================================================

/**
 * Partial refresh request
 */
export interface PartialRefreshRequest {
  /** Region IDs to refresh */
  regionIds: string[];
  /** Trigger type */
  trigger: 'on-load' | 'on-event' | 'on-timer' | 'on-action';
  /** Event name (if on-event) */
  event?: string;
  /** Context data */
  context?: Record<string, unknown>;
  /** Correlation ID */
  correlationId?: string;
}

/**
 * Partial refresh response
 */
export interface PartialRefreshResponse {
  /** Region updates */
  regionUpdates: RegionUpdate[];
  /** Correlation ID */
  correlationId: string;
  /** Server timestamp */
  serverTime: string;
}

/**
 * Region update
 */
export interface RegionUpdate {
  /** Region ID */
  regionId: string;
  /** Diff operations */
  operations: DiffOperation[];
  /** Data source updates */
  dataSourceUpdates?: DataSourceUpdate[];
  /** Diff hash */
  diffHash: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Diff operation
 */
export interface DiffOperation {
  /** Operation type */
  op: 'replace' | 'remove' | 'insert' | 'move';
  /** Target path */
  path: string;
  /** Value (for replace/insert) */
  value?: unknown;
  /** Source path (for move) */
  from?: string;
}

/**
 * Data source update
 */
export interface DataSourceUpdate {
  /** Data source ID */
  id: string;
  /** Updated data */
  data: unknown;
}
