# ZanaFleet Vertical Expansion Blueprint
## From Job-Worker Engine to Multi-Vertical Platform

**Document Version:** 1.0
**Date:** 2026-02-23
**Classification:** Architecture Strategic Planning

---

## Executive Summary

This blueprint reveals ZanaFleet's existing canonical engine—a generalized "Job-Worker-Client-Workflow" system already embedded in the codebase—and defines the minimal path to multi-vertical productization. The analysis is grounded entirely in existing code, not aspirational design.

**Core Finding:** ZanaFleet is NOT a delivery platform with extras. It is already a generalized job orchestration engine with specialized domain modules. The delivery, movers, and order modules are merely concrete implementations of a generic pattern.

---

## SECTION 1 — Canonical Engine Extraction

### 1.1 The Hidden Abstraction

Analyzing the codebase reveals a **Job-Worker-Client-Workflow** engine that exists across multiple modules:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ZANAJET CANONICAL ENGINE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐    ┌───────────┐    ┌─────────┐    ┌──────────────────┐    │
│   │ CLIENT  │───▶│   JOB     │◀────│ WORKER │    │   WORKFLOW       │    │
│   │         │    │           │    │         │    │   ENGINE         │    │
│   └─────────┘    └───────────┘    └─────────┘    └──────────────────┘    │
│        │              │               │                   │               │
│        │              │               │                   │               │
│   Business      DeliveryEntity    RiderEntity       ProcessDefinition    │
│   Customer      OrderEntity      DriverEntity      ProcessInstance       │
│   Organization  MoveRequest     Mover             ProcessTransition     │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ SHARED LIFECYCLE PATTERN (Event-Driven)                             │  │
│   │                                                                     │  │
│   │ CREATED ──▶ ASSIGNED ──▶ IN_PROGRESS ──▶ COMPLETED/FAILED          │  │
│   │    │           │              │                  │                  │  │
│   │    ▼           ▼              ▼                  ▼                  │  │
│   │ Events:    Events:         Events:            Events:               │  │
│   │ Created,   Assigned,       PickedUp,          Delivered,            │  │
│   │ Requested  Rejected       InTransit          Failed,               │  │
│   │                                                 Cancelled            │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │ CROSS-CUTTING CONCERNS                                              │  │
│   │                                                                     │  │
│   │ • SLA/Commitment (CommitmentEntity) - Due dates, breaches          │  │
│   │ • Notification (CommunicationModule) - Lifecycle triggers           │  │
│   │ • Payment (Payment/Wallet modules) - Financial settlement          │  │
│   │ • Policy (PolicyModule) - Rules engine for permissions              │  │
│   │ • Assignment (MatchingCoordinator) - Worker-to-Job binding         │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Canonical Model Mapping

The following table maps existing entities to canonical concepts **WITHOUT introducing new entities:**

| Canonical Concept | Delivery Module | Movers Module | Order Module | Asset Module |
|-------------------|-----------------|---------------|--------------|--------------|
| **JOB** | `DeliveryEntity` | MoveRequest (implicit) | `OrderEntity` | `AssetEntity` (for assignment) |
| **WORKER** | `RiderEntity` | Mover (labor profile) | Implicit in delivery | `AssetEntity` (vehicle) |
| **CLIENT** | `BusinessEntity` | Customer (homeowner) | `BusinessEntity` | `BusinessEntity` |
| **WORKFLOW** | `DeliveryLifecycleCoordinator` | Move orchestration | Order→Delivery flow | Asset assignment |
| **ASSIGNMENT** | `assignedRiderId` | Labor assignment | `deliveryId` linking | Asset allocation |
| **NOTIFICATION** | CommunicationModule | CommunicationModule | CommunicationModule | CommunicationModule |
| **SLA** | `slaPickupBy`, `slaDropoffBy` | CommitmentEntity | CommitmentEntity | CommitmentEntity |
| **PAYMENT** | Billing/Ledger modules | Billing/Ledger | Billing/Ledger | Billing/Ledger |

### 1.3 Evidence from Code

