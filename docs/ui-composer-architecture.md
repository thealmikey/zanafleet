# ZanaFleet UIComposer Architecture

This document describes the UIComposer Presentation Engine architecture for ZanaFleet, including the state-based rendering, capability integration, and server-driven UI patterns.

## Overview

The UIComposer is a **purely declarative** presentation layer that composes UI responses based on:

1. **Process State** - From WorkflowEngine (read-only)
2. **Actor Capabilities** - From CapabilityAccessController (read-only)
3. **Component Registry** - Predefined UI component definitions
4. **State Renderers** - Context-specific rendering strategies

### Key Design Principles

- **Read-Only**: UIComposer never mutates state or executes commands
- **Declarative**: Describes what UI should show, not how to enforce it
- **Separated**: Capability checking happens AFTER rendering (not during)
- **AI-Ready**: Stateless queries enable AI agent introspection

---

## 1. Architecture Diagram

### System Position

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND / CLIENT                               │
│  (Mobile App, Web App, AI Agent)                                           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │ HTTP/GraphQL
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / CONTROLLERS                          │
│  /api/ui/compose  ──────────►  UIComposerController                         │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            UIComposerModule                                   │
│                                                                              │
│  ┌──────────────────────┐     ┌──────────────────────┐                     │
│  │   UIComposerService  │────▶│ ComponentRegistry    │                     │
│  │                      │     │ Service              │                     │
│  │  - compose()         │     │  - 30+ components   │                     │
│  │  - registerRenderer │     │  - createComponent() │                     │
│  └──────────┬───────────┘     └──────────────────────┘                     │
│             │                                                               │
│             ▼                                                               │
│  ┌──────────────────────────────┐                                           │
│  │    StateRenderers            │  (Strategy Pattern)                      │
│  │  - AbstractStateRenderer    │                                           │
│  │  - MoveBookingStateRenderer │                                           │
│  │  - + Future Renderers        │                                           │
│  └──────────────────────────────┘                                           │
│                                                                              │
│  Architecture Boundaries (STRICTLY ENFORCED):                               │
│  ✗ NO mutations      ✗ NO command execution                                │
│  ✗ NO business rules ✗ NO capability enforcement (only READ)              │
│  ✓ YES: read, introspect, declare                                           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
┌─────────────────────────┐ ┌──────────────────┐ ┌─────────────────────────┐
│    WorkflowModule       │ │  CapabilityModule │ │   Other Modules        │
│                        │ │                   │ │                         │
│  - getProcessState()   │ │ - getCapabilities │ │  (Future: Delivery,    │
│  - ProcessDefinition   │ │   ForActor()      │ │   Business, etc.)      │
│  - ProcessInstance     │ │ - CapabilityEntity│ │                         │
└─────────────────────────┘ └──────────────────┘ └─────────────────────────┘
                                  │
                                  ▼ (MUTATION ONLY)
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CapabilityOrchestrator                                  │
│                                                                              │
│  ★ THE ONLY MUTATION ENTRYPOINT ★                                           │
│                                                                              │
│  All state changes MUST go through here:                                    │
│  - Capability check → Consent check → Command execution → Audit            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow (Read Operations)

```
Frontend Request
       │
       ▼
┌─────────────────────────────────────┐
│   UIComposeRequest                  │
│   {                                 │
│     actorId,                        │
│     contextType: "MOVE_BOOKING",    │
│     contextId: "uuid-123"          │
│   }                                 │
└─────────────────────────────────────┘
       │
       ▼ (1. Get Process State)
┌─────────────────────────────────────┐
│   WorkflowEngine.getProcessState() │
│   → Returns current state & context│
└─────────────────────────────────────┘
       │
       ▼ (2. Get Actor Capabilities)
┌─────────────────────────────────────┐
│   CapabilityAccessController.      │
│   getCapabilitiesForActor()        │
│   → Returns: ["move:booking:..."]  │
└─────────────────────────────────────┘
       │
       ▼ (3. Get Renderer for Context)
┌─────────────────────────────────────┐
│   MoveBookingStateRenderer         │
│   → Returns components & actions   │
│     for current state              │
└─────────────────────────────────────┘
       │
       ▼ (4. Filter Actions by Capability)
┌─────────────────────────────────────┐
│   UIComposerService                │
│   → Disables actions actor lacks   │
│     capability for                │
└─────────────────────────────────────┘
       │
       ▼
    UIResponse
```

