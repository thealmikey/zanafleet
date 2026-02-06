# Organization Module

## Overview

The Organization module is a fully-featured NestJS CQRS implementation for managing organizations in ZanaFleet. It demonstrates the event-driven architecture pattern with command handlers, events, PostgreSQL persistence, and Neo4j graph projections.

## Architecture

```
Command → Validation → Handler → Persistence (Postgres) → Event Emission → Projections (Neo4j)
```

### Components

#### 1. **DTOs** (`dto/`)
- `organization.enums.ts` - Enums for type and status
- `create-organization.dto.ts` - Data transfer objects

**Enums:**
- `OrganizationType`: SACCO, Business, Platform, Internal
- `OrganizationStatus`: active, suspended, pilot, legacy

#### 2. **Commands** (`commands/`)
- `create-organization.command.ts`
  - Zod schema validation
  - Input validation with detailed error messages
  - Type-safe command creation

**Features:**
- Validates organization name (1-255 chars)
- Validates enum values
- Validates wallet UUIDs
- Provides safe and throwing validation methods

#### 3. **Events** (`events/`)
- `organization-created.event.ts` - **OrganizationCreatedEvent-V1**
  - Append-only event (immutable)
  - Deterministic payload
  - Event versioning with -V1 suffix
  - Serialization/deserialization support
  - Correlation tracking

**Event Contract:**
```typescript
{
  eventId: UUID,
  eventType: 'OrganizationCreatedEvent-V1',
  eventVersion: '1.0.0',
  aggregateId: organizationId,
  aggregateType: 'Organization',
  occurredAt: timestamp,
  organizationId: UUID,
  name: string,
  type: enum,
  status: enum,
  linkedWallets: UUID[],
  createdAt: timestamp,
  correlationId?: UUID,
  causationId?: UUID
}
```

#### 4. **Entities** (`entities/`)
- `organization.entity.ts` - TypeORM entity for PostgreSQL
  - UUID primary key
  - Indexed columns (status, type, createdAt)
  - Timestamps (createdAt, updatedAt)
  - Array type for linkedWallets

#### 5. **Command Handlers** (`handlers/`)
- `create-organization.handler.ts`
  - Executes CreateOrganizationCommand
  - Persists to PostgreSQL
  - Emits OrganizationCreatedEvent-V1
  - Error handling and logging

**Flow:**
1. Receive validated command
2. Generate UUIDs (organizationId, eventId)
3. Create entity from command
4. Save to PostgreSQL
5. Create and publish event to NATS

#### 6. **Neo4j Projections** (`projections/`)
- `organization-neo4j.projection.ts`
  - Event handler for OrganizationCreatedEvent-V1
  - Creates/updates Organization nodes
  - Maintains graph constraints and indexes

**Node Structure:**
```cypher
(:Organization {
  id: UUID,
  name: string,
  type: enum,
  status: enum,
  createdAt: datetime,
  updatedAt: datetime,
  linkedWallets: [UUID]
})
```

**Constraints:**
- UNIQUE constraint on `id`
- Indexes on: type, status, createdAt

#### 7. **Tests** (`tests/`)

**Unit Tests** (`unit/create-organization.command.spec.ts`):
- Command creation with valid/invalid inputs
- Zod schema validation
- All enum values
- Edge cases (min/max length, empty arrays, multiple wallets)
- Safe validation method

**Integration Tests** (`integration/create-organization.integration.spec.ts`):
- Complete command flow (command → persistence → event)
- Database verification
- Event emission verification
- No duplicate events
- Deterministic behavior
- Event immutability
- Serialization/deserialization

## Usage

### 1. Import Module

```typescript
import { OrganizationModule } from 'src/modules/organization';

@Module({
  imports: [OrganizationModule],
})
export class AppModule {}
```

### 2. Execute Command

```typescript
import { CommandBus } from '@nestjs/cqrs';
import { CreateOrganizationCommand, OrganizationType, OrganizationStatus } from 'src/modules/organization';

@Injectable()
export class OrganizationService {
  constructor(private readonly commandBus: CommandBus) {}

  async createOrganization(input: {
    name: string;
    type: OrganizationType;
    status: OrganizationStatus;
    linkedWallets?: string[];
  }): Promise<string> {
    // Command validation happens automatically in constructor
    const command = new CreateOrganizationCommand(input);
    return this.commandBus.execute(command);
  }
}
```

### 3. With Error Handling

```typescript
import { CreateOrganizationCommand } from 'src/modules/organization';
import { ZodError } from 'zod';

try {
  const command = new CreateOrganizationCommand(input);
  const organizationId = await this.commandBus.execute(command);
  return { success: true, organizationId };
} catch (error) {
  if (error instanceof ZodError) {
    return {
      success: false,
      errors: error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message,
      }))
    };
  }
  throw error;
}
```

