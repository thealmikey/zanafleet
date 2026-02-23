# ZanaFleet Tenant Isolation Implementation Plan

## Executive Summary

**Critical Security Gap Identified:** The platform has MAJOR tenant isolation vulnerabilities. Multiple controllers bypass workspace scoping, allowing cross-tenant data access.

**Risk Level:** CRITICAL - Immediate action required before production launch.

---

## PHASE 1: CODE INTROSPECTION RESULTS

### 1.1 Entities WITH workspaceId (13 entities) ✅

| Entity | Column | Required | File |
|--------|--------|----------|------|
| ActorEntity | workspaceId | Nullable | actor/entities/actor.entity.ts |
| NotificationEntity | workspaceId | Yes | communication/entities/notification.entity.ts |
| TemplateEntity | workspaceId | Nullable | communication/entities/template.entity.ts |
| PreferenceEntity | workspaceId | Nullable | communication/entities/preference.entity.ts |
| CommitmentEntity | workspaceId | Yes | commitments/entities/commitment.entity.ts |
| EvidenceEntity | workspaceId | Yes | evidence/entities/evidence.entity.ts |
| SearchDocumentEntity | workspaceId | Yes | search/entities/search-document.entity.ts |
| CapabilityAuditEntity | workspaceId | Nullable | capability/entities/capability-audit.entity.ts |
| PolicyDecisionLogEntity | workspaceId | Yes | policy/entities/policy-decision-log.entity.ts |
| MembershipEntity | workspaceId | Yes (composite) | workspace/entities/membership.entity.ts |
| WorkspaceEntity | id (is tenant) | Yes | workspace/entities/workspace.entity.ts |
| ActorPersonaEntity | workspaceId | Yes | persona/entities/actor-persona.entity.ts |
| SignUpSessionEntity | workspaceIds[] | Yes (array) | signup/entities/signup-session.entity.ts |

### 1.2 Entities MISSING workspaceId (CRITICAL) ❌

| Entity | Current FK | Tenant Scoping | Priority |
|--------|------------|----------------|----------|
| **OrderEntity** | businessId | NONE - CRITICAL | P0 |
| **DeliveryEntity** | businessId | NONE - CRITICAL | P0 |
| **BusinessEntity** | none | NONE | P0 |
| **CustomerEntity** | businessId | businessId only | P0 |
| **RiderEntity** | saccoId | sacco → workspace | P1 |
| **SaccoEntity** | none | NONE | P1 |
| WalletEntity | ownerId | owner → workspace | P2 |
| TransactionEntity | walletId | wallet → owner → workspace | P2 |
| AssetEntity | ownerId | owner → workspace | P2 |
| TripEntity | assetId | asset → owner → workspace | P2 |

### 1.3 Major Tenant Isolation Bypasses Found 🚨

#### CRITICAL: OrdersController - No Tenant Isolation

```typescript
// File: apps/api/src/modules/order/controllers/orders.controller.ts

// Line 78 - findOne: NO workspaceId filter!
async findOne(@Param('id') id: string): Promise<...> {
  const entity = await this.orderRepository.findOne({ where: { id } });
  // ^ Returns ANY order by ID - cross-tenant vulnerability!
}

// Lines 106-111 - findAll: NO workspaceId filter!
const [entities, total] = await this.orderRepository.findAndCount({
  where,
  order,
  skip: pagination.offset,
  take: pagination.limit,
});
// ^ Returns ALL orders from ALL workspaces!
```

#### CRITICAL: DeliveriesController - Similar Issues

```typescript
// File: apps/api/src/modules/delivery/controllers/deliveries.controller.ts

// Line 244-245 - findAll: NO workspaceId filter!
const [entities, total] = await this.deliveryRepository.findAndCount({
  where: filter,
  // ^ Returns ALL deliveries from ALL workspaces!
});
```

### 1.4 JWT Structure (Already Has workspaceId) ✅

```typescript
// File: apps/api/src/modules/auth/strategies/jwt.strategy.ts

export interface JwtPayload {
  sub: string;       // actorId
  email: string;
  workspaceId: string;  // ✅ Already in JWT!
  tenant_id?: string;
  roles: string[];
}
```

The JWT already contains `workspaceId`. The problem is that controllers/services don't USE it.

---

## PHASE 2: TENANT ISOLATION STRATEGY

### 2.1 Chosen Strategy: Column-Based with Repository Enforcement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TENANT ISOLATION LAYERS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 1: JWT Claims (workspaceId from Keycloak)                           │
│    ↓ Contains: req.user.workspaceId                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 2: TenantScopedRepository<T> (NEW)                                  │
│    ↓ Auto-injects workspaceId into ALL queries                             │
│    ↓ Methods: findScoped(), findOneScoped(), etc.                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 3: Entity workspaceId column (NEW on critical entities)             │
│    ↓ OrderEntity, DeliveryEntity, BusinessEntity get workspaceId          │
├─────────────────────────────────────────────────────────────────────────────┤
│  Layer 4: Database Index (workspaceId + businessId compound indexes)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Why This Strategy?

