/**
 * Server-Driven UI Type Definitions
 * Matches the backend UISchema structure from apps/api/src/modules/sdui/interfaces/sdui.interfaces.ts
 */

// =============================================================================
// Screen Schema Types
// =============================================================================

export interface UISchema {
  version: string;
  screenId: string;
  metadata: ScreenMetadata;
  data?: DataSource[];
  layout: LayoutNode;
  actions: ActionDefinition[];
  validations?: ValidationRule[];
  conditions?: ConditionRule[];
  theme?: ThemeConfig;
}

export interface ScreenMetadata {
  title: string;
  description?: string;
  type: ScreenType;
  auth: AuthRequirement;
  allowedRoles?: string[];
  cacheDuration?: number;
  offlineCapable?: boolean;
}

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

export type AuthRequirement = 'required' | 'optional' | 'none';

// =============================================================================
// Data Source Types
// =============================================================================

export interface DataSource {
  id: string;
  type: DataSourceType;
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  params?: Record<string, unknown>;
  staticData?: unknown;
  transform?: string;
  cacheable?: boolean;
  cacheDuration?: number;
  dependsOn?: string[];
}

export type DataSourceType = 'rest' | 'graphql' | 'static' | 'derived';

// =============================================================================
// Layout Types
// =============================================================================

export interface LayoutNode {
  type: LayoutType;
  children?: LayoutNode[];
  components?: ComponentRef[];
  props?: Record<string, unknown>;
}

export type LayoutType =
  | 'root'
  | 'stack'
  | 'grid'
  | 'flex'
  | 'tabs'
  | 'drawer'
  | 'modal'
  | 'split-view';

export interface ComponentRef {
  component: string; // Component type: 'TextField', 'Button', 'Typography', etc.
  id?: string;
  bindings?: Record<string, DataBinding>;
  props?: Record<string, unknown>;
  when?: DataBinding;
  layout?: ComponentLayoutConfig;
}

export interface DataBinding {
  source: string;
  path: string;
  defaultValue?: unknown;
}

export interface ComponentLayoutConfig {
  colSpan?: number;
  rowSpan?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  valign?: 'top' | 'middle' | 'bottom' | 'stretch';
  spacing?: SpacingConfig;
  order?: number;
  className?: string;
  style?: Record<string, string>;
}

export interface SpacingConfig {
  all?: number;
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  x?: number;
  y?: number;
}

// =============================================================================
// Action Types
// =============================================================================

export interface ActionDefinition {
  id: string;
  label: string;
  type: ActionType;
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  requiresConfirmation?: boolean;
  onSuccess?: ActionBehavior;
  onError?: ActionBehavior;
  navigateTo?: string;
  target?: string;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'success' | 'info' | 'warning';
}

export type ActionType =
  | 'submit'
  | 'navigate'
  | 'api'
  | 'mutation'
  | 'download'
  | 'external';

export interface ActionBehavior {
  type: 'navigate' | 'refresh' | 'close' | 'callback' | 'toast';
  target?: string;
  message?: string;
  toastType?: 'success' | 'error' | 'warning' | 'info';
}

// =============================================================================
// Validation Types
// =============================================================================

export interface ValidationRule {
  field: string;
  type: ValidationType;
  message?: string;
  params?: Record<string, unknown>;
  required?: boolean;
  custom?: string;
}

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

export interface ConditionRule {
  id: string;
  condition: ConditionExpression;
  action: 'show' | 'hide' | 'enable' | 'disable';
  target: string;
}

export interface ConditionExpression {
  left: ConditionOperand;
  operator: ConditionOperator;
  right: ConditionOperand;
}

export type ConditionOperand =
  | { type: 'value'; value: unknown }
  | { type: 'binding'; source: string; path: string }
  | { type: 'context'; field: string };

export type ConditionOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'contains';

// =============================================================================
// Theme Types
// =============================================================================

export interface ThemeConfig {
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
  customCss?: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface SDUIScreenResponse {
  version: string;
  screenId: string;
  metadata: ScreenMetadata;
  data?: DataSource[];
  layout: LayoutNode;
  actions: ActionDefinition[];
  validations?: ValidationRule[];
  conditions?: ConditionRule[];
  theme?: ThemeConfig;
}

export interface SDUIActionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  errorCode?: string;
  navigateTo?: string;
  redirect?: string; // Alternative to navigateTo
  message?: string; // For toasts/messages
  toast?: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  };
  updatedSchema?: UISchema;
}

export interface SDUIScreenList {
  screens: { id: string; title: string; description?: string }[];
}