### Mutation Flow (Write Operations)

```
Frontend Action Click
       │
       ▼
┌─────────────────────────────────────┐
│   UIResponse.actions[]              │
│   {                                 │
│     id: "confirm_booking",         │
│     capability: "move:confirm",    │
│     disabled: false                │
│   }                                 │
└─────────────────────────────────────┘
       │
       ▼ (REDIRECT TO CAPABILITY ORCHESTRATOR)
┌─────────────────────────────────────┐
│   POST /api/capabilities/execute   │
│   {                                 │
│     capabilityName: "move:confirm",│
│     contextId: "uuid-123",         │
│     command: ConfirmBookingCommand │
│   }                                │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│   CapabilityOrchestrator.execute()                  │
│                                                     │
│   1. hasCapability() → Check access               │
│   2. checkConsent() → If required                  │
│   3. commandBus.execute() → Execute command        │
│   4. workflowEngine.transition() → Update state    │
│   5. emit CapabilityUsedEvent → Audit              │
└─────────────────────────────────────────────────────┘
       │
       ▼
    State Changed → Frontend refetches UI
```

---

## 2. File Structure

```
apps/api/src/modules/ui-composer/
├── ui-composer.module.ts              # Main module definition
├── interfaces/
│   └── ui-composer.interfaces.ts     # All DTOs and interfaces
├── services/
│   ├── component-registry.service.ts # Component definitions registry
│   └── ui-composer.service.ts         # Main composition service
├── strategies/
│   ├── state-renderer.base.ts        # Abstract base class
│   └── move-booking-renderer.ts      # Example implementation
└── tests/
    └── unit/
        └── ui-composer.service.spec.ts

docs/
└── ui-composer-architecture.md       # This document
```

---

## 3. Core Interfaces

### UIComposeRequest

Located in [`apps/api/src/modules/ui-composer/interfaces/ui-composer.interfaces.ts`](apps/api/src/modules/ui-composer/interfaces/ui-composer.interfaces.ts):

```typescript
export interface UIComposeRequest {
  actorId: string;
  contextType: string;  // e.g., "MOVE_BOOKING"
  contextId: string;
  options?: UIComposeOptions;
}
```

### UIResponse

```typescript
export interface UIResponse {
  screen: string;
  metadata: UIMetadata;
  components: UIComponent[];
  actions: UIAction[];
}
```

### StateRenderer Interface

```typescript
export interface StateRenderer {
  readonly contextType: string;
  renderComponents(state: string, context: Record<string, unknown>): UIComponent[];
  renderActions(state: string, context: Record<string, unknown>): UIActionDefinition[];
}
```

---

## 4. Component Registry

Located in [`apps/api/src/modules/ui-composer/services/component-registry.service.ts`](apps/api/src/modules/ui-composer/services/component-registry.service.ts):

The ComponentRegistry provides 30+ predefined UI components organized by category:

| Category | Components |
|----------|------------|
| Driver | DriverCard, DriverList |
| Map | LiveMap, StaticMap |
| Status | StatusTimeline, StatusBadge, ProgressBar |
| Booking | BookingSummary, BookingDetails, QuoteCard |
| Location | AddressInput, LocationPicker, RouteDisplay |
| Payment | PaymentSummary, PaymentMethodSelector, PriceEstimate |
| Items | ItemList, ItemCard |
| Time | SchedulePicker, TimeWindow, CountdownTimer |
| Documents | DocumentUpload, DocumentList |
| Communication | ChatInterface, NotificationList |

### Registering Custom Components

```typescript
// In a custom renderer or module
this.componentRegistry.register({
  type: 'CustomComponent',
  displayName: 'Custom Component',
  description: 'A custom UI component',
  defaultProps: {
    theme: 'default',
  },
  requiresContext: true,
});
```

---

## 5. State Renderers (Strategy Pattern)

Located in [`apps/api/src/modules/ui-composer/strategies/state-renderer.base.ts`](apps/api/src/modules/ui-composer/strategies/state-renderer.base.ts):

### AbstractStateRenderer

```typescript
export abstract class AbstractStateRenderer implements StateRenderer {
  abstract readonly contextType: string;

  renderComponents(state: string, context: Record<string, unknown>): UIComponent[];
  renderActions(state: string, context: Record<string, unknown>): UIActionDefinition[];
  getScreenConfig(state: string): ScreenConfig;

  // Abstract methods to implement
  protected abstract getComponentsForState(...): UIComponent[];
  protected abstract getActionsForState(...): UIActionDefinition[];
  protected abstract getScreenConfiguration(...): ScreenConfig;
}
```

