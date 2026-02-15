/**
 * Test Fixtures for SDUI Runtime
 * Provides reusable test data and factory functions
 */

import {
  UISchema,
  UIComposeRequest,
  UIComposeResponse,
  StackLayout,
  GridLayout,
  FlexLayout,
  TabsLayout,
  ModalLayout,
  DrawerLayout,
  ComponentDefinition,
  DataSource,
  Binding,
  ActionDefinition,
  ValidatorDefinition,
  CapabilityRequirement,
  Condition,
  ScreenState,
  SchemaMetadata,
  ResponseMetadata,
  ActionInvocationRequest,
  ActionInvocationResult,
  AIAnnotation,
  TelemetryConfig,
  ActionHandler,
  ValidationRule,
  ValidationRuleSet,
  ConditionExpression,
} from '../../schema/v1/types';

// ============================================================================
// Test Constants
// ============================================================================

export const TEST_ACTOR_ID = 'test-actor-001';
export const TEST_CONTEXT_ID = 'test-context-001';
export const TEST_CONTEXT_TYPE = 'dashboard';
export const TEST_SCHEMA_VERSION = '1.0.0';
export const TEST_SCHEMA_VERSION_NUMBER = 1;

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a minimal StackLayout (base for layout nodes)
 */
export function createStackLayout(overrides?: Partial<StackLayout>): StackLayout {
  return {
    id: 'layout-001',
    type: 'stack',
    direction: 'vertical',
    children: [],
    ...overrides,
  } as StackLayout;
}

/**
 * Create a minimal GridLayout
 */
export function createGridLayout(overrides?: Partial<GridLayout>): GridLayout {
  return {
    id: 'layout-001',
    type: 'grid',
    columns: 2,
    children: [],
    ...overrides,
  } as GridLayout;
}

/**
 * Create a minimal FlexLayout
 */
export function createFlexLayout(overrides?: Partial<FlexLayout>): FlexLayout {
  return {
    id: 'layout-001',
    type: 'flex',
    direction: 'row',
    children: [],
    ...overrides,
  } as FlexLayout;
}

/**
 * Create a minimal TabsLayout
 */
export function createTabsLayout(overrides?: Partial<TabsLayout>): TabsLayout {
  return {
    id: 'tabs-001',
    type: 'tabs',
    tabs: [],
    children: [],
    ...overrides,
  } as TabsLayout;
}

/**
 * Create a minimal ModalLayout
 */
export function createModalLayout(overrides?: Partial<ModalLayout>): ModalLayout {
  return {
    id: 'modal-001',
    type: 'modal',
    overlay: true,
    closable: true,
    closeOnOverlayClick: true,
    slots: {
      body: { id: 'body', name: 'body', required: true },
    },
    children: [],
    ...overrides,
  } as ModalLayout;
}

/**
 * Create a minimal DrawerLayout
 */
export function createDrawerLayout(overrides?: Partial<DrawerLayout>): DrawerLayout {
  return {
    id: 'drawer-001',
    type: 'drawer',
    overlay: true,
    closable: true,
    closeOnOverlayClick: true,
    placement: 'end',
    slots: {
      body: { id: 'body', name: 'body', required: true },
    },
    children: [],
    ...overrides,
  } as DrawerLayout;
}

/**
 * Create a screen state
 */
export function createScreenState(overrides?: Partial<ScreenState>): ScreenState {
  return {
    id: 'state-001',
    version: TEST_SCHEMA_VERSION,
    data: {},
    lastModified: new Date().toISOString(),
    etag: '"abc123"',
    ttl: 300,
    ...overrides,
  };
}

/**
 * Create schema metadata
 */
export function createSchemaMetadata(overrides?: Partial<SchemaMetadata>): SchemaMetadata {
  return {
    screenId: 'test-screen',
    screenTitle: 'Test Screen',
    contextType: TEST_CONTEXT_TYPE,
    contextId: TEST_CONTEXT_ID,
    locale: 'en',
    createdAt: new Date().toISOString(),
    cacheable: true,
    ttl: 300,
    ...overrides,
  };
}

/**
 * Create response metadata
 */
export function createResponseMetadata(overrides?: Partial<ResponseMetadata>): ResponseMetadata {
  return {
    schemaVersion: TEST_SCHEMA_VERSION_NUMBER,
    etag: '"abc123"',
    timestamp: new Date().toISOString(),
    features: [],
    ...overrides,
  };
}

/**
 * Create a minimal UISchema
 */
export function createUISchema(overrides?: Partial<UISchema>): UISchema {
  return {
    version: TEST_SCHEMA_VERSION,
    schemaVersion: TEST_SCHEMA_VERSION_NUMBER,
    screen: {
      id: 'test-screen',
      type: 'screen',
      layout: createStackLayout(),
      state: createScreenState(),
      dataSources: [],
      bindings: [],
      actions: [],
      validators: [],
      telemetry: { screenEvents: true, actionEvents: true },
    },
    metadata: createSchemaMetadata(),
    capabilities: [],
    telemetry: { screenEvents: true, actionEvents: true },
    ...overrides,
  };
}

/**
 * Create a UIComposeResponse
 */