| Strategy | Security | Ergonomics | Migration | Bypass Risk |
|----------|----------|------------|-----------|--------------|
| Neo4j-only | ⭐⭐⭐ | ⭐⭐ | Low | HIGH |
| Column-only | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | High | LOW |
| Repository abstraction | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Medium | VERY LOW |
| **Chosen: Column + Repository** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Medium | **VERY LOW** |

### 2.3 Enforcement Rules

1. **Never accept workspaceId from client input** - Must come from JWT
2. **All tenant-scoped entities MUST have workspaceId column**
3. **All repository queries MUST go through TenantScopedRepository**
4. **Services receive workspaceId via Request context, not parameters**

---

## PHASE 3: CODE CHANGES REQUIRED

### 3.1 Add workspaceId to Critical Entities

#### OrderEntity - Add workspaceId

```typescript
// File: apps/api/src/modules/order/entities/order.entity.ts

@Entity('orders')
@Index(['businessId'])
@Index(['workspaceId'])  // NEW
@Index(['status'])
export class OrderEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  businessId!: string;

  @Column('uuid')  // NEW - REQUIRED
  workspaceId!: string;
  
  // ... rest of fields
}
```

#### DeliveryEntity - Add workspaceId

```typescript
// File: apps/api/src/modules/delivery/entities/delivery.entity.ts

@Entity({ name: 'deliveries' })
@Index('IDX_deliveries_business_id')
@Index('IDX_deliveries_workspace_id')  // NEW
export class DeliveryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  businessId!: string;

  @Column('uuid')  // NEW - REQUIRED
  workspaceId!: string;
  
  // ... rest of fields
}
```

#### BusinessEntity - Add workspaceId

```typescript
// File: apps/api/src/modules/business/entities/business.entity.ts

@Entity('businesses')
@Unique('UQ_business_phone', ['phone'])
@Index(['businessType'])
@Index(['workspaceId'])  // NEW
export class BusinessEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  businessName!: string;

  @Column('uuid')  // NEW - REQUIRED
  workspaceId!: string;
  
  // ... rest of fields
}
```

#### CustomerEntity - Add workspaceId

```typescript
// File: apps/api/src/modules/customer/entities/customer.entity.ts

@Entity('customers')
@Index(['businessId'])
@Index(['workspaceId'])  // NEW
@Index(['phoneNumber'])
export class CustomerEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  businessId!: string;

  @Column('uuid')  // NEW - REQUIRED
  workspaceId!: string;
  
  // ... rest of fields
}
```

### 3.2 Create TenantScopedRepository Base Class

```typescript
// File: apps/api/src/core/database/tenant-scoped.repository.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import {
  Repository,
  FindOptionsWhere,
  FindOptionsSelect,
  FindOptionsRelations,
  DeepPartial,
  SelectQueryBuilder,
} from 'typeorm';
import { TenantAware } from '../interfaces/tenant-aware.interface';

/**
 * TenantScopedRepository<T>
 * 
 * Base repository that enforces workspaceId filtering on ALL queries.
 * All tenant-scoped entities MUST use this repository.
 * 
 * Usage:
 * ```typescript
 * @EntityRepository(OrderEntity)
 * export class OrderRepository extends TenantScopedRepository<OrderEntity> {
 *   // Custom methods
 * }
 * ```
 */
@Injectable()
export abstract class TenantScopedRepository<T extends TenantAware> 
  extends Repository<T> {

  /**
   * MUST be called before any query operation.
   * Throws if workspaceId is not provided.
   */
  protected validateWorkspaceId(workspaceId: string | null | undefined): string {
    if (!workspaceId) {
      throw new BadRequestException(
        'Tenant isolation violation: workspaceId is required for all queries'
      );
    }
    return workspaceId;
  }

  /**
   * Find one entity scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async findOneScoped(
    workspaceId: string,
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    options?: {
      select?: FindOptionsSelect<T>;
      relations?: FindOptionsRelations<T>;
    }
  ): Promise<T | null> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.findOne({
      where: {
        ...where,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
      ...options,
    });
  }

  /**
   * Find many entities scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async findScoped(
    workspaceId: string,
    options?: {
      where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
      select?: FindOptionsSelect<T>;
      relations?: FindOptionsRelations<T>;
      order?: Record<string, 'ASC' | 'DESC'>;
      skip?: number;
      take?: number;
    }
  ): Promise<T[]> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.find({
      where: {
        ...options?.where,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
      select: options?.select,
      relations: options?.relations,
      order: options?.order,
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Find and count scoped to workspace.
   * AUTO-INJECTS workspaceId filter.
   */
  async findAndCountScoped(
    workspaceId: string,
    options?: {
      where?: FindOptionsWhere<T> | FindOptionsWhere<T>[];
      select?: FindOptionsSelect<T>;
      relations?: FindOptionsRelations<T>;
      order?: Record<string, 'ASC' | 'DESC'>;
      skip?: number;
      take?: number;
    }
  ): Promise<[T[], number]> {
    const ws = this.validateWorkspaceId(workspaceId);
    return this.findAndCount({
      where: {
        ...options?.where,
        workspaceId: ws,
      } as FindOptionsWhere<T>,
      select: options?.select,
      relations: options?.relations,
      order: options?.order,
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * CreateQueryBuilder with workspaceId auto-injected.
   * USE THIS for complex queries.
   */
  createScopedQueryBuilder(
    workspaceId: string,
    alias: string,
    additionalConditions?: Record<string, unknown>
  ): SelectQueryBuilder<T> {
    const ws = this.validateWorkspaceId(workspaceId);
    let query = this.createQueryBuilder(alias)
      .where(`"${alias}"."workspace_id" = :workspaceId`, { workspaceId: ws });

    if (additionalConditions) {
      Object.entries(additionalConditions).forEach(([key, value]) => {
        query = query.andWhere(`"${alias}"."${key}" = :${key}`, { [key]: value });
      });
    }

    return query;
  }

  /**
   * Save with workspaceId auto-injected.
   */
  async saveScoped(
    workspaceId: string,
    entity: DeepPartial<T>
  ): Promise<T> {
    const ws = this.validateWorkspaceId(workspaceId);
    const entityToSave = {
      ...entity,
      workspaceId: ws,
    } as DeepPartial<T>;
    return this.save(entityToSave);
  }
}
```