**Job Entity Pattern** — [`delivery.entity.ts`](apps/api/src/modules/delivery/entities/delivery.entity.ts):
- `status`: Job state (Requested → Assigned → PickedUp → InTransit → Delivered)
- `assignedRiderId`: Worker binding
- `businessId`: Client reference
- `workspaceId`: Tenant isolation
- SLA columns: `slaPickupBy`, `slaDropoffBy`, `slaBreachedAt`

**Worker Entity Pattern** — [`rider.entity.ts`](apps/api/src/modules/rider/entities/rider.entity.ts):
- `vehicleType`: Capability matching
- `location`: Availability/proximity
- `saccoId`: Organization affiliation
- `workspaceId`: Tenant isolation

**Workflow Engine** — [`workflow.module.ts`](apps/api/src/modules/workflow/workflow.module.ts):
- `ProcessDefinitionEntity`: Workflow blueprints
- `ProcessInstanceEntity`: Runtime instances
- `ProcessTransitionEntity`: State transition rules

**State Machine** — [`delivery-lifecycle.coordinator.ts`](apps/api/src/modules/delivery/coordinators/delivery-lifecycle.coordinator.ts:25-32):
```typescript
const VALID_TRANS, string[]> =ITIONS: Record<string {
  [DeliveryStatus.Requested]: [DeliveryStatus.Assigned, DeliveryStatus.Cancelled],
  [DeliveryStatus.Assigned]: [DeliveryStatus.PickedUp, DeliveryStatus.Cancelled],
  [DeliveryStatus.PickedUp]: [DeliveryStatus.InTransit, DeliveryStatus.Cancelled],
  [DeliveryStatus.InTransit]: [DeliveryStatus.Delivered],
  [DeliveryStatus.Delivered]: [],
  [DeliveryStatus.Cancelled]: [],
};
```

### 1.4 Event Lifecycle Mapping

All job types emit consistent lifecycle events:

| Event Phase | Delivery Events | Movers Events | Generic Pattern |
|-------------|-----------------|---------------|------------------|
| **CREATION** | `DeliveryCreatedEvent` | Implicit in MoveRequest | JobCreatedEvent |
| **ASSIGNMENT** | `RiderAssignedEvent` | LaborAssignedEvent | WorkerAssignedEvent |
| **START** | `PickupConfirmedEvent` | MoveStartedEvent | JobStartedEvent |
| **PROGRESS** | `ProgressUpdatedEvent` | ProgressUpdatedEvent | JobProgressEvent |
| **COMPLETION** | `DropoffConfirmedEvent` | MoveCompletedEvent | JobCompletedEvent |
| **FAILURE** | `DeliveryFailedEvent` | MoveFailedEvent | JobFailedEvent |
| **CANCELLATION** | `DeliveryCancelledEvent` | MoveCancelledEvent | JobCancelledEvent |

---

## SECTION 2 — Vertical Mapping Matrix

### 2.1 Vertical Readiness Analysis

| Vertical | Supported Modules | Missing Pieces | Risk Level | MVP Ready |
|----------|-------------------|----------------|------------|-----------|
| **E-commerce Delivery** | delivery, order, rider, business, wallet, payment | None significant | Low | **YES** |
| **Fleet / Multi-branch** | asset, organization, workspace, policy | Branch-to-branch workflow, fleet utilization dashboards | Medium | **PARTIAL** |
| **Moving Services** | movers, asset (trucks), commitment | Homeowner mobile app, move-specific UI, pricing engine | Medium | **PARTIAL** |
| **Wholesale Distribution** | delivery, order, business, asset | Multi-stop routing, bulk order handling, B2B portal | Medium | **PARTIAL** |
| **Marketplace (Multi-provider)** | rider, sacco, delivery | Provider onboarding, multi-sacco matching, payouts | High | **NO** |

### 2.2 Detailed Vertical Analysis

#### Vertical 1: E-commerce Delivery
- **Already Supports:**
  - [`delivery`](apps/api/src/modules/delivery) - Core job management
  - [`order`](apps/api/src/modules/order) - Order-to-delivery linking
  - [`rider`](apps/api/src/modules/rider) - Worker management
  - [`business`](apps/api/src/modules/business) - Client management
  - [`wallet`](apps/api/src/modules/wallet), [`payment`](apps/api/src/modules/payment) - Payments
