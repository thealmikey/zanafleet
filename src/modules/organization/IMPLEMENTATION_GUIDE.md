# Organization Module - Implementation Guide

## Quick Start

### 1. Copy Module to Your Project
```bash
# Module is generated in: src/modules/organization/
# Directory structure is complete and ready to use
```

### 2. Update `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { OrganizationModule } from './modules/organization';
import { OrganizationEntity } from './modules/organization';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'zanafleet',
        entities: [OrganizationEntity],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
      }),
    }),
    CqrsModule,
    OrganizationModule,
  ],
})
export class AppModule {}
```

### 3. Install Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/cqrs @nestjs/typeorm typeorm pg uuid zod
npm install --save-dev @nestjs/testing jest @types/jest ts-jest
```

### 4. Create Environment File (`.env`)

```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=zanafleet
NODE_ENV=development
```

### 5. Run Database Migration

```bash
npx typeorm migration:run -d ormconfig.ts
```

### 6. Start Application

```bash
npm run start:dev
```

---

## File Structure

```
src/modules/organization/
│
├── dto/
│   ├── organization.enums.ts          # Enums: Type, Status
│   └── create-organization.dto.ts     # Data Transfer Objects
│
├── commands/
│   └── create-organization.command.ts # Command + Zod validation
│
├── events/
│   └── organization-created.event.ts  # OrganizationCreatedEvent-V1
│
├── entities/
│   └── organization.entity.ts         # TypeORM entity (Postgres)
│
├── handlers/
│   └── create-organization.handler.ts # CommandHandler
│
├── projections/
│   └── organization-neo4j.projection.ts # Neo4j projection handler
│
├── tests/
│   ├── unit/
│   │   └── create-organization.command.spec.ts
│   └── integration/
│       └── create-organization.integration.spec.ts
│
├── organization.module.ts              # Module definition
├── index.ts                            # Barrel export
├── README.md                           # Module documentation
└── DEPENDENCIES.md                     # Dependencies & config
```

---

## Code Flow Example

### 1. Controller → Command (Example)

```typescript
import { Controller, Post, Body, HttpCode, BadRequestException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { CreateOrganizationCommand, OrganizationType, OrganizationStatus } from 'src/modules/organization';
import { ZodError } from 'zod';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(201)
  async createOrganization(
    @Body() payload: {
      name: string;
      type: OrganizationType;
      status: OrganizationStatus;
      linkedWallets?: string[];
    },
  ) {
    try {
      // Create command (validates input)
      const command = new CreateOrganizationCommand(payload);
      
      // Execute command
      const organizationId = await this.commandBus.execute(command);

      return {
        success: true,
        organizationId,
        message: 'Organization created successfully',
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          success: false,
          errors: error.errors,
        });
      }
      throw error;
    }
  }
}
```

### 2. Handler Flow (Automatic)

```
CreateOrganizationCommand
  ↓
CreateOrganizationCommandHandler.execute()
  ↓ Create entity
CreateOrganizationEntity
  ↓ Save to PostgreSQL
Save to Repository
  ↓ Create event
OrganizationCreatedEventV1
  ↓ Publish to event bus
EventBus.publish(event)
  ↓ (NATS publishes to event stream)
Neo4j Projection Handler (automatic)
  ↓
Create/Update Organization node
```

### 3. Complete Request-Response Flow

```
HTTP POST /organizations
  {
    "name": "Nairobi SACCO",
    "type": "SACCO",
    "status": "active",
    "linkedWallets": ["550e8400-..."]
  }
        ↓
OrganizationController.createOrganization()
        ↓
CreateOrganizationCommand constructor validates with Zod
        ↓
CommandBus.execute(command)
        ↓
CreateOrganizationCommandHandler.execute()
  • Generate UUIDs
  • Create OrganizationEntity
  • Save to PostgreSQL
  • Create OrganizationCreatedEventV1
  • Emit event to NATS
        ↓
EventBus publishes event
        ↓
[Parallel Processing]
  • Neo4j Projection (creates Organization node)
  • Any other event subscribers
        ↓
Return organizationId to HTTP response
        ↓
HTTP 201 Created
  {
    "success": true,
    "organizationId": "550e8400-...",
    "message": "Organization created successfully"
  }
```

---

## Testing

### Unit Test Example

```typescript
describe('CreateOrganizationCommand', () => {
  it('should validate correct input', () => {
    const input = {
      name: 'Valid Organization',
      type: 'SACCO',
      status: 'active',
    };

    // Should not throw
    const command = new CreateOrganizationCommand(input);
    expect(command.name).toBe('Valid Organization');
  });

  it('should reject empty name', () => {
    expect(() => {
      new CreateOrganizationCommand({
        name: '',
        type: 'SACCO',
        status: 'active',
      });
    }).toThrow();
  });
});
```

### Run Tests

```bash
# All tests
npm test

# Only Organization module
npm test -- src/modules/organization

# Unit tests only
npm test -- src/modules/organization/tests/unit

# Integration tests only
npm test -- src/modules/organization/tests/integration

# With coverage
npm test -- --coverage src/modules/organization
```