### 3.3 Create TenantAware Interface

```typescript
// File: apps/api/src/core/interfaces/tenant-aware.interface.ts

/**
 * Interface that all tenant-scoped entities must implement.
 * Ensures entities have a workspaceId column for tenant isolation.
 */
export interface TenantAware {
  workspaceId: string;
}

/**
 * Interface for entities that can be scoped by businessId
 * (which maps to workspace via Neo4j)
 */
export interface BusinessScoped {
  businessId: string;
}
```

### 3.4 Refactor OrdersController to Use Tenant Isolation

```typescript
// File: apps/api/src/modules/order/controllers/orders.controller.ts

@Controller('orders')
@UseGuards(CapabilityGuard)
export class OrdersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly customerOrderOrchestrator: CustomerOrderOrchestrator,
    @InjectRepository(OrderEntity)
    private readonly orderRepository: TenantScopedRepository<OrderEntity>
  ) { }

  // Extract workspaceId from JWT - use @Request decorator
  private getWorkspaceId(@Req() req: any): string {
    return req.user?.workspaceId;
  }

  @Get(':id')
  @RequireCapability('order.manage')
  async findOne(
    @Param('id') id: string,
    @Req() req: any
  ): Promise<ReturnType<OrderEntity['toDomain']>> {
    const workspaceId = this.getWorkspaceId(req);
    
    // NOW SCOPED - throws if workspaceId not provided
    const entity = await this.orderRepository.findOneScoped(workspaceId, { id });
    
    if (!entity) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return entity.toDomain();
  }

  @Get()
  async findAll(
    @Query() query: RawQueryParams,
    @Req() req: any
  ): Promise<{
    data: ReturnType<OrderEntity['toDomain']>[];
    meta: ReturnType<typeof createPaginationMeta>;
  }> {
    const workspaceId = this.getWorkspaceId(req);
    const { pagination, sort, filter } = parseQueryParams(query);

    const order = sort ? { [sort.field]: sort.order } : undefined;

    const search = query.search as string;
    let where: Record<string, unknown> | Record<string, unknown>[] = filter;

    if (search) {
      where = [
        { ...filter, customerName: ILike(`%${search}%`) },
        { ...filter, customerPhone: ILike(`%${search}%`) },
        { ...filter, itemSummary: ILike(`%${search}%`) },
      ];
    }

    // NOW SCOPED - auto-filters by workspaceId
    const [entities, total] = await this.orderRepository.findAndCountScoped(
      workspaceId,
      {
        where,
        order,
        skip: pagination.offset,
        take: pagination.limit,
      }
    );

    return {
      data: entities.map((e) => e.toDomain()),
      meta: createPaginationMeta(pagination, total),
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireCapability('order.manage')
  async create(
    @Body() dto: CreateOrderDto,
    @Req() req: any
  ): Promise<{ id: string }> {
    const workspaceId = this.getWorkspaceId(req);
    
    const validated: CreateOrderCommandInput = CreateOrderCommand.validate({
      ...dto,
      workspaceId,  // Inject workspaceId from JWT
    });
    
    const id = await this.commandBus.execute<CreateOrderCommand, string>(
      new CreateOrderCommand(validated)
    );
    return { id };
  }
}
```