### MoveBookingStateRenderer Example

Located in [`apps/api/src/modules/ui-composer/strategies/move-booking-renderer.ts`](apps/api/src/modules/ui-composer/strategies/move-booking-renderer.ts):

```typescript
@Injectable()
export class MoveBookingStateRenderer extends AbstractStateRenderer {
  readonly contextType = 'MOVE_BOOKING';

  // State transitions: DRAFT → ESTIMATE_REQUESTED → OPTIONS_PRESENTED
  //                 → BOOKING_CONFIRMED → DRIVER_ASSIGNED
  //                 → IN_PROGRESS → COMPLETED

  protected getComponentsForState(
    state: string,
    context: Record<string, unknown>
  ): UIComponent[] {
    switch (state) {
      case 'draft':
        return this.getDraftComponents(context);
      case 'estimate_requested':
        return this.getEstimateRequestedComponents(context);
      case 'options_presented':
        return this.getOptionsPresentedComponents(context);
      // ... other states
      default:
        return this.getDefaultComponents(context);
    }
  }

  protected getActionsForState(
    state: string,
    context: Record<string, unknown>
  ): UIActionDefinition[] {
    switch (state) {
      case 'draft':
        return [
          {
            id: 'request_quote',
            label: 'Get Quote',
            capability: 'move:booking:request_quote',
            style: 'primary',
          },
        ];
      // ... other states
      default:
        return [];
    }
  }
}
```

---

## 6. Integration with Capability System

Located in [`apps/api/src/modules/ui-composer/services/ui-composer.service.ts`](apps/api/src/modules/ui-composer/services/ui-composer.service.ts):

### Capability Filtering Flow

```typescript
async compose(request: UIComposeRequest): Promise<UIResponse> {
  // 1. Get process state from WorkflowEngine
  const processContext = await this.getProcessContext(request);

  // 2. Get actor capabilities
  const actorCapabilities = await this.getActorCapabilities(request.actorId);

  // 3. Get renderer for context type
  const renderer = this.getRenderer(request.contextType);

  // 4. Render components (no capability filtering here)
  const components = renderer.renderComponents(
    processContext.currentState,
    processContext.context
  );

  // 5. Get action definitions
  const actionDefinitions = renderer.renderActions(
    processContext.currentState,
    processContext.context
  );

  // 6. Filter actions by capability (DISABLE only, don't hide)
  const actions = this.filterActionsByCapability(
    actionDefinitions,
    actorCapabilities
  );

  return { screen, metadata, components, actions };
}
```

### Why Actions Are Disabled, Not Hidden

