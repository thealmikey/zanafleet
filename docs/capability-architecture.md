# ZanaFleet Capability System Architecture

This document describes the enhanced capability system architecture for ZanaFleet, including the new orchestration layer, audit trail, and mutation safety enforcement.

## Overview

The capability system has been enhanced to provide:

1. **Capability Access Controller** - Concrete implementation with caching
2. **Capability Introspection Layer** - Query APIs for AI/UI consumption
3. **Capability Usage Audit** - Complete audit trail
4. **Capability Orchestrator** - Central mutation entrypoint
5. **Mutation Safety Enforcement** - Architectural boundaries
6. **AI & Server-Driven UI Readiness** - Declarative metadata
7. **Observability & Idempotency** - Tracing and reliability

---

## 1. Capability Access Controller

### Interface

Located in [`apps/api/src/core/api/guards/capability.guard.ts`](apps/api/src/core/api/guards/capability.guard.ts):

```typescript
export interface ICapabilityAccessController {
  hasCapability(actorId: string, capabilityName: string): Promise<boolean>;
}
```

### Concrete Implementation

Located in [`apps/api/src/modules/capability/services/capability-access.controller.ts`](apps/api/src/modules/capability/services/capability-access.controller.ts):

- Checks actor capabilities via persona relationships
- Uses PostgreSQL for data access
- Redis caching with 5-minute TTL
- Methods:
  - `hasCapability()` - Single capability check
  - `hasCapabilities()` - Multiple capability checks
  - `hasAllCapabilities()` - All must pass
  - `hasAnyCapability()` - Any can pass
  - `getCapabilitiesForActor()` - List all capabilities

### Integration with Guard

The `CapabilityGuard` now uses the concrete implementation:

```typescript
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(CAPABILITY_ACCESS_CONTROLLER)
    private readonly capabilityAccessController: ICapabilityAccessController
  ) {}
}
```

---

## 2. Capability Introspection Layer

### Extended Entity

The `CapabilityEntity` now includes metadata:

```typescript
@Entity('capabilities')
export class CapabilityEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category!: string | null;

  @Column({ type: 'boolean', default: false })
  requiresConsent!: boolean;

  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
  version!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;
}
```

### Query Handlers

Located in [`apps/api/src/modules/capability/queries/capability.query-handlers.ts`](apps/api/src/modules/capability/queries/capability.query-handlers.ts):

- `GetAllCapabilitiesQuery` - List with filtering/pagination
- `GetCapabilityByIdQuery` - Single by ID
- `GetCapabilityByNameQuery` - Single by name
- `GetActorCapabilitiesQuery` - All for an actor
- `GetCapabilitiesByCategoryQuery` - Filter by category
- `GetCapabilitiesRequiringConsentQuery` - Consent-required only

### REST Endpoints

Located in [`apps/api/src/modules/capability/controllers/capability.controller.ts`](apps/api/src/modules/capability/controllers/capability.controller.ts):

```
GET    /capabilities                 - List all capabilities
GET    /capabilities/:id            - Get by ID
GET    /capabilities/name/:name      - Get by name
GET    /capabilities/actor/:actorId - Get actor's capabilities
GET    /capabilities/category/:cat  - Get by category
GET    /capabilities/consent/required - Consent-required
GET    /capabilities/me/capabilities - Current user's capabilities
```

---

## 3. Capability Usage Audit

### Event

Located in [`apps/api/src/modules/capability/events/capability-used.event.ts`](apps/api/src/modules/capability/events/capability-used.event.ts):

```typescript
export class CapabilityUsedEventV1 {
  // Actor info
  actorId: string;
  actorType?: string;

  // Capability info
  capabilityName: string;
  capabilityId?: string;

  // Context
  contextId?: string;
  contextType?: string;
  workspaceId?: string;

  // Result
  result: CapabilityExecutionResult; // SUCCESS | DENIED | FAILED | CONSENT_REQUIRED
  reason?: string;

  // Tracing
  correlationId?: string;
  causationId?: string;
  executionTimeMs?: number;
}
```

### Audit Entity

Located in [`apps/api/src/modules/capability/entities/capability-audit.entity.ts`](apps/api/src/modules/capability/entities/capability-audit.entity.ts):