---

## Validation Examples

### Valid Command

```typescript
const command = new CreateOrganizationCommand({
  name: 'Nairobi Transport SACCO',
  type: OrganizationType.SACCO,
  status: OrganizationStatus.ACTIVE,
  linkedWallets: [
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001',
  ],
});

// Result: OrganizationId generated, saved to DB, event emitted
```

### Invalid Type (Zod Validation Error)

```typescript
try {
  new CreateOrganizationCommand({
    name: 'Test Organization',
    type: 'InvalidType', // ❌ Not in enum
    status: 'active',
  });
} catch (error) {
  // ZodError thrown
  // Message: "Organization type must be one of: SACCO, Business, Platform, Internal"
}
```

### Invalid Wallet UUID

```typescript
try {
  new CreateOrganizationCommand({
    name: 'Test Organization',
    type: OrganizationType.SACCO,
    status: OrganizationStatus.ACTIVE,
    linkedWallets: ['not-a-uuid'], // ❌ Invalid UUID
  });
} catch (error) {
  // ZodError thrown
  // Message: "Each wallet ID must be a valid UUID"
}
```

### Safe Validation (No Exception)

```typescript
const result = CreateOrganizationCommand.safeValidate({
  name: 'Test',
  type: 'InvalidType',
  status: 'active',
});

if (!result.success) {
  console.log('Validation errors:', result.error.errors);
  // [{
  //   code: 'invalid_enum_value',
  //   path: ['type'],
  //   message: 'Organization type must be one of: SACCO, Business, Platform, Internal'
  // }]
} else {
  const command = new CreateOrganizationCommand(result.data);
}
```

---

## Database Verification

### Check PostgreSQL

```bash
# Connect to database
psql -U postgres -d zanafleet

# List tables
\dt

# Check organizations table
\d organizations

# Query organizations
SELECT * FROM organizations;
```

### Check Neo4j

```bash
# Connect to Neo4j console (localhost:7474)
# Or use Cypher queries:

MATCH (org:Organization)
RETURN org.id, org.name, org.type, org.status

# With indexes
SHOW INDEXES

# With constraints
SHOW CONSTRAINTS
```

---

## Troubleshooting

### 1. "Cannot find module 'OrganizationModule'"

**Solution**: Ensure module is imported in `app.module.ts`
```typescript
import { OrganizationModule } from 'src/modules/organization';

@Module({
  imports: [OrganizationModule],
})
```

### 2. "ValidationError: Organization type must be one of..."

**Solution**: Use correct enum value
```typescript
import { OrganizationType } from 'src/modules/organization';

// Correct
const command = new CreateOrganizationCommand({
  type: OrganizationType.SACCO, // ✅
});

// Incorrect
const command = new CreateOrganizationCommand({
  type: 'sacco', // ❌ Case-sensitive
});
```

### 3. "Database connection failed"

**Solution**: Check environment variables and database is running
```bash
# Verify connection
psql -U postgres -h localhost -d zanafleet

# Check env file
cat .env | grep DB_
```

### 4. "TypeORM - Column type 'uuid' not supported"

**Solution**: Ensure PostgreSQL adapter (not SQLite)
```typescript
// app.module.ts
TypeOrmModule.forRoot({
  type: 'postgres', // ✅ Not 'sqlite'
  // ...
})
```

### 5. "Neo4j driver connection failed"

**Solution**: Ensure Neo4j is running and configured
```bash
# Check Neo4j connection
cypher-shell -u neo4j -p password "RETURN 1"

# Verify env variables
cat .env | grep NEO4J_
```

---

## Performance Optimization

### 1. Database Indexes

Already implemented in entity:
```typescript
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
```

Query examples:
```typescript
// Fast - indexed
WHERE status = 'active'
WHERE type = 'SACCO'
WHERE createdAt > '2024-01-01'

// Slow - not indexed
WHERE name LIKE '%test%'
```

### 2. Event Bus Performance

NATS is highly optimized for:
- Millions of messages/second
- Low latency (microseconds)
- Automatic failover
- Persistent queues

### 3. Neo4j Projection Batching

Future optimization:
```typescript
// Instead of immediate projection
// Batch updates for high-throughput scenarios
await this.neo4j.batch(events);
```

---

## Security Checklist

- ✅ Input validation with Zod
- ✅ UUID (cryptographically random IDs)
- ✅ Immutable events (no tampering)
- ✅ Database constraints (UNIQUE, NOT NULL)
- ✅ Timestamps for audit trail
- ✅ Error handling (no sensitive data in logs)

---

## Next Steps

1. **Import OrganizationModule** into your app.module.ts
2. **Run migrations** to create database tables
3. **Run tests** to verify setup
4. **Create controller** to expose HTTP API
5. **Add more modules** following same pattern

---

## Additional Resources

- [NestJS CQRS Documentation](https://docs.nestjs.com/recipes/cqrs)
- [TypeORM Documentation](https://typeorm.io/)
- [Zod Documentation](https://zod.dev/)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)

---

**Version**: 1.0.0  
**Status**: Production-Ready  
**Last Updated**: 2024