export function createComposeResponse(overrides?: Partial<UIComposeResponse>): UIComposeResponse {
  return {
    schema: createUISchema(),
    metadata: createResponseMetadata(),
    ...overrides,
  };
}

/**
 * Create a minimal UIComposeRequest
 */
export function createComposeRequest(overrides?: Partial<UIComposeRequest>): UIComposeRequest {
  return {
    actorId: TEST_ACTOR_ID,
    contextId: TEST_CONTEXT_ID,
    contextType: TEST_CONTEXT_TYPE,
    ...overrides,
  };
}

/**
 * Create an action invocation request
 */
export function createActionRequest(overrides?: Partial<ActionInvocationRequest>): ActionInvocationRequest {
  return {
    actorId: TEST_ACTOR_ID,
    actionId: 'test-action',
    contextId: TEST_CONTEXT_ID,
    payload: {},
    correlationId: `corr_${Date.now()}`,
    ...overrides,
  };
}

/**
 * Create an action invocation result
 */
export function createActionResult(overrides?: Partial<ActionInvocationResult>): ActionInvocationResult {
  return {
    success: true,
    correlationId: `corr_${Date.now()}`,
    data: {},
    ...overrides,
  };
}

// ============================================================================
// Complex Test Fixtures
// ============================================================================

/**
 * Create a nested layout with multiple levels
 */
export function createNestedLayout(depth: number): StackLayout {
  if (depth === 0) {
    return createStackLayout({
      id: `leaf-${depth}`,
      children: [],
    });
  }

  return createStackLayout({
    id: `level-${depth}`,
    children: [
      createNestedLayout(depth - 1),
      createNestedLayout(depth - 1),
    ],
  });
}

/**
 * Create a complex dashboard layout
 */
export function createDashboardLayout(): StackLayout {
  return createStackLayout({
    id: 'dashboard-root',
    children: [
      // Header row
      createStackLayout({
        id: 'header',
        direction: 'horizontal',
        children: [
          createStackLayout({
            id: 'title-container',
            children: [],
          }),
          createStackLayout({
            id: 'user-menu',
            children: [],
          }),
        ],
      }),
      // Stats cards row
      createStackLayout({
        id: 'stats-row',
        direction: 'horizontal',
        children: [
          createStackLayout({ id: 'stat-1', children: [] }),
          createStackLayout({ id: 'stat-2', children: [] }),
          createStackLayout({ id: 'stat-3', children: [] }),
        ],
      }),
      // Main content area with tabs
      createStackLayout({
        id: 'main-content',
        children: [
          createStackLayout({ id: 'tab-overview', children: [] }),
          createStackLayout({ id: 'tab-details', children: [] }),
        ],
      }),
    ],
  });
}

/**
 * Create a notification center layout
 */
export function createNotificationCenterLayout(): StackLayout {
  return createStackLayout({
    id: 'notifications-root',
    children: [
      createStackLayout({
        id: 'notification-header',
        children: [],
      }),
      createStackLayout({
        id: 'notification-list',
        children: [
          createStackLayout({ id: 'notif-1', children: [] }),
          createStackLayout({ id: 'notif-2', children: [] }),
          createStackLayout({ id: 'notif-3', children: [] }),
        ],
      }),
    ],
  });
}

// ============================================================================
// Data Sources
// ============================================================================

/**
 * Create a data source
 */
export function createDataSource(overrides?: Partial<DataSource>): DataSource {
  return {
    id: 'ds-001',
    type: 'async',
    endpoint: '/api/data',
    ...overrides,
  };
}

/**
 * Create a binding
 */
export function createBinding(overrides?: Partial<Binding>): Binding {
  return {
    id: 'binding-001',
    sourceId: 'ds-001',
    targetId: 'component-001',
    targetPath: 'data',
    ...overrides,
  };
}

// ============================================================================
// Actions & Capabilities
// ============================================================================

/**
 * Create an action definition
 */
export function createAction(overrides?: Partial<ActionDefinition>): ActionDefinition {
  return {
    id: 'action-001',
    type: 'custom',
    label: 'Test Action',
    handler: { type: 'command', target: 'TestCommand' },
    scope: 'screen',
    ...overrides,
  };
}

/**
 * Create a capability requirement
 */
export function createCapabilityRequirement(
  capability: string,
  overrides?: Partial<CapabilityRequirement>,
): CapabilityRequirement {
  return {
    capability,
    required: true,
    ...overrides,
  };
}

// ============================================================================
// Conditions & Validation
// ============================================================================

/**
 * Create a condition
 */
export function createCondition(overrides?: Partial<Condition>): Condition {
  return {
    $when: {
      operator: 'eq',
      left: 'user.role',
      right: 'admin',
    },
    ...overrides,
  };
}

/**
 * Create a validator definition
 */
export function createValidator(overrides?: Partial<ValidatorDefinition>): ValidatorDefinition {
  return {
    id: 'validator-001',
    name: 'Email Validator',
    type: 'sync',
    validate: 'validateEmail',
    ...overrides,
  };
}

/**
 * Create validation rules
 */