- **Missing:** Customer tracking portal (exists in frontend: [`OrderTracking`](apps/web/src/pages/OrderTracking))
- **Customization:** Config-based via workspace settings

#### Vertical 2: Fleet / Multi-branch Logistics
- **Already Supports:**
  - [`asset`](apps/api/src/modules/asset) - Vehicle management
  - [`organization`](apps/api/src/modules/organization) - Multi-org structure
  - [`workspace`](apps/api/src/modules/workspace) - Branch isolation
  - [`policy`](apps/api/src/modules/policy) - Fleet policies
- **Missing:**
  - Inter-branch workflow definitions
  - Fleet utilization metrics dashboard
  - Vehicle assignment to branches
- **Customization:** Requires new domain logic for branch workflows

#### Vertical 3: Moving Services
- **Already Supports:**
  - [`movers`](apps/api/src/modules/movers) - Move profiles, labor estimation
  - [`asset`](apps/api/src/modules/asset) - Truck management (via capacity)
  - [`commitment`](apps/api/src/modules/commitments) - SLAs
- **Missing:**
  - Homeowner customer-facing mobile app
  - Move pricing/quoting engine
  - Packing service workflow
- **Customization:** New UI layer (mobile app), pricing domain logic

#### Vertical 4: Wholesale Distribution
- **Already Supports:**
  - [`delivery`](apps/api/src/modules/delivery) - Multi-stop delivery
  - [`order`](apps/api/src/modules/order) - Bulk orders
  - [`business`](apps/api/src/modules/business) - B2B clients
- **Missing:**
  - Multi-stop route optimization
  - Bulk order aggregation
  - B2B portal with ordering
- **Customization:** Route optimization (new domain), B2B portal (new UI)

#### Vertical 5: Marketplace Model
- **Already Supports:**
  - [`rider`](apps/api/src/modules/rider) - Transport providers
  - [`sacco`](apps/api/src/modules/sacco) - Provider organizations
  - [`delivery`](apps/api/src/modules/delivery) - Job execution
- **Missing:**
    - Multi-sacco matching algorithm
    - Provider payout/settlement (Stripe Connect)
    - Provider onboarding flow
    - Marketplace-specific analytics
- **Customization:** New marketplace domain logic, Stripe Connect integration

---

## SECTION 3 — Product Packaging Strategy

### 3.1 Product Offerings

| Product | Target User | Required Dashboards | Required Mobile | Integrations |
|---------|-------------|---------------------|------------------|---------------|
| **ZanaFleet Delivery OS** | E-commerce businesses, couriers | OperatorDashboard, RiderDashboard, BusinessDashboard | Rider app, Customer tracking | WooCommerce, Stripe |
| **ZanaFleet Fleet Manager** | Logistics companies, enterprises | FleetDashboard, AssetManagement, BranchDashboard | Driver app | GPS systems, ERPs |
| **ZanaFleet Movers** | Moving companies | MoverScheduler, MoveTracking, CustomerPortal | Homeowner app, Mover app | Payment gateway |
| **ZanaFleet Commerce Transport** | Wholesalers, distributors | OrderManagement, RouteOptimization, B2B Portal | Driver app | ERPs, Accounting |
| **ZanaFleet Marketplace** | Platform operators | ProviderManagement, PayoutDashboard, Analytics | Provider app, Customer app | Stripe Connect, Payment |

### 3.2 Existing Frontend Assets

| Existing Page | Vertical Suitability | Customization Needed |
|---------------|---------------------|----------------------|
| [`OperatorDashboard`](apps/web/src/pages/OperatorDashboard) | Delivery, Fleet, Marketplace | Config-based filtering |
| [`RiderDashboard`](apps/web/src/pages/RiderDashboard) | Delivery, Fleet | Job type adaptation |
| [`BusinessDashboard`](apps/web/src/pages/BusinessDashboard) | Delivery, Commerce | Order type adaptation |
| [`AssetManagement`](apps/web/src/pages/AssetManagement) | Fleet, Movers | Asset type filter |
| [`MoversHomePage`](apps/web/src/pages/MoversHomePage) | Movers | Direct use |
| [`RequestDelivery`](apps/web/src/pages/RequestDelivery) | Delivery, Commerce | Job type selector |
| [`OrderTracking`](apps/web/src/pages/OrderTracking) | All verticals | Config-based labels |

