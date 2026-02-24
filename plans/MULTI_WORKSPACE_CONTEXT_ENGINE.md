# Multi-Workspace Context Resolution Engine - Core Infrastructure

## Overview

This document defines the minimal core layer that enables three user stories:

1. Seamless Multi-Workspace Context Resolution
2. Unified Role Projection System
3. Intelligent Job Feed Aggregation

## Phase 1: Actor Multi-Workspace Support

### Problem

- `ActorEntity` currently has single `workspaceId` field
- `MembershipEntity` already exists but not used as primary workspace reference

### Solution

- Deprecate `ActorEntity.workspaceId` in favor of `MembershipEntity` as primary
- Add `activeWorkspaceId` to Actor for session context (temporary, not persisted)

### Changes Required

```
ActorEntity:
  - Remove: workspaceId (or mark deprecated)
  - Add: activeWorkspaceId?: string (session-scoped, not persisted)

MembershipEntity:
  - Already exists with actorId, workspaceId, role, since
  - Add: defaultWorkspaceId (optional, for login default)
```

## Phase 2: Context Resolution Engine

### Core Service: ContextResolutionService

```typescript
interface WorkspaceContext {
  actorId: string;
  workspaceId: string;
  roles: MembershipRole[];
  inferredIntent?: ContextIntent;
  source: ContextSource;
}

type ContextSource =
  | 'job_event'
  | 'assignment'
  | 'notification_origin'
  | 'user_action'
  | 'active_job'
  | 'route_access';

interface ContextResolutionRequest {
  actorId: string;
  source: ContextSource;
  // Source-specific data
  jobId?: string;
  notificationId?: string;
  route?: string;
  action?: string;
}
```

### Context Inference Algorithm

```
1. If request has explicit workspaceId → validate membership → return
2. If source is 'job_event' → extract workspaceId from job.workspaceId
3. If source is 'assignment' → resolve from assignment.workspaceId
4. If source is 'notification_origin' → extract from notification.metadata.workspaceId
5. If source is 'active_job' → find job's workspace where actor has active assignment
6. If source is 'route_access' → infer from route pattern
7. Fallback → use defaultWorkspaceId from MembershipEntity
```

### Implementation Location

- `apps/api/src/core/context/`
- `context.resolver.ts` - Main service
- `context.module.ts` - NestJS module
- `dto/context.dto.ts` - Request/Response types

## Phase 3: Role Projection System

### Core Concept

Role is inferred from **intent** (action + resource), not explicit selection.

### Implementation: RoleProjectionService

```typescript
interface RoleProjection {
  actorId: string;
  currentRole: MembershipRole;
  effectivePermissions: string[];
  accessibleWorkspaces: string[];
  inferredIntent?: ContextIntent;
}

interface IntentResolutionRequest {
  actorId: string;
  action: string; // 'view', 'create', 'accept', 'complete'
  resource: string; // 'job', 'earnings', 'profile'
  resourceId?: string;
  route?: string; // '/jobs/accept/:id'
}
```

### Role Inference Rules

| Route Pattern          | Action | Inferred Role | Workspace                  |
| ---------------------- | ------ | ------------- | -------------------------- |
| /rider/jobs            | view   | RIDER         | from active job or default |
| /rider/jobs/:id/accept | accept | RIDER         | from job.workspaceId       |
| /customer/orders       | view   | CUSTOMER      | from order.workspaceId     |
| /admin/workspaces      | view   | ADMIN         | from route                 |
| /shops/:id/jobs        | view   | SHOP_ADMIN    | from shop.workspaceId      |

### Guardrails

- All role inferences validated against MembershipEntity
- Cross-workspace access requires explicit capability grant
- Audit log of all role inferences

## Phase 4: Job Feed Aggregation Engine

### Core Service: UnifiedJobFeedService

```typescript
interface JobFeedItem {
  jobId: string;
  jobType: JobType; // 'delivery', 'order', 'move_request'
  workspaceId: string;
  workspaceName: string;
  status: JobStatus;
  score: number; // Computed ranking score
  earnings: number;
  distanceMeters?: number;
  slaDeadline?: Date;
  pickupLocation?: GeoPoint;
  dropoffLocation?: GeoPoint;
}

interface JobFeedRequest {
  actorId: string;
  roles: MembershipRole[]; // e.g., ['RIDER', 'CUSTOMER']
  status?: JobStatus[];
  workspaces?: string[]; // null = all accessible
  limit?: number;
  offset?: number;
}
```

