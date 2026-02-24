# Job Orchestration System - Structural Audit Report

**Audit Date:** 2026-02-24
**Auditor:** Senior Platform Architect
**System:** ZanaFleet Multi-Tenant Job Orchestration Platform

---

## Executive Summary

This audit identifies implicit job-like entities, hardcoded vertical assumptions, and repeated conditional logic across the ZanaFleet codebase. The goal is to determine what should become a first-class `JobType` abstraction without overengineering.

**Key Finding:** The system has **4 distinct implicit job types** that share 60-70% behavioral patterns but are implemented as separate entities. A minimal `JobType` abstraction is both feasible and necessary for maintainability.

---

## PHASE 1: Implicit Type Discovery

### A. Identified Job-Like Entities

| Entity           | Module         | Workflow Engine       | Assignment Logic    | Policy Constraints   | UI Assumptions |
| ---------------- | -------------- | --------------------- | ------------------- | -------------------- | -------------- |
| **Delivery**     | `delivery/`    | ✅ State machine      | ✅ Rider matching   | ✅ Policy evaluation | Tracking page  |
| **Order**        | `order/`       | ❌ Basic status       | ❌ None             | ❌ None              | Order list     |
| **Commitment**   | `commitments/` | ✅ Status transitions | ❌ None             | ❌ None              | Task list      |
| **Move Request** | `movers/`      | ✅ Process definition | ✅ Vehicle matching | ✅ Policy engine     | Quote flow     |

### B. Entity Details

#### 1. Delivery Entity

**File:** `apps/api/src/modules/delivery/entities/delivery.entity.ts`

**Required Fields:**

- `id`, `businessId`, `workspaceId`, `status`
- `pickupLocationId`, `dropoffLocationId`
- `recipientName`, `recipientPhone`

**Optional Fields:**

- `assignedRiderId`, `externalOrderId`
- `scheduledPickupTime`, `scheduledDropoffTime`
- `slaPickupBy`, `slaDropoffBy`, `slaBreachedAt`
- `trackingCode`, `trackingUrl`, `visibilityToken`

**Workflow:** `delivery-lifecycle.coordinator.ts` implements state machine:

```
Requested → Assigned → PickedUp → InTransit → Delivered
                  ↓
              Cancelled (from any non-terminal state)
```

**Assignment Logic:** `delivery-matching.coordinator.ts`

- Proximity-based candidate selection
- Radius expansion with retry
- Saco fairness enforcement
- Vehicle type matching

**Policy Constraints:**

- Policy evaluation triggers: `PolicyTrigger.DELIVERY_ASSIGNMENT`
- Context includes: `deliveryId`, `riderId`, `businessId`, `saccoId`

---

#### 2. Order Entity

**File:** `apps/api/src/modules/order/entities/order.entity.ts`

**Required Fields:**

- `id`, `businessId`, `workspaceId`, `status`

**Optional Fields:**

- `deliveryId`, `customerId`, `customerName`, `customerPhone`
- `itemSummary`, `itemMetadata` (JSONB)
- `scheduledTime`, `totalAmount`, `currency`
- `paymentStatus`

**Workflow:** None (simple status enum)

- States: `Pending` → `Confirmed` → `Fulfilled`/`Cancelled`

**Assignment Logic:** None (delegates to Delivery)

**Policy Constraints:** None at order level

---

#### 3. Commitment Entity

**File:** `apps/api/src/modules/commitments/entities/commitment.entity.ts`

**Required Fields:**

- `id`, `actorId`, `workspaceId`, `type`, `status`
- `description`, `dueAt`

**Optional Fields:**

- `fulfilledAt`, `breachedAt`

**Workflow:** `update-commitment-status.handler.ts`

```
Pending → Fulfilled/Breached/Cancelled
```

**Assignment Logic:** None (actor-centric, not assigned)

**Policy Constraints:** None

---

#### 4. Move Request (Movers Module)

**File:** `apps/api/src/modules/movers/orchestrators/movers-quote.orchestrator.ts`

**Required Fields:**

- Move profile, house size, inventory list

**Optional Fields:**

- Vehicle capability requirements
- Scheduling preferences
- Media insight snapshots

**Workflow:** `move-booking.process.ts`

```
EstimateRequested → OptionsPresented → BookingConfirmed
→ PaymentAuthorized → DriverAssigned → InProgress → Completed
```

**Assignment Logic:** `vehicle-matching.service.ts`

- Vehicle type matching
- Capability-based filtering

**Policy Constraints:** Uses policy engine for booking confirmation

---

### C. Overlap Patterns