### 3.5 Refactor DeliveriesController Similarly

```typescript
// File: apps/api/src/modules/delivery/controllers/deliveries.controller.ts

// Similar changes - use findAndCountScoped, findOneScoped
// Extract workspaceId from JWT, inject into all queries
```

---

## PHASE 4: UNIT TESTS REQUIRED

### 4.1 Test: Cross-Workspace Data Cannot Be Accessed

```typescript
// File: apps/api/src/modules/order/tests/unit/tenant-isolation.spec.ts

describe('Order Tenant Isolation', () => {
  let orderRepository: TenantScopedRepository<OrderEntity>;
  
  beforeEach(() => {
    orderRepository = new OrderRepositoryMock();
  });

  it('should only return orders for the given workspace', async () => {
    // Arrange
    const workspaceA = 'workspace-a-uuid';
    const workspaceB = 'workspace-b-uuid';
    
    // Act & Assert
    const ordersA = await orderRepository.findScoped(workspaceA, {});
    const ordersB = await orderRepository.findScoped(workspaceB, {});
    
    // Verify no overlap
    expect(ordersA).not.toEqual(expect.arrayContaining(ordersB));
  });

  it('should throw error when workspaceId is missing', async () => {
    await expect(
      orderRepository.findScoped(null as any, {})
    ).rejects.toThrow('workspaceId is required');
  });

  it('should not allow accessing other workspace orders by ID', async () => {
    const workspaceA = 'workspace-a-uuid';
    const orderFromWorkspaceB = 'order-from-workspace-b';
    
    const result = await orderRepository.findOneScoped(
      workspaceA, 
      { id: orderFromWorkspaceB }
    );
    
    expect(result).toBeNull();
  });
});
```

### 4.2 Test: Repository Methods Enforce Isolation

```typescript
describe('TenantScopedRepository Enforcement', () => {
  it('findOneScoped must inject workspaceId', async () => { /* ... */ });
  it('findScoped must inject workspaceId', async () => { /* ... */ });
  it('findAndCountScoped must inject workspaceId', async () => { /* ... */ });
  it('createQueryBuilder must include workspaceId filter', async () => { /* ... */ });
  it('saveScoped must inject workspaceId', async () => { /* ... */ });
});
```

### 4.3 Test: Controllers Use JWT workspaceId

```typescript
describe('OrdersController Tenant Isolation', () => {
  it('findOne must use req.user.workspaceId', async () => { /* ... */ });
  it('findAll must use req.user.workspaceId', async () => { /* ... */ });
  it('create must inject workspaceId into command', async () => { /* ... */ });
});
```

---

## PHASE 5: IMPLEMENTATION CHECKLIST

### Priority 0 (CRITICAL - Before Launch)

- [ ] Add workspaceId column to OrderEntity
- [ ] Add workspaceId column to DeliveryEntity  
- [ ] Add workspaceId column to BusinessEntity
- [ ] Add workspaceId column to CustomerEntity
- [ ] Create TenantScopedRepository base class
- [ ] Create TenantAware interface
- [ ] Refactor OrdersController to use TenantScopedRepository
- [ ] Refactor DeliveriesController to use TenantScopedRepository
- [ ] Add unit tests for tenant isolation

### Priority 1 (Important)

- [ ] Add workspaceId column to RiderEntity
- [ ] Add workspaceId column to SaccoEntity
- [ ] Refactor RidersController
- [ ] Refactor SaccosController
- [ ] Refactor CustomersController

### Priority 2 (Later)

- [ ] Add workspaceId to WalletEntity
- [ ] Add workspaceId to TransactionEntity
- [ ] Add workspaceId to AssetEntity
- [ ] Add workspaceId to TripEntity

---

## RISK SUMMARY

### If Left Unaddressed:

| Risk | Impact | Likelihood |
|------|--------|------------|
| Cross-tenant data breach | CRITICAL - Data leak | HIGH |
| Compliance violation | CRITICAL - GDPR/PDPA | HIGH |
| Customer data exposure | CRITICAL - Legal liability | HIGH |
| Platform trust erosion | HIGH - Reputation damage | MEDIUM |

### After Implementation:

| Risk | Impact | Likelihood |
|------|--------|------------|
| Performance (extra index) | LOW - Minimal | LOW |
| Migration complexity | MEDIUM - Manageable | LOW |
| Breaking changes | LOW - Additive only | LOW |

---

## CONCLUSION

The platform has sufficient JWT infrastructure (workspaceId in JWT). The gap is purely in the repository/controller layer not using the workspaceId for filtering.

**Recommended Action:** Implement the plan above in Priority 0 order before any production launch with external tenants.