```typescript
private filterActionsByCapability(
  actionDefinitions: UIActionDefinition[],
  actorCapabilities: ActorCapabilities
): UIAction[] {
  return actionDefinitions.map((definition) => {
    const hasCapability = actorCapabilities.capabilities.includes(
      definition.capability
    );

    return {
      id: definition.id,
      label: definition.label,
      capability: definition.capability,
      disabled: !hasCapability,  // Disabled, not hidden!
      disabledReason: hasCapability
        ? undefined
        : `You don't have the required capability: ${definition.capability}`,
      // ... other properties
    };
  });
}
```

**Rationale**: Showing disabled actions with clear reasons:
1. Educates users about available features
2. Provides clear feedback on why actions are unavailable
3. Enables AI agents to understand capability requirements
4. Supports "upgrade" or "request access" workflows

---

## 7. Boundary Explanation

### Why UIComposer Avoids Entanglement

UIComposer is designed as a **pure presentation layer** that reads from other services but never modifies state. This separation:

1. **Enables AI Compatibility**: AI agents can safely query UI state without risk of unintended mutations
2. **Simplifies Testing**: UI composition is a pure function of state + capabilities
3. **Separates Concerns**: UI logic stays in UI layer, business logic in domain
4. **Enables Server-Driven UI**: Frontend can be fully declarative

### What UIComposer CAN Do (Read, Introspect, Declare)

| Capability | Description |
|------------|-------------|
| **Read Process State** | Query WorkflowEngine for current state and context |
| **Read Capabilities** | Query CapabilityAccessController for actor permissions |
| **Declare UI** | Define what components and actions should show |
| **Mark Consent Required** | Indicate which actions require consent |
| **Disable Actions** | Disable (not hide) actions actor can't perform |
| **Provide Metadata** | Include process ID, definition, breadcrumbs in response |

### What UIComposer CANNOT Do (Mutate, Execute, Enforce)

| Restriction | Reason |
|-------------|--------|
| **Cannot Mutate State** | All mutations go through CapabilityOrchestrator |
| **Cannot Execute Commands** | Command execution is isolated in domain layer |
| **Cannot Enforce Capability** | Only reads capabilities, doesn't block access |
| **Cannot Enforce Consent** | Only marks actions requiring consent |
| **Cannot Validate Transitions** | WorkflowEngine handles state transition validation |
| **Cannot Duplicate Business Rules** | Business logic lives in domain handlers |

### How This Separation Enables AI Compatibility

```
┌─────────────────────────────────────────────────────────────┐
│                    AI AGENT WORKFLOW                        │
├─────────────────────────────────────────────────────────────┤
│  1. Query available capabilities                              │
│     GET /capabilities/actor/{actorId}                       │
│                                                             │
│  2. Query current UI state                                   │
│     POST /api/ui/compose { contextType, contextId }        │
│                                                             │
│  3. Understand available actions (with capability reqs)    │
│     → Action: "confirm_booking"                             │
│        Capability: "move:booking:confirm"                  │
│        Disabled: false                                      │
│                                                             │
│  4. If disabled, can explain why                           │
│     → "You don't have capability: move:booking:confirm"    │
│                                                             │
│  5. For mutations, route through Orchestrator              │
│     POST /api/capabilities/execute { capabilityName, ... } │
└─────────────────────────────────────────────────────────────┘
```

### Why CapabilityOrchestrator Remains the ONLY Mutation Entrypoint

Located in [`apps/api/src/modules/capability/services/capability-orchestrator.ts`](apps/api/src/modules/capability/services/capability-orchestrator.ts):

```typescript
export interface ICapabilityOrchestrator {
  execute<T>(request: OrchestrationRequest): Promise<OrchestrationResult<T>>;
  executeBatch<T>(requests: OrchestrationRequest[]): Promise<OrchestrationResult<T>[]>;
  canExecute(request: OrchestrationRequest): Promise<boolean>;
}
```

**Enforcement Points**:

1. **CommandBus Isolation** - InternalCommandBus requires orchestration context
2. **Guard Integration** - CapabilityGuard validates before any endpoint
3. **Audit Requirement** - All mutations emit CapabilityUsedEvent
4. **Single Entry Point** - All write operations flow through Orchestrator

---

## 8. Migration Plan

### From Static Controllers to UIComposer

#### Before: Static Controller

```typescript
@Controller('bookings')
export class BookingController {
  @Get(':id')
  async getBooking(@Param('id') id: string) {
    const booking = await this.bookingService.findById(id);
    return {
      data: booking,
      actions: [
        { label: 'Confirm', url: `/bookings/${id}/confirm` },
        { label: 'Cancel', url: `/bookings/${id}/cancel` },
      ],
    };
  }
}
```

#### After: UIComposer Integration

```typescript
@Controller('ui')
export class UIController {
  constructor(private readonly uiComposer: UIComposerService) {}

  @Post('compose')
  async composeUI(@Body() request: UIComposeRequest) {
    return this.uiComposer.compose(request);
  }
}
```

### Step-by-Step Migration Guide

#### Step 1: Register UIComposer Module

```typescript
// In app.module.ts or feature module
import { UIComposerModule } from './modules/ui-composer/ui-composer.module';

@Module({
  imports: [
    // ... other modules
    UIComposerModule,
  ],
})
export class AppModule {}
```

#### Step 2: Create State Renderer for Context

```typescript
// my-context-renderer.ts
@Injectable()
export class MyContextStateRenderer extends AbstractStateRenderer {
  readonly contextType = 'MY_CONTEXT';

  protected getComponentsForState(
    state: string,
    context: Record<string, unknown>
  ): UIComponent[] {
    // Define components for each state
  }

  protected getActionsForState(
    state: string,
    context: Record<string, unknown>
  ): UIActionDefinition[] {
    // Define actions for each state
  }