| Pattern                          | Delivery | Order | Commitment | Move Request |
| -------------------------------- | -------- | ----- | ---------- | ------------ |
| **Status Enum**                  | ✅       | ✅    | ✅         | ✅           |
| **Timestamps (created/updated)** | ✅       | ✅    | ✅         | ✅           |
| **Workspace Scoping**            | ✅       | ✅    | ✅         | ✅           |
| **Business/Organization**        | ✅       | ✅    | ❌         | ✅           |
| **Scheduled Time**               | ✅       | ✅    | ✅         | ✅           |
| **State Machine Transitions**    | ✅       | ❌    | ✅         | ✅           |
| **Actor Assignment**             | ✅ Rider | ❌    | ✅ Actor   | ✅ Driver    |
| **SLA/Due Date**                 | ✅       | ❌    | ✅         | ✅           |
| **Policy Evaluation**            | ✅       | ❌    | ❌         | ✅           |
| **Event Emission**               | ✅       | ✅    | ✅         | ✅           |
| **Neo4j Projection**             | ✅       | ✅    | ✅         | ✅           |

**Overlap Score:** 60-70% common patterns

---

## PHASE 2: Hardcoded Assumption Audit

### A. Entity Type Branches

The codebase shows limited type branching (mostly handled via polymorphism), but the following locations contain entity-type-specific logic:

| Location                                 | Assumption                                                               | Classification        |
| ---------------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| `policy.types.ts:29-36`                  | `EvaluationContext` has `deliveryId`, `riderId`, `businessId`, `saccoId` | **Vertical-Specific** |
| `delivery-matching.coordinator.ts:20-26` | `MatchingCandidate` has `vehicleType`                                    | **Vertical-Specific** |
| `assignment-rules.service.ts:35-64`      | Scheduling based on pickup/dropoff times                                 | **Vertical-Specific** |

### B. Delivery-Specific Assumptions

| Assumption                | Location                              | Classification          |
| ------------------------- | ------------------------------------- | ----------------------- |
| Single pickup location    | `delivery.entity.ts:29-30`            | **Vertical-Specific**   |
| Single dropoff location   | `delivery.entity.ts:32-33`            | **Vertical-Specific**   |
| Single assigned rider     | `delivery.entity.ts:36-37`            | **Accidental Coupling** |
| Rider-to-delivery 1:1     | `assign-rider-to-delivery.handler.ts` | **Accidental Coupling** |
| SLA pickup/dropoff fields | `delivery.entity.ts:87-95`            | **Vertical-Specific**   |
| Tracking code/url         | `delivery.entity.ts:97-105`           | **Vertical-Specific**   |

### C. Single-Worker / Single-Destination Assumptions

1. **Single Rider Assignment** - `delivery.entity.ts`

   ```typescript
   @Column('uuid', { nullable: true })
   assignedRiderId!: string | null;
   ```

   - Currently enforces 1:1 rider-to-delivery
   - **Not an invariant** - could be extended to multi-rider crews

2. **Single Destination** - `dropoffLocationId` field
   - No support for multi-stop deliveries
   - **Vertical assumption** - food delivery may need this

### D. Classification Summary

| Category                       | Count | Examples                                    |
| ------------------------------ | ----- | ------------------------------------------- |
| **Fundamental Invariants**     | 2     | Workspace scoping, event emission           |
| **Vertical-Specific Behavior** | 8     | Rider matching, SLA tracking, vehicle types |
| **Accidental Coupling**        | 3     | Single rider, single destination            |

---

## PHASE 3: Abstraction Feasibility

### A. Configurable Workflow Definitions

| Area                    | Status   | Details                                                      |
| ----------------------- | -------- | ------------------------------------------------------------ |
| **Process Definition**  | ✅ Ready | `process-definition.entity.ts` - Stores workflow as entities |
| **Process Transitions** | ✅ Ready | `process-transition.entity.ts` - Declarative transitions     |
| **Trigger Types**       | ✅ Ready | Event-driven, scheduled, manual triggers                     |

**Score:** ✅ **Ready for abstraction**

---

### B. Strategy-Like Assignment Patterns

| Pattern             | Location                           | Extensibility                    |
| ------------------- | ---------------------------------- | -------------------------------- |
| Rider Matching      | `delivery-matching.coordinator.ts` | Interface-based (can extract)    |
| Candidate Selection | `candidate-selection.service.ts`   | Geo-point based                  |
| Assignment Rules    | `assignment-rules.service.ts`      | Pure functions, already reusable |