### 3.3 Per-Workspace Customization Points

The following can be configured per workspace without code changes:

1. **Job Types:** Extend `DeliveryStatus` enum or create new job type enums
2. **Workflow Stages:** Add/remove states in `VALID_TRANSITIONS`
3. **Notification Templates:** Use [`template.entity.ts`](apps/api/src/modules/communication/entities/template.entity.ts)
4. **SLA Policies:** Configure in [`policy.entity.ts`](apps/api/src/modules/policy/entities/policy.entity.ts)
5. **Branding:** Workspace logo, colors (store in workspace entity)

---

## SECTION 4 — Workspace Customization Layer

### 4.1 Reusing Existing Modules

The customization layer should leverage existing infrastructure:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     WORKSPACE CUSTOMIZATION LAYER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ WORKSPACE ENTITY (Existing)                                         │    │
│  │ • id, orgId, name, type, status                                     │    │
│  │ • roleTemplates[] ──▶ Per-workspace role definitions               │    │
│  │                                                                     │    │
│  │ ADD: config JSONB column                                           │    │
│  │ {                                                                   │    │
│  │   "jobTypes": ["delivery", "move", "pickup"],                     │    │
│  │   "workflowStates": {...},                                          │    │
│  │   "notificationConfig": {...},                                      │    │
│  │   "slaPolicies": {...},                                             │    │
│  │   "branding": {...}                                                 │    │
│  │ }                                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ POLICY MODULE (Existing) - Reuse for SLA & workflow rules          │    │
│  │ • PolicyScope.WORKSPACE                                             │    │
│  │ • PolicyTrigger.ASSIGNMENT, .COMPLETION, .CANCELLATION             │    │
│  │ • conditions ──▶ workspaceId filtering                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ TEMPLATE MODULE (Existing) - Per-workspace notifications           │    │
│  │ • TemplateEntity already has workspaceId                           │    │
│  │ • Add workspace-specific variable substitution                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ WORKFLOW MODULE (Existing) - Process definitions per workspace    │    │
│  │ • ProcessDefinitionEntity already has workspaceId                 │    │
│  │ • Per-workspace state machines                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Implementation: Minimal Additions

**Workspace Configuration Extension** — Add to [`workspace.entity.ts`](apps/api/src/modules/workspace/entities/workspace.entity.ts):

```typescript
// Add to WorkspaceEntity
@Column('jsonb', { nullable: true })
jobTypeConfig!: Record<string, unknown> | null;

@Column('jsonb', { nullable: true })
workflowConfig!: Record<string, unknown> | null;

@Column('jsonb', { nullable: true })
notificationConfig!: Record<string, unknown> | null;

@Column('jsonb', { nullable: true })
slaConfig!: Record<string, unknown> | null;
```

**Why This Works:**
- Tenant isolation preserved (all configs scoped to workspaceId)
- No new tables required
- Uses existing PolicyModule for rule evaluation
- Uses existing TemplateModule for notifications

---

## SECTION 5 — Boundary & Assumption Audit

### 5.1 Hidden Assumptions in Current Codebase

| Assumption | Evidence | Risk if Violated |
|------------|----------|------------------|
| **Jobs are single-worker** | `assignedRiderId` is single UUID in [`delivery.entity.ts:37`](apps/api/src/modules/delivery/entities/delivery.entity.ts:37) | Movers (multi-mover) breaks |
| **Jobs have single destination** | Single `dropoffLocationId` | Multi-stop delivery fails |
| **Workers are individuals** | `RiderEntity` is person-based | Fleet/asset assignment breaks |
| **Pricing is distance-based** | `distanceKm` in delivery input | Flat-rate pricing breaks |
| **Assignment is immediate** | Sync `RiderAssignedEvent` | Batch/auction matching fails |
| **Client is business** | `BusinessEntity` for all clients | Consumer marketplace breaks |