  protected getScreenConfiguration(state: string): ScreenConfig {
    // Define screen configs
  }
}
```

#### Step 3: Register Renderer in Module

```typescript
@Module({
  providers: [
    // ... other providers
    MyContextStateRenderer,
  ],
})
export class MyContextModule implements OnModuleInit {
  constructor(private readonly uiComposer: UIComposerService) {}

  onModuleInit() {
    this.uiComposer.registerRenderer(new MyContextStateRenderer());
  }
}
```

#### Step 4: Update Frontend to Use Compose Endpoint

```typescript
// Frontend API service
async function fetchUI(actorId: string, contextType: string, contextId: string) {
  const response = await fetch('/api/ui/compose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actorId, contextType, contextId }),
  });
  return response.json();
}
```

### Breaking Changes

| Change | Impact | Migration |
|--------|--------|-----------|
| Actions now have `disabled` field | Frontend needs to handle disabled state | Add disabled UI styling |
| Actions require capability metadata | Backend must provide capability info | Ensure capabilities have metadata |
| State determines UI | Frontend no longer controls UI logic | Remove client-side state handling |

### Timeline Recommendations

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Deploy UIComposer alongside existing endpoints | 2 weeks |
| Phase 2 | Create renderers for high-traffic contexts | 2-3 weeks |
| Phase 3 | Migrate frontend to use compose endpoint | 2 weeks |
| Phase 4 | Deprecate old endpoints | 1 week |
| Phase 5 | Remove old endpoints | 1 week |

---

## 9. Risk Analysis

### Potential Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Renderer Not Found** | UI composition fails | Provide default renderer with error state |
| **WorkflowEngine Unavailable** | Can't get process state | Cache last known state; show stale indicator |
| **Capability Service Slow** | UI response delayed | Redis cache with 5-min TTL |
| **Missing Capability Metadata** | Consent flags incorrect | Default to conservative (require consent) |
| **Renderer Logic Error** | Wrong components shown | Comprehensive unit tests per state |

### Performance Considerations

#### Caching Strategy

```typescript
// In CapabilityAccessController
@Cacheable('capabilities', 300) // 5-minute TTL
async getCapabilitiesForActor(actorId: string): Promise<string[]> {
  // Query from database
}
```

#### Response Caching

```typescript
// Consider caching UIResponse for read-heavy scenarios
// Cache key: `${actorId}:${contextType}:${contextId}:${state}`
// Invalidate on state transition
```

#### Performance Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| UI Compose Latency | < 100ms | > 500ms |
| Component Registry Lookup | < 5ms | > 50ms |
| Capability Check | < 20ms | > 100ms |

### Security Implications

| Concern | Mitigation |
|---------|------------|
| **Actor ID Spoofing** | Validate actor from auth token, not request body |
| **Context ID Enumeration** | Verify actor has access to context before responding |
| **Capability Enumeration** | Rate limit capability queries |
| **Sensitive Data Exposure** | Filter context data based on actor's data access permissions |

### Fallback Strategy

```typescript
async compose(request: UIComposeRequest): Promise<UIResponse> {
  try {
    // Normal flow
    return await this.composeInternal(request);
  } catch (error) {
    // Fallback for errors
    if (error instanceof NotFoundException) {
      return this.getFallbackResponse(request);
    }
    throw error;
  }
}

private getFallbackResponse(request: UIComposeRequest): UIResponse {
  return {
    screen: 'fallback',
    metadata: {
      title: 'Unable to Load',
      error: 'The requested content is not available',
    },
    components: [],
    actions: [],
  };
}
```

---

## 10. Future Extension Strategy

### Mobile-Specific Rendering

```typescript
export interface UIComposeOptions {
  // Existing options...
  
  /** Device type for responsive rendering */
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  
  /** Screen size for precise layout */
  screenSize?: {
    width: number;
    height: number;
  };
}
```

**Implementation Pattern**:

```typescript
// In StateRenderer
getComponentsForState(
  state: string,
  context: Record<string, unknown>,
  options?: UIComposeOptions
): UIComponent[] {
  if (options?.deviceType === 'mobile') {
    return this.getMobileComponents(state, context);
  }
  return this.getDesktopComponents(state, context);
}
```

### Admin UI Composition

Create separate renderers for admin contexts:

```typescript
@Injectable()
export class AdminBookingRenderer extends AbstractStateRenderer {
  readonly contextType = 'ADMIN_BOOKING';