**Score:** ⚠️ **Requires light refactor** - Extract `AssignmentStrategy` interface

---

### C. Policy Injection Points

| Area                  | Status     | Details                                                |
| --------------------- | ---------- | ------------------------------------------------------ |
| **Policy Engine**     | ✅ Ready   | `policy-evaluation-engine.service.ts`                  |
| **Guard Conditions**  | ✅ Ready   | `process-transition.entity.ts` uses `GuardType.POLICY` |
| **Context Structure** | ⚠️ Partial | `policy.types.ts` - Hardcoded to delivery context      |

**Score:** ⚠️ **Requires light refactor** - Make `EvaluationContext` generic

---

### D. Metadata Extensibility

| Entity       | JSONB Fields   | Flexibility |
| ------------ | -------------- | ----------- |
| Delivery     | None           | Low         |
| Order        | `itemMetadata` | Medium      |
| Commitment   | None           | Low         |
| Move Request | Multiple       | High        |

**Score:** ⚠️ **Requires light refactor** - Add `metadata` JSONB to all job entities

---

### E. UI Rendering Flexibility

| Entity       | Controller                 | View Assumptions        |
| ------------ | -------------------------- | ----------------------- |
| Delivery     | `deliveries.controller.ts` | Tracking page, map view |
| Order        | `orders.controller.ts`     | Order list              |
| Commitment   | API-only                   | Task checklist          |
| Move Request | `movers.controller.ts`     | Quote wizard            |

**Score:** ❌ **Requires heavy refactor** - Controllers need unified response DTOs

---

## PHASE 4: Minimal JobType Boundary

### What MUST Become Part of JobType (Core)

```typescript
// Minimal JobType interface - what MUST be abstracted
interface JobType {
  // Identity
  id: string;
  workspaceId: string;
  organizationId?: string;

  // Status & Lifecycle
  status: JobStatus;
  previousStatus?: JobStatus;
  statusChangedAt?: Date;

  // Scheduling
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  dueAt?: Date;

  // Assignment
  assigneeId?: string;
  assigneeType?: 'rider' | 'driver' | 'actor';

  // Extensibility
  metadata?: Record<string, unknown>;

  // Common timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

### What MUST Remain in Core Job Entity

| Field                    | Reason                                         |
| ------------------------ | ---------------------------------------------- |
| `id`                     | Primary key                                    |
| `workspaceId`            | Multi-tenant isolation (fundamental invariant) |
| `status`                 | Base status enum                               |
| `createdAt`, `updatedAt` | Audit trail                                    |
| `metadata`               | Extensibility                                  |

---

### What MUST Remain Workspace-Scoped

- **Policy Evaluation** - Workspace-level rules
- **Workflow Definitions** - Process definitions are workspace-specific
- **Assignment Rules** - Matching algorithms configured per workspace

---

### What MUST Remain Policy-Scoped

- **Guard Conditions** - Policy evaluation for state transitions
- **Assignment Policies** - Rider matching fairness rules
- **SLA Policies** - Time-based constraints

---

### What SHOULD NOT Be Abstracted (Yet)

1. **Delivery-specific tracking** - Tracking codes, URLs, visibility tokens
2. **Vehicle types** - Move request specific
3. **Commitment breach detection** - Different SLA semantics
4. **Order payment integration** - Separate domain concern

---

## Recommended Minimal Evolution

### Implementation Priority

| Priority | Change                                             | Effort |
| -------- | -------------------------------------------------- | ------ |
| **P0**   | Add `metadata` JSONB field to Delivery, Commitment | 1 day  |
| **P0**   | Create `JobType` base interface in contracts       | 2 days |
| **P1**   | Extract `AssignmentStrategy` interface             | 3 days |
| **P1**   | Generic `EvaluationContext` in policy module       | 2 days |
| **P2**   | Create `JobProjection` base for Neo4j              | 3 days |
| **P2**   | Unified job query controller                       | 5 days |

---

## Conclusion

The system is **ready for a minimal JobType abstraction**. The key insight is that:

1. **60-70% overlap** exists between job-like entities
2. **Workflow and policy infrastructure** is already generic enough
3. **Assignment logic** can be extracted with interface refactoring
4. **UI flexibility** requires separate effort (deferred)

**Recommendation:** Implement `JobType` as a composition pattern rather than inheritance. Each existing entity (Delivery, Order, Commitment) extends JobType via composition, gaining:

- Common status lifecycle
- Metadata extensibility
- Policy engine integration
- Event emission patterns

The vertical-specific features (rider matching, vehicle types) remain in their respective modules and are composed as needed.