### 4. Safe Validation

```typescript
const result = CreateOrganizationCommand.safeValidate(input);

if (!result.success) {
  console.error('Validation errors:', result.error.errors);
} else {
  const command = new CreateOrganizationCommand(result.data);
  await this.commandBus.execute(command);
}
```

## Database Setup

### PostgreSQL

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  linkedWallets UUID[] DEFAULT ARRAY[]::UUID[],
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_createdAt ON organizations(createdAt);
```

### Neo4j

```cypher
CREATE CONSTRAINT organization_id_unique FOR (org:Organization) REQUIRE org.id IS UNIQUE;
CREATE INDEX organization_type_index FOR (org:Organization) ON (org.type);
CREATE INDEX organization_status_index FOR (org:Organization) ON (org.status);
CREATE INDEX organization_createdAt_index FOR (org:Organization) ON (org.createdAt);
```

## NestJS Configuration

### `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OrganizationModule } from 'src/modules/organization';
import { OrganizationEntity } from 'src/modules/organization';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [OrganizationEntity],
      synchronize: false, // Use migrations in production
      logging: true,
    }),
    CqrsModule,
    OrganizationModule,
  ],
})
export class AppModule {}
```

## Design Principles

### 1. **Event-Driven**
- All state changes are represented as immutable events
- Events are append-only (cannot be modified or deleted)
- Events serve as the source of truth

### 2. **CQRS Pattern**
- **Command**: Intent to change state (CreateOrganizationCommand)
- **Query**: Read operation (planned for future queries)
- **Event**: State change notification (OrganizationCreatedEvent-V1)
- **Handler**: Executes commands and publishes events

### 3. **Deterministic**
- Same input always produces same output
- UUIDs are generated atomically within handler
- Timestamps are captured once at event creation
- No randomness or external dependencies in command validation

### 4. **Idempotent Projections**
- Neo4j uses MERGE for idempotent updates
- Projections can be replayed without side effects
- Safe to re-process events multiple times

### 5. **Validation**
- Input validation at command level (Zod)
- Type safety via TypeScript
- Clear error messages for debugging
- Safe and throwing validation methods

## Testing

### Run Unit Tests

```bash
npm test -- src/modules/organization/tests/unit
```

### Run Integration Tests

```bash
npm test -- src/modules/organization/tests/integration
```

### Run All Tests

```bash
npm test -- src/modules/organization/tests
```

### Test Coverage

```bash
npm test -- --coverage src/modules/organization
```

## Future Phases

### Phase 2: Relationships
- Add relationships: Organization ↔ Workspace
- Add relationships: Organization ↔ Wallet
- Update Neo4j projections to include relationship creation

### Phase 3: Queries
- Implement QueryHandlers for fetching organizations
- Add Neo4j query projections for graph traversal
- Implement filtering and pagination

### Phase 4: Updates
- CreateUpdateOrganizationCommand
- OrganizationUpdatedEvent-V1
- Update handlers and projections

### Phase 5: Deletions (Soft Deletes)
- CreateSuspendOrganizationCommand
- OrganizationSuspendedEvent-V1
- Implement soft delete pattern

## Error Handling

### Command Validation Errors
```typescript
// Invalid type
{
  success: false,
  error: {
    message: "Organization type must be one of: SACCO, Business, Platform, Internal"
  }
}
```

### Database Errors
```typescript
// Duplicate organization ID (caught by UNIQUE constraint)
// Handled in command handler try-catch block
// Logged and re-thrown for API error response
```

### Event Emission Errors
```typescript
// NATS connection failure
// Logged but doesn't block command completion
// Implements eventual consistency pattern
```

## Performance Considerations

1. **Postgres Indexes**: Query organizations by type, status, or creation date
2. **Neo4j Indexes**: Graph traversal performance
3. **Event Bus**: NATS provides high-throughput messaging
4. **Batch Operations**: Support for bulk organization creation (future)

## Monitoring & Observability

### Logging
- Command execution (INFO)
- Database operations (DEBUG)
- Event emission (LOG)
- Error conditions (ERROR)

### Metrics (Future)
- Commands executed count
- Event lag (projection delay)
- Database query times
- Event bus publish times

### Tracing
- correlationId for related events
- causationId for command→event causality
- Distributed tracing support via OpenTelemetry

## Security

1. **Input Validation**: Zod schema prevents injection attacks
2. **UUID Generation**: Cryptographically random IDs
3. **Immutable Events**: Cannot be tampered with after creation
4. **Append-Only Log**: Cannot delete or modify history

## Compliance

- **Audit Trail**: All changes tracked via events
- **Deterministic**: Replay events for consistency verification
- **Idempotent**: Safe to process same event multiple times
- **ACID**: PostgreSQL transactions ensure consistency

---

**Created**: 2024
**Version**: 1.0.0
**Status**: Production-Ready