  // Admin-specific components and actions
  // Includes: override status, refund payment, reassign driver
}
```

### AI Agent Integration Patterns

```typescript
// AI Agent queries
interface AIQueryRequest {
  actorId: string;
  query: string;  // "What can I do with this booking?"
  contextType: string;
  contextId: string;
}

interface AIQueryResponse {
  availableActions: UIAction[];
  contextSummary: string;
  recommendations: string[];
}
```

**Agent Workflow**:
1. Query `/api/ui/compose` for current UI state
2. Analyze `actions` array for permitted operations
3. For mutations, call `/api/capabilities/execute`
4. Refetch UI after mutation to get updated state

### Plugin Architecture

```typescript
// Plugin interface for extending UIComposer
export interface UIComposerPlugin {
  name: string;
  version: string;
  
  // Hooks
  beforeCompose?(request: UIComposeRequest): Promise<void>;
  afterCompose?(response: UIResponse): Promise<UIResponse>;
  transformComponent?(component: UIComponent): UIComponent;
}
```

### Version Migration for UIResponse Schema

When evolving the UIResponse schema:

```typescript
// Version header in response
interface UIResponse {
  version: '1.0.0';  // Schema version
  // ... rest of response
}

// Migration utility
function migrateResponse(response: UIResponse, targetVersion: string): UIResponse {
  if (response.version === targetVersion) {
    return response;
  }
  
  // Apply migrations sequentially
  let migrated = response;
  while (migrated.version !== targetVersion) {
    migrated = applyMigration(migrated);
  }
  return migrated;
}
```

---

## 11. Testing

### Unit Test Example

Located in [`apps/api/src/modules/ui-composer/tests/unit/ui-composer.service.spec.ts`](apps/api/src/modules/ui-composer/tests/unit/ui-composer.service.spec.ts):

```typescript
describe('UIComposerService', () => {
  let service: UIComposerService;
  let mockWorkflowEngine: jest.Mocked<WorkflowEngineService>;
  let mockCapabilityController: jest.Mocked<CapabilityAccessController>;

  beforeEach(() => {
    // Setup mocks
  });

  describe('compose', () => {
    it('should compose UI for valid request', async () => {
      mockWorkflowEngine.getProcessState.mockResolvedValue({
        instanceId: '123',
        definitionId: 'move-booking',
        currentState: 'draft',
        context: { pickupAddress: 'A', dropoffAddress: 'B' },
        status: 'active',
      });

      mockCapabilityController.getCapabilitiesForActor.mockResolvedValue([
        'move:booking:create',
      ]);

      const result = await service.compose({
        actorId: 'actor-1',
        contextType: 'MOVE_BOOKING',
        contextId: '123',
      });

      expect(result.screen).toBe('move-booking-create');
      expect(result.components.length).toBeGreaterThan(0);
    });

    it('should disable actions actor lacks capability for', async () => {
      // ... test capability filtering
    });
  });
});
```

### Running Tests

```bash
# Unit tests
npm run test -- --testPathPattern=ui-composer

# Integration tests
docker-compose -f docker-compose.test.yml up -d
npm run test:integration -- --testPathPattern=ui-composer
```

---

## 12. Summary

The UIComposer provides a declarative, server-driven UI composition layer that:

| Feature | Implementation |
|---------|----------------|
| **State-Based Rendering** | Strategy pattern with StateRenderers |
| **Capability Integration** | Read-only capability filtering |
| **Component Library** | 30+ predefined components |
| **AI Compatibility** | Stateless queries, clear boundaries |
| **Mutation Safety** | All writes route through CapabilityOrchestrator |

### Key Architectural Decisions

1. **Separation of Concerns**: UI logic in UIComposer, business logic in domain
2. **Capability Filtering**: Actions disabled (not hidden) for transparency
3. **State-Driven**: UI determined by process state, not client code
4. **Read-Only Integration**: UIComposer never mutates, only reads

### Integration Points

```
UIComposer ──────▶ WorkflowEngine (read process state)
UIComposer ──────▶ CapabilityAccessController (read capabilities)
UIComposer ◀───── ComponentRegistry (get component definitions)
UIComposer ──────▶ CapabilityOrchestrator (mutation redirect)
```

All changes maintain the event-driven architecture while enabling server-driven UI patterns.

---

## Related Documentation

- [Capability Architecture](docs/capability-architecture.md)
- [Workflow Engine Documentation](docs/workflow-architecture.md)
- [Event-Driven Architecture](docs/event-driven-architecture.md)