export function createValidationRules(overrides?: Partial<ValidationRule>): ValidationRule {
  return {
    id: 'validation-001',
    field: 'email',
    rules: [
      { type: 'required', severity: 'error' },
      { type: 'email', severity: 'error' },
    ],
    ...overrides,
  };
}

// ============================================================================
// AI Annotations
// ============================================================================

/**
 * Create an AI annotation
 */
export function createAIAnnotation(overrides?: Partial<AIAnnotation>): AIAnnotation {
  return {
    id: 'ai-001',
    targetId: 'component-001',
    targetType: 'component',
    type: 'suggestion',
    content: {
      body: 'Consider adding a confirmation dialog',
      confidence: 0.95,
    },
    metadata: {
      model: 'gpt-4',
      generatedAt: new Date().toISOString(),
      version: '1.0',
    },
    ...overrides,
  };
}

// ============================================================================
// Malformed/Invalid Test Data
// ============================================================================

/**
 * Create an empty component tree
 */
export function createEmptyLayout(): StackLayout {
  return createStackLayout({
    id: 'empty',
    children: [],
  });
}

/**
 * Create a deeply nested layout
 */
export function createDeeplyNestedLayout(depth: number): StackLayout {
  let current: StackLayout = {
    id: `leaf-${depth}`,
    type: 'stack',
    direction: 'vertical',
    children: [],
  };

  for (let i = depth; i > 0; i--) {
    current = {
      id: `nested-${i}`,
      type: 'stack',
      direction: 'vertical',
      children: [current],
    };
  }

  return current;
}

/**
 * Create a circular layout (for negative testing)
 */
export function createCircularLayout(): StackLayout {
  const parent: StackLayout = {
    id: 'parent',
    type: 'stack',
    direction: 'vertical',
    children: [],
  };

  const child: StackLayout = {
    id: 'child',
    type: 'stack',
    direction: 'vertical',
    children: [parent], // Creates circular reference
  };

  parent.children!.push(child as never);
  return parent;
}

/**
 * Create invalid/malformed schemas
 */
export const MALFORMED_SCHEMAS = {
  missingVersion: {
    screen: {
      id: 'test',
      type: 'screen',
      layout: createStackLayout(),
    },
  } as unknown as UISchema,

  missingScreen: {
    version: '1.0.0',
    schemaVersion: 1,
  } as unknown as UISchema,

  invalidLayout: {
    version: '1.0.0',
    schemaVersion: 1,
    screen: {
      id: 'test',
      type: 'screen',
      layout: null,
    },
  } as unknown as UISchema,

  invalidComponentType: {
    version: '1.0.0',
    schemaVersion: 1,
    screen: {
      id: 'test',
      type: 'screen',
      layout: {
        id: 'root',
        type: 'InvalidComponentType' as any,
        children: [],
      },
    },
  } as unknown as UISchema,

  circularLayout: {
    version: '1.0.0',
    schemaVersion: 1,
    screen: {
      id: 'test',
      type: 'screen',
      layout: createCircularLayout(),
    },
  } as unknown as UISchema,
};

/**
 * Create invalid conditions
 */
export const INVALID_CONDITIONS = {
  unknownOperator: {
    $when: {
      operator: 'unknown_operator' as ConditionExpression['operator'],
      left: 'a',
      right: 'b',
    },
  },

  invalidLeft: {
    $when: {
      operator: 'eq',
      left: null as any,
      right: 'b',
    },
  },

  malformedAnd: {
    $and: null as any,
  },

  malformedOr: {
    $or: 'not-an-array' as any,
  },
};

/**
 * Create expired AI suggestion
 */
export function createExpiredAISuggestion(): AIAnnotation {
  return createAIAnnotation({
    metadata: {
      model: 'gpt-4',
      generatedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (expired)
      version: '1.0',
    },
  });
}

// ============================================================================
// Large Payloads (for performance testing)
// ============================================================================

/**
 * Create a large component tree
 */
export function createLargeComponentTree(componentCount: number): StackLayout {
  const children: StackLayout[] = [];

  for (let i = 0; i < componentCount; i++) {
    children.push(
      createStackLayout({
        id: `component-${i}`,
        children: [],
      }),
    );
  }

  return createStackLayout({
    id: 'large-root',
    children,
  });
}

/**
 * Create a schema with many AI annotations
 */
export function createSchemaWithManyAISuggestions(count: number): UISchema {
  const aiAnnotations: AIAnnotation[] = [];

  for (let i = 0; i < count; i++) {
    aiAnnotations.push(
      createAIAnnotation({
        id: `ai-${i}`,
        content: {
          body: `Suggestion ${i}`,
          confidence: 0.9,
        },
      }),
    );
  }

  return createUISchema({
    aiAnnotations,
  });
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Generate a unique ID for tests
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a timestamp for tests
 */
export function createTestTimestamp(offsetMs: number = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

/**
 * Create a capability set for testing
 */
export function createCapabilitySet(capabilities: string[]): Set<string> {
  return new Set(capabilities);
}

/**
 * Check if capability is in set
 */
export function hasCapability(capabilities: Set<string>, required: string): boolean {
  return capabilities.has(required);
}