```typescript
@Entity('capability_audit_log')
export class CapabilityAuditEntity {
  // Composite indexes for query performance
  @Index('capability_audit_composite_index', [
    'actorId', 'workspaceId', 'capabilityName', 'createdAt'
  ])
}
```

### Audit Service

Located in [`apps/api/src/modules/capability/projections/capability-audit.projection.ts`](apps/api/src/modules/capability/projections/capability-audit.projection.ts):

```typescript
@Injectable()
export class CapabilityAuditService {
  // Query methods
  findByActor(actorId: string, limit?: number): Promise<CapabilityAuditEntity[]>;
  findByCapability(capabilityName: string, limit?: number): Promise<CapabilityAuditEntity[]>;
  findByWorkspace(workspaceId: string, limit?: number): Promise<CapabilityAuditEntity[]>;
  findByCorrelationId(correlationId: string): Promise<CapabilityAuditEntity[]>;
  findDeniedAttempts(limit?: number): Promise<CapabilityAuditEntity[]>;
  getUsageStats(capabilityName: string): Promise<Stats>;
}
```

---

## 4. Capability Orchestrator

Located in [`apps/api/src/modules/capability/services/capability-orchestrator.ts`](apps/api/src/modules/capability/services/capability-orchestrator.ts):

### Interface

```typescript
export interface ICapabilityOrchestrator {
  execute<T>(request: OrchestrationRequest): Promise<OrchestrationResult<T>>;
  executeBatch<T>(requests: OrchestrationRequest[]): Promise<OrchestrationResult<T>[]>;
  canExecute(request: OrchestrationRequest): Promise<boolean>;
}
```

### Orchestration Flow

The orchestrator performs 5 steps:

1. **Capability Check** - Via `ICapabilityAccessController`
2. **Consent Check** - Via Policy module (if required)
3. **Domain Command** - Execute via `CommandBus`
4. **Workflow Validation** - Validate state transitions
5. **Audit Event** - Emit `CapabilityUsedEvent`

### Usage Example

```typescript
@Controller('bookings')
export class BookingController {
  constructor(private readonly orchestrator: CapabilityOrchestrator) {}

  @Post(':id/confirm')
  async confirmBooking(
    @Param('id') bookingId: string,
    @Body() dto: ConfirmBookingDto,
    @Req() req: { user: User }
  ) {
    const result = await this.orchestrator.execute({
      capabilityName: 'booking_confirm',
      actorId: req.user.id,
      actorType: 'user',
      workspaceId: req.user.workspaceId,
      contextId: bookingId,
      contextType: 'Booking',
      command: new ConfirmBookingCommand(bookingId, dto),
    });

    if (!result.success) {
      throw new ForbiddenException(result.error);
    }

    return result.data;
  }
}
```

---

## 5. Mutation Safety Enforcement

Located in [`apps/api/src/core/command-bus/internal-command-bus.service.ts`](apps/api/src/core/command-bus/internal-command-bus.service.ts):

### InternalCommandBus

```typescript
@Injectable()
export class InternalCommandBus {
  async execute(command: ICommand, options?: {
    correlationId?: string;
    skipCapabilityCheck?: boolean;
    actorId?: string;
  }): Promise<unknown>;
}
```

### Strategy

1. **CommandBus Isolation** - Mark `CommandBus` as internal
2. **Orchestrator as Gateway** - All mutations go through orchestrator
3. **Audit by Default** - InternalCommandBus logs all executions
4. **Lint Rules** - Detect direct CommandBus usage in controllers

### Migration Steps

1. Identify controllers using `CommandBus` directly
2. Replace with `CapabilityOrchestrator.execute()`
3. Ensure capability is checked before command execution
4. Verify audit events are emitted

---

## 6. AI & Server-Driven UI Readiness

### Metadata Structure

The capability entity includes:

```typescript
interface CapabilityMetadata {
  description?: string;      // Human-readable
  category?: string;         // For grouping
  requiresConsent?: boolean; // Consent gating
  version?: string;          // Schema version
  [key: string]: unknown;    // Extensible
}
```

### Query Contract for UIComposer

```typescript
// Get available capabilities for actor in context
GET /capabilities/actor/:actorId
GET /capabilities/me/capabilities

// Response
{
  "actorId": "uuid",
  "capabilities": [
    "booking_create",
    "booking_confirm",
    "booking_cancel"
  ],
  "count": 3
}
```

### AI Integration

AI agents can query:

1. **List all capabilities** - `/capabilities`
2. **Get by category** - `/capabilities/category/delivery`
3. **Actor's capabilities** - `/capabilities/actor/:id`
4. **Metadata** - `/capabilities/name/:name` (returns description, version, etc.)

---

## 7. Observability & Idempotency

### Logging Pattern

All orchestrator executions include:

```typescript
{
  orchestrationId: string;     // Unique per execution
  correlationId: string;       // For tracing
  capabilityName: string;
  actorId: string;
  executionTimeMs: number;
  result: 'success' | 'denied' | 'failed';
}
```

### Correlation ID Flow

1. Generate at API gateway or first service
2. Pass through orchestration
3. Include in all events (correlationId)
4. Include in all commands (metadata)
5. Queryable in audit logs

### Idempotency Strategy

1. **Event-level** - Use `IdempotencyService` for event handling
2. **Orchestrator-level** - Each execution has unique orchestrationId
3. **Audit-level** - Query by correlationId to detect duplicates

---

## Migration Guide

### Step 1: Update CapabilityModule

```typescript
// Import the enhanced module
import { CapabilityModule } from '@api/modules/capability';

// In your module
imports: [
  CapabilityModule,  // Already exports all needed services
]
```

### Step 2: Migrate Controllers

**Before:**
```typescript
@Controller('bookings')
export class BookingController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':id/confirm')
  async confirm(@Param('id') id: string) {
    await this.commandBus.execute(new ConfirmBookingCommand(id));
  }
}
```

**After:**
```typescript
@Controller('bookings')
export class BookingController {
  constructor(private readonly orchestrator: CapabilityOrchestrator) {}

  @Post(':id/confirm')
  async confirm(@Param('id') id: string, @Req() req) {
    const result = await this.orchestrator.execute({
      capabilityName: 'booking_confirm',
      actorId: req.user.id,
      contextId: id,
      contextType: 'Booking',
      command: new ConfirmBooking });

    if (!Command(id),
   result.success) {
      throw new ForbiddenException(result.error);
    }
  }
}
```

### Step 3: Add Capability Metadata

When creating capabilities:

```typescript
await this.commandBus.execute(new CreateCapabilityCommand({
  name: 'booking_confirm',
  description: 'Allows confirming a booking',
  category: 'delivery',
  requiresConsent: false,
  version: '1.0.0',
}));
```

---

## File Structure

```
apps/api/src/modules/capability/
├── capability.module.ts              # Enhanced module
├── controllers/
│   └── capability.controller.ts      # Introspection endpoints
├── dto/
│   └── capability.dto.ts             # Read DTOs
├── entities/
│   ├── capability.entity.ts          # Extended entity
│   ├── capability-audit.entity.ts   # Audit entity
│   └── persona-capability.entity.ts
├── events/
│   ├── capability-created.event.ts
│   ├── capability-granted-to-persona.event.ts
│   └── capability-used.event.ts     # NEW: Usage audit event
├── handlers/
│   ├── create-capability.handler.ts
│   └── grant-capability-to-persona.handler.ts
├── projections/
│   ├── capability-audit.projection.ts  # NEW: Audit projection
│   ├── capability-neo4j.projection.ts
│   └── capability-grant-neo4j.projection.ts
├── queries/
│   └── capability.query-handlers.ts    # NEW: Introspection queries
├── repositories/
│   └── capability.repository.ts          # NEW: Data access
└── services/
    ├── capability-access.controller.ts  # NEW: Concrete implementation
    └── capability-orchestrator.ts       # NEW: Orchestration layer

apps/api/src/core/command-bus/
└── internal-command-bus.service.ts     # NEW: Mutation safety
```

---

## Testing

Run the full CI pipeline:

```bash
npm run ci:all
```

This executes:
- Linting
- Unit tests
- Integration tests
- Type checking
- Coverage

---

## Summary

The enhanced capability system provides:

| Feature | Purpose |
|---------|---------|
| Access Controller | Capability checking with caching |
| Introspection | AI/UI query support |
| Audit Trail | Complete usage history |
| Orchestrator | Central mutation gateway |
| Safety Enforcement | Architectural boundaries |
| Metadata | Declarative capabilities |
| Observability | Tracing & idempotency |

All changes maintain CQRS and event-driven architecture while preserving existing guards and patterns.