### 5.2 Hardcoded Vertical-Specific Logic

| Location | Hardcoded Assumption | Fix Required |
|----------|----------------------|--------------|
| [`delivery-lifecycle.coordinator.ts:25-32`](apps/api/src/modules/delivery/coordinators/delivery-lifecycle.coordinator.ts:25) | 6-state delivery lifecycle | Extract to configurable workflow |
| [`delivery-matching.coordinator.ts`](apps/api/src/modules/delivery/coordinators/delivery-matching.coordinator.ts) | Single rider matching | Abstract to AssignmentStrategy interface |
| [`movers/domain/move-profile.ts`](apps/api/src/modules/movers/domain/move-profile.ts) | House-size-based pricing | Extract pricing engine |
| [`rider.entity.ts`](apps/api/src/modules/rider/entities/rider.entity.ts:51) | VehicleType enum is fixed | Extend for movers equipment |

### 5.3 Modules at Risk

| Module | Risk if New Vertical Added | Mitigation |
|--------|---------------------------|------------|
| [`delivery`](apps/api/src/modules/delivery) | Hardcoded delivery-specific logic | Abstract to job type handlers |
| [`rider`](apps/api/src/modules/rider) | Rider-specific fields (nationalId, vehicleType) | Extend or create WorkerEntity base |
| [`movers`](apps/api/src/modules/movers) | Already specialized, may need generalization | Keep specialized, use composition |
| [`workflow`](apps/api/src/modules/workflow) | May need multi-tenant process definitions | Already supports workspaceId |

### 5.4 Risks of Over-Generalization

1. **Configuration Complexity:** Too many options → unusable for non-technical operators
2. **Performance:** Generic query paths vs. optimized specific paths
3. **Maintenance:** One-size-fits-all → technical debt accumulation
4. **Security:** Generic assignment → accidental data leaks between verticals

**Recommendation:** Generalize the CORE (assignment, lifecycle, notifications) but keep VERTICALS specialized (pricing, matching algorithms, specific workflows).

---

## SECTION 6 — High-Leverage Additions (Minimal, High ROI)

### 6.1 Recommended Additions

| # | Addition | Strategic Value | Implementation Effort |
|---|----------|-----------------|----------------------|
| **1** | **JobType Registry** | Enables multi-vertical without code duplication. JobType becomes first-class entity that defines workflow, assignment strategy, pricing model. | Medium (new module) |
| **2** | **Assignment Strategy Interface** | Abstracts matching algorithm. Enables: immediate, batch, auction, marketplace matching. Plug-in architecture. | Low (interface + impls) |
| **3** | **Stripe Connect Integration** | Transforms platform to marketplace. Enables multi-provider payouts, platform fees, provider onboarding. | Medium (new module) |
| **4** | **Workspace Feature Flags** | Enables per-workspace vertical selection without code deploys. Gradual rollout, A/B testing. | Low (extend workspace entity) |
| **5** | **Integration Adapter Interface** | Standardizes WooCommerce, ERPs, GPS systems. New integrations via adapter pattern, not custom code. | Medium (interface + adapters) |

### 6.2 JobType Registry Specification

**Purpose:** Make job type a first-class configurable concept.

```typescript
// New: job-type.entity.ts
@Entity('job_types')
export class JobTypeEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar')
  name!: string; // "delivery", "move", "pickup"

  @Column('uuid')
  workspaceId!: string;

  @Column('jsonb')
  workflowDefinition!: {
    states: string[];
    transitions: Record<string, string[]>;
    initialState: string;
    finalStates: string[];
  };

  @Column('jsonb')
  assignmentConfig!: {
    strategy: 'immediate' | 'batch' | 'auction' | 'marketplace';
    workerType: 'individual' | 'team' | 'asset';
    maxAssigned: number;
  };

  @Column('jsonb', { nullable: true })
  pricingConfig!: Record<string, unknown>;
}
```