### Job Scoring Algorithm

```typescript
interface JobScoreFactors {
  distanceWeight: number; // -1 (closer = better, negative)
  earningsWeight: number; // +1 (higher = better)
  slaUrgencyWeight: number; // +1 (more urgent = higher, within SLA)
  acceptanceProbability: number; // +1 (likely to accept = better)
  riderPreferences: number; // +1 (matches preferences = better)
}

// Score = Σ(factor * weight)
// Normalize each factor to 0-1 scale
```

### Conflict Detection

```typescript
interface ConflictCheck {
  hasConflict: boolean;
  conflicts: JobConflict[];
  lockedJobIds: string[];
}

interface JobConflict {
  type: 'double_booking' | 'sla_conflict' | 'policy_violation';
  existingJobId: string;
  proposedJobId: string;
  reason: string;
}
```

### Double Booking Prevention

- Query Neo4j for actor's active jobs (status IN [ASSIGNED, PICKED_UP, IN_TRANSIT])
- If active job has time overlap with proposed → conflict
- Lock conflicting jobs from feed

## Phase 5: Neo4j Projections for Fast Queries

### Required Graph Relationships

```
// Actor multi-workspace membership
(a:Actor)-[m:MEMBER_OF]->(w:Workspace)

// Actor's current context (derived)
(a:Actor)-[c:CURRENT_CONTEXT]->(w:Workspace)

// Active job assignments
(a:Actor)-[a:ASSIGNED_TO]->(j:Job)<-[o:OWNED_BY]-(w:Workspace)

// Job feed aggregation (materialized)
(w:Workspace)-[h:HAS_JOB]->(j:Job)
```

### Required Indexes

- `Actor.id` (primary)
- `Membership(actorId, workspaceId)` (composite)
- `Job.workspaceId, status` (composite)
- `JobAssignment(actorId, status)` (composite)

## Implementation Priority

### P0 - Foundation (Day 1-2)

1. Add `defaultWorkspaceId` to MembershipEntity
2. Create ContextResolutionService
3. Add MembershipRepository queries

### P1 - Context Inference (Day 3-4)

1. Implement job event → workspace inference
2. Implement assignment → workspace inference
3. Add route → role inference

### P2 - Feed Aggregation (Day 5-7)

1. Create UnifiedJobFeedService
2. Implement job scoring algorithm
3. Add conflict detection
4. Create aggregated feed query

### P3 - Optimization (Day 8+)

1. Materialized feed caching
2. Real-time feed updates via subscriptions
3. Performance tuning

## Data Isolation Guarantees

1. **Strict Tenant Isolation**: All queries MUST include workspaceId filter
2. **No Cross-Tenant Leakage**: MembershipEntity is the source of truth
3. **Earnings Separation**: Each workspace has independent ledger
4. **Policy Enforcement**: PolicyEngine evaluates per workspace

## API Design

### Context Resolution Endpoint

```
POST /api/v1/context/resolve
{
  actorId: string,
  source: 'job_event' | 'assignment' | 'notification' | 'route',
  data: { ...sourceSpecific }
}
Response: WorkspaceContext
```

### Unified Job Feed Endpoint

```
GET /api/v1/feed/jobs
Query params:
  - actorId (required)
  - role (required): RIDER | CUSTOMER | SHOP_ADMIN
  - workspaceIds (optional): comma-separated
  - status (optional): REQUESTED,ASSIGNED,...
  - limit (default: 20)
  - offset (default: 0)
Response: { jobs: JobFeedItem[], total: number }
```

### Role Inference Endpoint

```
GET /api/v1/auth/current-context
Response: {
  actorId: string,
  workspaces: { workspaceId, name, role }[],
  currentRole: MembershipRole,
  effectivePermissions: string[]
}
```

## Testing Strategy

1. Unit tests for context inference algorithm
2. Integration tests for multi-workspace membership
3. E2E tests for unified feed
4. Performance tests for feed latency
5. Conflict detection edge case tests