**Leverage:** Existing [`delivery-lifecycle.coordinator.ts`](apps/api/src/modules/delivery/coordinators/delivery-lifecycle.coordinator.ts) can be refactored to use JobType.workflowDefinition instead of hardcoded VALID_TRANSITIONS.

### 6.3 Assignment Strategy Interface

```typescript
// New: assignment-strategy.interface.ts
export interface AssignmentStrategy {
  assign(job: JobEntity, candidates: WorkerEntity[]): Promise<AssignmentResult>;
  findCandidates(job: JobEntity, filters: WorkerFilters): Promise<WorkerEntity[]>;
}

export class ImmediateAssignmentStrategy implements AssignmentStrategy { }
export class BatchAssignmentStrategy implements AssignmentStrategy { }
export class AuctionAssignmentStrategy implements AssignmentStrategy { }
export class MarketplaceAssignmentStrategy implements AssignmentStrategy { }
```

**Leverage:** Existing [`delivery-matching.coordinator.ts`](apps/api/src/modules/delivery/coordinators/delivery-matching.coordinator.ts) implements ImmediateAssignmentStrategy. Adding marketplace vertical simply adds new strategy implementations.

---

## SECTION 7 — UI/Experience Blueprint

### 7.1 Role → Screen Mapping

| Role | Required Screens | Existing Page | Needed Adjustments |
|------|------------------|---------------|-------------------|
| **Platform Admin** | SystemDashboard, WorkspaceManagement, TenantAudit | None | New: Platform admin pages |
| **Workspace Admin** | WorkspaceSettings, UserManagement, BillingConfig | Settings | Add workspace config UI |
| **Operator/Dispatcher** | JobBoard, AssignmentPanel, Analytics | OperatorDashboard | Configurable job type filter |
| **Rider/Driver** | MyJobs, JobDetails, Earnings | RiderDashboard | Add job type to job card |
| **Customer** | TrackOrder, RequestService, History | OrderTracking, RequestDelivery | Vertical-specific forms |

### 7.2 Dynamic Page Adaptation

The existing pages can adapt per vertical using configuration:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DYNAMIC PAGE ADAPTATION FLOW                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   Page Load                                                                 │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ Get Workspace Config (from workspace.entity)                      │    │
│   │ • jobTypes: ["delivery", "move"]                                   │    │
│   │ • workflowStates: {...}                                            │    │
│   │ • branding: {...}                                                 │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ▼                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │ Apply Configuration to Page                                        │    │
│   │                                                                     │    │
│   │ 1. Filter job type selector based on jobTypes                      │    │
│   │ 2. Map status labels from workflowStates                            │    │
│   │ 3. Apply branding colors from branding                              │    │
│   │ 4. Show/hide fields based on jobType                                │    │
│   │ 5. Configure action buttons from workflow.transitions              │    │
│   └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                     │
│       ▼                                                                     │
│   Rendered Page (vertical-specific but code-shared)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Implementation Pattern

**Example: Dynamic OperatorDashboard**

```typescript
// In OperatorDashboard.tsx
const { workspaceConfig } = useWorkspace();

const visibleJobTypes = workspaceConfig?.jobTypes || ['delivery'];
const statusLabels = workspaceConfig?.workflowStates?.[currentJobType] || DEFAULT_LABELS;

// Filter job list
const filteredJobs = jobs.filter(job => visibleJobTypes.includes(job.type));

// Render with dynamic labels
{filteredJobs.map(job => (
  <JobCard
    type={job.type}
    status={statusLabels[job.status] || job.status}
    actions={getActionsForStatus(job.status, workspaceConfig)}
  />
))}
```

---

## FINAL OUTPUT

### 1. Canonical Engine Diagram (Text-Based)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ZANAJET CANONICAL ENGINE v1.0                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐              │
│  │     CLIENT    │    │      JOB      │    │    WORKER     │              │
│  │               │    │               │    │               │              │
│  │ Business      │───▶│ Delivery      │◀───│ Rider         │              │
│  │ Customer      │    │ Order         │    │ Mover         │              │
│  │ Organization  │    │ MoveRequest   │    │ Driver        │              │
│  │               │    │ AssetRequest  │    │ Vehicle       │              │
│  └───────────────┘    └───────┬───────┘    └───────────────┘              │
│                                │                                            │
│                                ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────┐      │
│  │                       WORKFLOW ENGINE                              │      │
│  │                                                                    │      │
│  │   ProcessDefinition ──▶ ProcessInstance ──▶ ProcessTransition   │      │
│  │                                                                    │      │
│  │   State: CREATED → ASSIGNED → IN_PROGRESS → COMPLETED/FAILED     │      │
│  │                                                                    │      │
│  └───────────────────────────────────────────────────────────────────┘      │
│                                │                                            │
│         ┌──────────────────────┼──────────────────────┐                   │
│         ▼                      ▼                      ▼                   │
│  ┌─────────────┐      ┌─────────────────┐      ┌─────────────┐           │
│  │ NOTIFICATION│      │    COMMITMENT    │      │   PAYMENT   │           │
│  │ (Communication│     │ (SLA/Policy)    │      │ (Wallet/    │           │
│  │  Module)    │      │                  │      │  Ledger)    │           │
│  └─────────────┘      └─────────────────┘      └─────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Vertical Readiness Matrix

| Vertical | Modules | Missing | Risk | MVP |
|----------|---------|---------|------|-----|
| E-commerce Delivery | delivery, order, rider, business, payment | None | Low | YES |
| Fleet / Multi-branch | asset, organization, workspace | Branch workflows | Medium | PARTIAL |
| Moving Services | movers, asset, commitment | Homeowner app | Medium | PARTIAL |
| Wholesale Distribution | delivery, order, business | Multi-stop routing | Medium | PARTIAL |
| Marketplace | rider, sacco, delivery | Payouts, onboarding | High | NO |

### 3. Product Packaging Map

| Product | Users | Dashboards | Mobile | Key Integrations |
|---------|-------|------------|--------|------------------|
| ZanaFleet Delivery OS | E-commerce | Operator, Rider, Business | Rider, Tracking | WooCommerce |
| ZanaFleet Fleet Manager | Logistics | Fleet, Asset, Branch | Driver | GPS, ERP |
| ZanaFleet Movers | Moving companies | Scheduler, Tracking | Homeowner, Mover | Payments |
| ZanaFleet Commerce Transport | Wholesalers | Orders, Routes | Driver | ERP |
| ZanaFleet Marketplace | Platform ops | Provider, Payouts | Provider, Customer | Stripe Connect |

### 4. Minimal Expansion Plan (90-day Roadmap)

| Phase | Focus | Deliverables |
|-------|-------|--------------|
| **Days 1-30** | Workspace Config Layer | Extended workspace entity, feature flags UI |
| **Days 31-60** | JobType Registry | JobType entity, workflow config, assignment strategy interface |
| **Days 61-90** | Marketplace Foundation | Stripe Connect integration, provider onboarding flow |

### 5. Risk & Assumption Report

**Assumptions to Validate:**
- Single-worker-per-job assumption (breaks movers)
- Single-destination assumption (breaks multi-stop)
- Business-only client assumption (breaks consumer)

**Critical Risks:**
- Over-generalization → configuration complexity
- Module coupling (delivery ↔ rider) → harder vertical extension

### 6. What ZanaFleet Actually Is

**ZanaFleet is a generalized job orchestration platform that happens to have delivery as its first vertical.**

The codebase already contains all primitives for multi-vertical expansion:
- **Jobs:** Generic job entity patterns across delivery, order, movers
- **Workers:** Rider, mover, driver entities with common traits
- **Workflows:** ProcessDefinition/Instance for configurable state machines
- **Assignment:** Matching coordinators ready for strategy abstraction
- **SLA:** Commitment module for due dates and breaches
- **Notifications:** Template-driven communication system
- **Payments:** Wallet and ledger for financial settlement

The path to multi-vertical is NOT to rewrite, but to:
1. **Extract** the canonical patterns already present
2. **Configure** verticals via workspace settings
3. **Extend** with minimal additions (JobType registry, AssignmentStrategy)
4. **Preserve** tenant isolation and event-driven architecture

---

*End of Blueprint*
