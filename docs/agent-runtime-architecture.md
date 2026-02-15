# Agent & Background Execution Runtime Architecture

This document describes the Agent & Background Execution Runtime architecture for ZanaFleet, enabling intelligent automation, background task execution, and AI-driven decision-making within the existing event-driven framework.

## Table of Contents

1. [High-Level Architecture Diagram](#1-high-level-architecture-diagram)
2. [Agent Runtime Model](#2-agent-runtime-model)
3. [Agent Execution Flow](#3-agent-execution-flow)
4. [Policy Engine Design](#4-policy-engine-design)
5. [Agent Types Catalog](#5-agent-types-catalog)
6. [AI Suggestion Layer](./ai-suggestion-layer.md)
7. [Consent Module](./consent-module.md)
8. [Telemetry & Observability](./telemetry-observability.md)
9. [SDUI Integration](./sdui-integration.md)
10. [Workflow Engine Integration](./workflow-integration.md)
11. [Background Task System](./background-tasks.md)
12. [Security & RBAC](./security-rbac.md)
13. [Multi-Tenant Isolation](./multi-tenant-isolation.md)
14. [Testing Strategy](./testing-strategy.md)
15. [Migration Guide](./migration-guide.md)
16. [API Reference](./api-reference.md)

---

## Core Principles

The Agent & Background Execution Runtime is built on the following principles:

1. **Event-Driven Core**: All agent triggers and executions flow through the existing Event Bus (NATS/Redis), maintaining the Command → Event → Handler → Projection pattern.

2. **Capability-Bound Operations**: Agents can only execute capabilities explicitly declared in their configuration. No capability invention or escalation.

3. **Policy Enforcement First**: Every agent execution is validated against `AutomationPolicy` before execution, ensuring risk score and confidence thresholds are enforced.

4. **Idempotent by Design**: All agent executions use idempotency keys to prevent duplicate processing, leveraging the existing `IdempotencyService`.

5. **Multi-Tenant Isolation**: Agents operate within strict tenant scope boundaries, with workspace-level isolation enforced at every layer.

6. **Observable by Default**: Every agent execution emits telemetry events, integrates with the audit system, and maintains correlation IDs for full traceability.

7. **Declarative Configuration**: Agents and policies are declarative, versioned, and stored in the database (PostgreSQL) with Redis caching for performance.

8. **Hybrid Trigger Support**: Agents support event-driven (NATS subscription), scheduled (cron), and hybrid trigger patterns.

9. **Graceful Degradation**: Agents include retry policies, backoff strategies, and cooldown windows to handle transient failures gracefully.

10. **AI Augmentation**: Optional AI analysis phase provides confidence scores and risk assessments, but never overrides policy decisions.

---

## 1. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Mobile     │  │   Web App    │  │   External   │  │   Cron       │           │
│  │   Clients    │  │   (SDUI)     │  │   APIs       │  │   Jobs       │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EVENT BUS (NATS/Redis)                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │  Domain Events ──▶ Agent Triggers ──▶ Agent Execution ──▶ Result Events    │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          AGENT RUNTIME CORE                                        │
│                                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                  │
│  │  AgentRegistry │    │  AgentExecutor  │    │ AgentScheduler  │                  │
│  │  - Discover    │    │  - Lifecycle    │    │  - Cron jobs    │                  │
│  │  - Validate    │    │  - Execution    │    │  - Scheduling   │                  │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘                  │
│           │                       │                       │                            │
│           └───────────────────────┼───────────────────────┘                            │
│                                   ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐     │
│  │                    AGENT EXECUTION PIPELINE                                 │     │
│  │  ┌─────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐        │     │
│  │  │ Trigger │─▶│ Context      │─▶│ AI Analysis │─▶│ Policy Engine   │        │     │
│  │  │ Parser  │  │ Builder      │  │ (Optional)  │  │                 │        │     │
│  │  └─────────┘  └─────────────┘  └─────────────┘  └────────┬────────┘        │     │
│  │                                                             │                 │     │
│  │  ┌─────────────────────────────────────────────────────────┘                 │     │
│  │  │                                                                    ▼       │     │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │     │
│  │  │  │  Decision   │─▶│ Orchestrator  │─▶│  Telemetry   │─▶│ Audit Log │  │     │
│  │  │  │  (EXECUTE/   │  │  (Capability │  │  (Metrics)   │  │          │  │     │
│  │  │  │   DEFER/     │  │   Execution)  │  │              │  │          │  │     │
│  │  │  │   BLOCK)     │  └──────────────┘  └──────────────┘  └──────────┘  │     │
│  │  │  └──────────────┘                                                   │     │
│  │  └───────────────────────────────────────────────────────────────────────┘     │
│  └─────────────────────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          SUPPORTING MODULES                                         │
│                                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Capability      │  │  Policy          │  │  Workflow        │                  │
│  │  Module          │  │  Engine          │  │  Engine          │                  │
│  │                  │  │                  │  │                  │                  │
│  │  - Access Ctrl   │  │  - Automation    │  │  - Process Def   │                  │
│  │  - Orchestrator  │  │    Policies      │  │  - Transitions   │                  │
│  │  - Audit         │  │  - Evaluation    │  │  - State Machine │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                  │
│                                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Consent         │  │  Communication   │  │  Neo4j           │                  │
│  │  Module          │  │  Module          │  │  Projections     │                  │
│  │                  │  │                  │  │                  │                  │
│  │  - User consent  │  │  - Notifications │  │  - Graph state   │                  │
│  │  - Preferences   │  │  - Templates     │  │  - Relationships │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          BACKGROUND TASK SYSTEM (BullMQ)                           │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│  │  │  Reminder   │  │  Risk        │  │  Escalation │  │  SLA        │        │   │
│  │  │  Queue      │  │  Monitoring  │  │  Queue      │  │  Monitoring │        │   │
│  │  │             │  │  Queue       │  │             │  │  Queue      │        │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Event Ingestion | NATS/Redis | Receive domain events and cron triggers |
| Agent Runtime | NestJS Services | Core execution engine |
| Policy Layer | Policy Module | Risk/confidence evaluation |
| Capability Binding | Capability Module | Authorized action execution |
| Persistence | PostgreSQL | Agent/policy definitions, audit logs |
| Graph State | Neo4j | Real-time agent state projections |
| Background Tasks | BullMQ | Async job processing |

---

## 2. Agent Runtime Model

### 2.1 Agent Interface Definition

Following the ZanaFleet patterns, agents are defined declaratively with strict typing:

```typescript
/**
 * Agent Type - defines how the agent is triggered
 */
export enum AgentType {
  EVENT_DRIVEN = 'event-driven',
  SCHEDULED = 'scheduled',
  HYBRID = 'hybrid',
}

/**
 * Retry Policy for agent execution failures
 */
export interface RetryPolicy {
  maxRetries: number;
  initialBackoffMs: number;
  maxBackoffMs: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

/**
 * Observability Configuration
 */
export interface ObservabilityConfig {
  emitExecutionEvents: boolean;
  emitTelemetryMetrics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  traceCorrelationId?: string;
}

/**
 * Tenant Scope - multi-tenant isolation
 */
export interface TenantScope {
  workspaceId: string;
  organizationId?: string;
  allowedEntityTypes?: string[];
}

/**
 * Agent Trigger - defines what activates the agent
 */
export interface AgentTrigger {
  // Event-driven triggers
  eventPattern?: string;
  eventTypes?: string[];
  
  // Scheduled triggers
  cronExpression?: string;
  timezone?: string;
  
  // Conditional triggers
  conditions?: PolicyCondition;
  
  // Debounce configuration
  debounceWindowMs?: number;
}

/**
 * AgentDefinition - the complete agent configuration
 * 
 * Follows ZanaFleet entity patterns with toDomain/fromDomain methods
 */
export interface AgentDefinition {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  description?: string;
  
  // Trigger configuration
  triggers: AgentTrigger[];
  
  // Capability binding - agents can ONLY use these capabilities
  capabilities: string[];
  
  // Policy binding - references AutomationPolicy.id
  policyBinding: string;
  
  // Execution configuration
  retryPolicy: RetryPolicy;
  timeoutMs?: number;
  
  // Observability
  observabilityConfig: ObservabilityConfig;
  
  // Tenant scope
  tenantScope: TenantScope;
  
  // Agent-specific settings
  debounceWindowMs?: number;
  enabled: boolean;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.2 TypeORM Entity Design

```typescript
import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * AgentDefinitionEntity
 * 
 * Stores declarative agent configurations.
 * Follows ZanaFleet TypeORM patterns with @PrimaryColumn('uuid'),
 * @CreateDateColumn, @UpdateDateColumn, and toDomain()/fromDomain() methods.
 */
@Entity('agent_definitions')
@Index('IDX_agent_definitions_workspace', ['workspaceId'])
@Index('IDX_agent_definitions_type', ['type'])
@Index('IDX_agent_definitions_enabled', ['enabled'])
export class AgentDefinitionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column({
    type: 'enum',
    enum: AgentType,
    default: AgentType.EVENT_DRIVEN,
  })
  type!: AgentType;

  @Column('varchar', { length: 20, default: '1.0.0' })
  version!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column('jsonb', { default: [] })
  triggers!: AgentTrigger[];

  @Column('simple-array')
  capabilities!: string[];

  @Column('uuid')
  policyBinding!: string;

  @Column('jsonb')
  retryPolicy!: RetryPolicy;

  @Column({ type: 'int', nullable: true })
  timeoutMs!: number | null;

  @Column('jsonb')
  observabilityConfig!: ObservabilityConfig;

  @Column('uuid')
  workspaceId!: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId!: string;

  @Column('simple-array', { nullable: true })
  allowedEntityTypes!: string[] | null;

  @Column({ type: 'int', nullable: true })
  debounceWindowMs!: number | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain representation
   */
  toDomain(): AgentDefinition {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      version: this.version,
      description: this.description,
      triggers: this.triggers,
      capabilities: this.capabilities,
      policyBinding: this.policyBinding,
      retryPolicy: this.retryPolicy,
      timeoutMs: this.timeoutMs ?? undefined,
      observabilityConfig: this.observabilityConfig,
      tenantScope: {
        workspaceId: this.workspaceId,
        organizationId: this.organizationId ?? undefined,
        allowedEntityTypes: this.allowedEntityTypes ?? undefined,
      },
      debounceWindowMs: this.debounceWindowMs ?? undefined,
      enabled: this.enabled,
      metadata: this.metadata ?? undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain data
   */
  static fromDomain(data: {
    id: string;
    name: string;
    type: AgentType;
    version?: string;
    description?: string | null;
    triggers: AgentTrigger[];
    capabilities: string[];
    policyBinding: string;
    retryPolicy: RetryPolicy;
    timeoutMs?: number | null;
    observabilityConfig: ObservabilityConfig;
    workspaceId: string;
    organizationId?: string | null;
    allowedEntityTypes?: string[] | null;
    debounceWindowMs?: number | null;
    enabled?: boolean;
    metadata?: Record<string, unknown> | null;
    createdAt?: Date;
  }): AgentDefinitionEntity {
    const entity = new AgentDefinitionEntity();
    entity.id = data.id;
    entity.name = data.name;
    entity.type = data.type;
    entity.version = data.version ?? '1.0.0';
    entity.description = data.description ?? null;
    entity.triggers = data.triggers;
    entity.capabilities = data.capabilities;
    entity.policyBinding = data.policyBinding;
    entity.retryPolicy = data.retryPolicy;
    entity.timeoutMs = data.timeoutMs ?? null;
    entity.observabilityConfig = data.observabilityConfig;
    entity.workspaceId = data.workspaceId;
    entity.organizationId = data.organizationId ?? null;
    entity.allowedEntityTypes = data.allowedEntityTypes ?? null;
    entity.debounceWindowMs = data.debounceWindowMs ?? null;
    entity.enabled = data.enabled ?? true;
    entity.metadata = data.metadata ?? null;
    entity.createdAt = data.createdAt ?? new Date();
    return entity;
  }
}
```

### 2.3 Agent Execution Entity

Tracks each individual execution of an agent:

```typescript
/**
 * Agent Execution Status
 */
export enum AgentExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  DEFERRED = 'deferred',
}

/**
 * AgentExecutionEntity
 * 
 * Tracks each agent execution for audit and debugging.
 */
@Entity('agent_executions')
@Index('IDX_agent_executions_agent_id', ['agentId'])
@Index('IDX_agent_executions_status', ['status'])
@Index('IDX_agent_executions_workspace', ['workspaceId'])
@Index('IDX_agent_executions_created', ['createdAt'])
export class AgentExecutionEntity {
  @PrimaryColumn('uuid')
  executionId!: string;

  @Column('uuid')
  agentId!: string;

  @Column('varchar', { length: 255 })
  agentName!: string;

  @Column({
    type: 'enum',
    enum: AgentExecutionStatus,
    default: AgentExecutionStatus.PENDING,
  })
  status!: AgentExecutionStatus;

  @Column('uuid')
  workspaceId!: string;

  @Column({ type: 'uuid', nullable: true })
  organizationId!: string | null;

  // Trigger information
  @Column({ type: 'varchar', nullable: true })
  triggerType!: string | null;

  @Column({ type: 'varchar', nullable: true })
  triggerEventId!: string | null;

  // Execution details
  @Column('jsonb', { nullable: true })
  inputPayload!: Record<string, unknown> | null;

  @Column('jsonb', { nullable: true })
  context!: Record<string, unknown> | null;

  // Decision
  @Column({ type: 'varchar', nullable: true })
  decision!: string | null;

  @Column({ type: 'text', nullable: true })
  decisionReason!: string | null;

  // Policy evaluation
  @Column({ type: 'float', nullable: true })
  riskScore!: number | null;

  @Column({ type: 'float', nullable: true })
  confidenceScore!: number | null;

  @Column({ type: 'varchar', nullable: true })
  policyId!: string | null;

  // Results
  @Column('jsonb', { nullable: true })
  result!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  // Timing
  @Column({ type: 'int', nullable: true })
  executionTimeMs!: number | null;

  @Column({ type: 'int', nullable: true })
  retryCount!: number | null;

  // Tracing
  @Column({ type: 'uuid', nullable: true })
  correlationId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  idempotencyKey!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
```

### 2.4 AgentRegistry Service

The `AgentRegistry` service manages agent discovery and validation:

```typescript
/**
 * AgentRegistry
 * 
 * Manages agent lifecycle: discovery, validation, caching.
 * Uses Redis for caching agent definitions.
 */
@Injectable()
export class AgentRegistry {
  private readonly logger = new Logger(AgentRegistry.name);
  private readonly cache: Map<string, AgentDefinition> = new Map();

  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Find all enabled agents for a workspace
   */
  async findByWorkspace(workspaceId: string): Promise<AgentDefinition[]> {
    const cacheKey = `agents:workspace:${workspaceId}`;
    
    // Try cache first
    const cached = await this.redisService.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const agents = await this.agentRepository.findByWorkspace(workspaceId);
    
    // Cache for 5 minutes
    await this.redisService.getClient().setex(
      cacheKey, 
      300, 
      JSON.stringify(agents)
    );

    return agents;
  }

  /**
   * Find agents by trigger event type
   */
  async findByEventType(
    workspaceId: string, 
    eventType: string
  ): Promise<AgentDefinition[]> {
    const agents = await this.findByWorkspace(workspaceId);
    return agents.filter(agent => 
      agent.enabled && 
      agent.triggers.some(t => 
        t.eventTypes?.includes(eventType) || 
        t.eventPattern?.includes(eventType)
      )
    );
  }

  /**
   * Find scheduled agents
   */
  async findScheduledAgents(workspaceId: string): Promise<AgentDefinition[]> {
    const agents = await this.findByWorkspace(workspaceId);
    return agents.filter(agent => 
      agent.enabled && 
      (agent.type === AgentType.SCHEDULED || agent.type === AgentType.HYBRID)
    );
  }

  /**
   * Validate agent configuration
   */
  async validate(agent: AgentDefinition): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check capabilities exist
    for (const capabilityName of agent.capabilities) {
      const exists = await this.capabilityExists(capabilityName);
      if (!exists) {
        errors.push(`Capability not found: ${capabilityName}`);
      }
    }

    // Check policy exists
    const policyExists = await this.policyExists(agent.policyBinding);
    if (!policyExists) {
      errors.push(`Policy not found: ${agent.policyBinding}`);
    }

    // Validate trigger configuration
    if (!agent.triggers || agent.triggers.length === 0) {
      errors.push('At least one trigger is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Invalidate cache when agent is updated
   */
  async invalidateCache(workspaceId: string): Promise<void> {
    const cacheKey = `agents:workspace:${workspaceId}`;
    await this.redisService.getClient().del(cacheKey);
  }
}
```

### 2.5 Key Concepts

| Concept | Description |
|---------|-------------|
| **Event Subscription** | Agents subscribe to NATS subjects matching their `eventTypes` or `eventPattern` |
| **Cron Scheduling** | Scheduled agents use `cronExpression` with timezone support |
| **Debounce Windows** | Prevents rapid re-execution; configurable via `debounceWindowMs` |
| **Idempotency** | Each execution generates unique `idempotencyKey` for deduplication |
| **Backoff Strategy** | Exponential backoff with configurable multiplier |
| **Context Scoping** | Agents only access entities within their `tenantScope` |
| **Multi-Tenant Isolation** | Workspace ID filtering at every layer |

---

## 3. Agent Execution Flow

### 3.1 Deterministic Lifecycle

The agent execution follows a strict pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           AGENT EXECUTION PIPELINE                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │  EVENT   │  (Domain Event or Cron Trigger)
     │  RECEIVE │
     └────┬─────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 1. AGENT TRIGGER MATCHING                                                           │
│    - Match event type to agent triggers                                             │
│    - Evaluate trigger conditions                                                    │
│    - Check debounce windows                                                         │
│    - Generate idempotency key                                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 2. CONTEXT BUILDING                                                                 │
│    - Load domain state from PostgreSQL                                              │
│    - Build AgentContext from event + domain data                                    │
│    - Apply tenant scope filtering                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 3. AI ANALYSIS (OPTIONAL)                                                           │
│    - Run multi-phase analysis if enabled                                           │
│    - Return confidence, riskScore, explanation, reasoningChain                      │
│    - Always returns; never blocks                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 4. POLICY ENGINE EVALUATION                                                          │
│    - Check capability access via CapabilityAccessController                          │
│    - Evaluate risk score against threshold                                          │
│    - Check confidence against threshold                                             │
│    - Enforce cooldown windows                                                       │
│    - Return PolicyDecision with reasoning                                          │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 5. DECISION PHASE                                                                   │
│                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  Decision: SUGGEST                                                            │   │
│   │  - AI analysis complete                                                      │   │
│   │  - Policy allows execution                                                  │   │
│   │  - Emit AgentSuggestedEvent for SDUI display                                │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  Decision: EXECUTE                                                           │   │
│   │  - Policy evaluation passed                                                  │   │
│   │  - Execute via CapabilityOrchestrator                                       │   │
│   │  - Emit AgentExecutedEvent                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  Decision: DEFER                                                             │   │
│   │  - Within cooldown window                                                   │   │
│   │  - Re-queue for later execution                                             │   │
│   │  - Emit AgentDeferredEvent                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  Decision: ESCALATE                                                          │   │
│   │  - Risk score too high                                                      │   │
│   │  - Requires human approval                                                  │   │
│   │  - Emit AgentEscalatedEvent                                                 │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  Decision: BLOCK                                                             │   │
│   │  - Policy explicitly blocks                                                 │   │
│   │  - Capability not allowed                                                   │   │
│   │  - Emit AgentBlockedEvent                                                   │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 6. ORCHESTRATOR EXECUTION (if EXECUTE)                                              │
│    - Execute capability via CapabilityOrchestrator                                  │
│    - Handle result or error                                                         │
└─────────────────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ 7. TELEMETRY & AUDIT                                                                │
│    - Emit execution metrics                                                         │
│    - Write to AgentExecutionEntity                                                 │
│    - Emit domain event for audit                                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Interface Definitions

```typescript
/**
 * AgentDecision Enum
 * 
 * The possible outcomes of agent evaluation.
 */
export enum AgentDecision {
  SUGGEST = 'suggest',
  EXECUTE = 'execute',
  DEFER = 'defer',
  ESCALATE = 'escalate',
  BLOCK = 'block',
}

/**
 * AgentTrigger Interface
 * 
 * Defines what causes an agent to activate.
 */
export interface AgentTrigger {
  // Event-driven triggers
  eventPattern?: string;        // NATS subject pattern, e.g., "delivery.*.created"
  eventTypes?: string[];        // Exact event types
  
  // Scheduled triggers  
  cronExpression?: string;     // Cron expression, e.g., "0 * * * *"
  timezone?: string;           // IANA timezone, e.g., "Africa/Nairobi"
  
  // Conditional triggers
  conditions?: PolicyCondition; // JSON Logic conditions
  
  // Debounce
  debounceWindowMs?: number;    // Cooldown between executions
}

/**
 * AgentContext
 * 
 * The execution context built from the trigger event and domain state.
 */
export interface AgentContext {
  // Identification
  executionId: string;
  agentId: string;
  agentName: string;
  workspaceId: string;
  
  // Trigger information
  trigger: AgentTrigger;
  triggerEventId?: string;
  triggerEventType?: string;
  
  // Event data
  eventPayload: Record<string, unknown>;
  
  // Domain state (queried)
  domainState: Record<string, unknown>;
  
  // Tenant scope
  tenantScope: TenantScope;
  
  // Timing
  triggeredAt: Date;
  
  // Tracing
  correlationId?: string;
  idempotencyKey?: string;
}

/**
 * AIAnalysisResult
 * 
 * Result from the AI analysis phase.
 */
export interface AIAnalysisResult {
  confidence: number;           // 0.0 - 1.0
  riskScore: number;            // 0.0 - 1.0
  explanation: string;          // Human-readable explanation
  reasoningChain: string[];     // Step-by-step reasoning
  metadata?: Record<string, unknown>;
}

/**
 * PolicyDecision
 * 
 * Result from policy engine evaluation.
 */
export interface PolicyDecisionResult {
  allowed: boolean;
  decision: AgentDecision;
  policyId: string;
  reason: string;
  riskScore: number;
  confidenceScore?: number;
  conditions?: PolicyCondition[];
}

/**
 * AgentExecutionResult
 * 
 * Final result of agent execution.
 */
export interface AgentExecutionResult {
  executionId: string;
  agentId: string;
  decision: AgentDecision;
  
  // Timing
  executionTimeMs: number;
  
  // Policy evaluation
  policyDecision?: PolicyDecisionResult;
  
  // AI analysis (if performed)
  aiAnalysis?: AIAnalysisResult;
  
  // Execution result
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  
  // Tracing
  correlationId: string;
  idempotencyKey: string;
}
```

### 3.3 State Machine Representation

Using the existing [`ProcessDefinitionEntity`](apps/api/src/modules/workflow/entities/process-definition.entity.ts) pattern, agent execution can be modeled as a state machine:

```typescript
/**
 * Agent Execution State Machine
 * 
 * Stored in process_definitions table for consistency.
 */
export const AGENT_EXECUTION_PROCESS_DEFINITION = {
  definitionId: 'agent-execution-v1',
  name: 'Agent Execution Process',
  version: '1.0.0',
  allowedStates: [
    'pending',
    'trigger_matched',
    'context_building',
    'ai_analyzing',
    'policy_evaluating',
    'deciding',
    'executing',
    'succeeded',
    'failed',
    'blocked',
    'deferred',
    'escalated',
  ],
  initialState: 'pending',
  terminalStates: ['succeeded', 'failed', 'blocked', 'deferred', 'escalated'],
};
```

### 3.4 Flow Implementation

```typescript
/**
 * AgentExecutor Service
 * 
 * Implements the deterministic execution pipeline.
 */
@Injectable()
export class AgentExecutor {
  private readonly logger = new Logger(AgentExecutor.name);

  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly contextBuilder: AgentContextBuilder,
    private readonly aiAnalysisService: AIAnalysisService,
    private readonly policyEvaluator: PolicyEvaluator,
    private readonly capabilityOrchestrator: CapabilityOrchestrator,
    private readonly telemetryService: AgentTelemetryService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Main execution pipeline
   */
  async execute(
    trigger: AgentTrigger,
    event: BaseEvent,
    workspaceId: string
  ): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const executionId = uuidv4();
    const idempotencyKey = this.generateIdempotencyKey(trigger, event);

    // Check idempotency
    const isIdempotent = await this.idempotencyService.check(idempotencyKey);
    if (isIdempotent) {
      this.logger.debug(`Execution ${idempotencyKey} already processed`);
      return this.getPreviousResult(idempotencyKey);
    }

    try {
      // Step 1: Find matching agents
      const agents = await this.agentRegistry.findByEventType(
        workspaceId,
        event.eventType
      );

      for (const agent of agents) {
        // Step 2: Build context
        const context = await this.contextBuilder.build(agent, trigger, event);

        // Step 3: AI Analysis (optional)
        let aiAnalysis: AIAnalysisResult | undefined;
        if (agent.observabilityConfig.emitExecutionEvents) {
          aiAnalysis = await this.aiAnalysisService.analyze(context);
        }

        // Step 4: Policy Evaluation
        const policyDecision = await this.policyEvaluator.evaluate(
          agent,
          context,
          aiAnalysis
        );

        // Step 5: Decision
        const decision = this.makeDecision(policyDecision, agent);

        // Step 6: Execute if allowed
        let result: Record<string, unknown> | undefined;
        let error: string | undefined;

        if (decision === AgentDecision.EXECUTE) {
          const execResult = await this.capabilityOrchestrator.execute({
            capabilityName: agent.capabilities[0], // Primary capability
            actorId: 'agent', // System actor
            actorType: 'agent',
            workspaceId,
            contextId: context.domainState.id,
            contextType: context.domainState.type,
            payload: context.eventPayload,
            correlationId: executionId,
          });

          result = execResult.data;
          error = execResult.error;
        }

        // Step 7: Telemetry & Audit
        const executionResult: AgentExecutionResult = {
          executionId,
          agentId: agent.id,
          decision,
          executionTimeMs: Date.now() - startTime,
          policyDecision,
          aiAnalysis,
          success: decision === AgentDecision.EXECUTE && !error,
          result,
          error,
          correlationId: executionId,
          idempotencyKey,
        };

        await this.telemetryService.record(executionResult);
        await this.emitExecutionEvent(executionResult);

        // Mark idempotent
        await this.idempotencyService.mark(idempotencyKey, executionResult);

        return executionResult;
      }

      // No matching agent found
      return {
        executionId,
        agentId: '',
        decision: AgentDecision.BLOCK,
        executionTimeMs: Date.now() - startTime,
        success: false,
        error: 'No matching agent found',
        correlationId: executionId,
        idempotencyKey,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.logger.error(`Agent execution failed: ${error}`);

      return {
        executionId,
        agentId: '',
        decision: AgentDecision.BLOCK,
        executionTimeMs,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        correlationId: executionId,
        idempotencyKey,
      };
    }
  }
}
```

---

## 4. Policy Engine Design

### 4.1 AutomationPolicy Interface

The `AutomationPolicy` extends the existing [`PolicyEntity`](apps/api/src/modules/policy/entities/policy.entity.ts) patterns with agent-specific configuration:

```typescript
/**
 * Escalation Strategy
 */
export enum EscalationStrategy {
  AUTO_APPROVE = 'auto_approve',
  REQUIRE_HUMAN = 'require_human',
  BLOCK = 'block',
  LOG_ONLY = 'log_only',
}

/**
 * Policy Condition
 */
export interface PolicyCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: unknown;
}

/**
 * AutomationPolicy
 * 
 * Defines rules for agent execution authorization.
 * Stored in PostgreSQL, cached in Redis.
 */
export interface AutomationPolicy {
  id: string;
  name: string;
  version: number;
  description?: string;
  
  // Context type this policy applies to
  contextType: string;
  
  // Allowed capabilities (agents can ONLY use these)
  allowedCapabilities: string[];
  
  // Consent requirements
  requiresConsent: boolean;
  
  // Risk management
  maxRiskScore: number;         // 0.0 - 1.0, block above this
  confidenceThreshold: number;  // 0.0 - 1.0, require above this for auto-exec
  
  // Rate limiting
  cooldownWindowMs: number;     // Minimum time between executions
  
  // Escalation
  escalationStrategy: EscalationStrategy;
  
  // Conditions
  conditions: PolicyCondition[];
  
  // Status
  enabled: boolean;
  
  // Versioning
  effectiveFrom: Date;
  effectiveTo?: Date;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### 4.2 TypeORM Entity

```typescript
/**
 * AutomationPolicyEntity
 * 
 * TypeORM entity for automation policies.
 * Follows ZanaFleet patterns with toDomain/fromDomain.
 */
@Entity('automation_policies')
@Index('IDX_automation_policies_workspace', ['workspaceId'])
@Index('IDX_automation_policies_context_type', ['contextType'])
@Index('IDX_automation_policies_enabled', ['enabled'])
export class AutomationPolicyEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('varchar', { length: 255 })
  name!: string;

  @Column('int', { default: 1 })
  version!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column('varchar', { length: 100 })
  contextType!: string;

  @Column('simple-array')
  allowedCapabilities!: string[];

  @Column({ type: 'boolean', default: false })
  requiresConsent!: boolean;

  @Column({ type: 'float', default: 0.5 })
  maxRiskScore!: number;

  @Column({ type: 'float', default: 0.7 })
  confidenceThreshold!: number;

  @Column({ type: 'int', default: 60000 })
  cooldownWindowMs!: number;

  @Column({
    type: 'enum',
    enum: EscalationStrategy,
    default: EscalationStrategy.BLOCK,
  })
  escalationStrategy!: EscalationStrategy;

  @Column('jsonb', { default: [] })
  conditions!: PolicyCondition[];

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'timestamp with time zone' })
  effectiveFrom!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  effectiveTo!: Date | null;

  @Column('uuid')
  workspaceId!: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Convert entity to domain
   */
  toDomain(): AutomationPolicy {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      description: this.description,
      contextType: this.contextType,
      allowedCapabilities: this.capabilities,
      requiresConsent: this.requiresConsent,
      maxRiskScore: this.maxRiskScore,
      confidenceThreshold: this.confidenceThreshold,
      cooldownWindowMs: this.cooldownWindowMs,
      escalationStrategy: this.escalationStrategy,
      conditions: this.conditions,
      enabled: this.enabled,
      effectiveFrom: this.effectiveFrom,
      effectiveTo: this.effectiveTo,
      metadata: this.metadata ?? undefined,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create entity from domain
   */
  static fromDomain(data: {
    id: string;
    name: string;
    version?: number;
    description?: string | null;
    contextType: string;
    allowedCapabilities: string[];
    requiresConsent?: boolean;
    maxRiskScore?: number;
    confidenceThreshold?: number;
    cooldownWindowMs?: number;
    escalationStrategy?: EscalationStrategy;
    conditions?: PolicyCondition[];
    enabled?: boolean;
    effectiveFrom: Date;
    effectiveTo?: Date | null;
    workspaceId: string;
    metadata?: Record<string, unknown> | null;
  }): AutomationPolicyEntity {
    const entity = new AutomationPolicyEntity();
    entity.id = data.id;
    entity.name = data.name;
    entity.version = data.version ?? 1;
    entity.description = data.description ?? null;
    entity.contextType = data.contextType;
    entity.allowedCapabilities = data.allowedCapabilities;
    entity.requiresConsent = data.requiresConsent ?? false;
    entity.maxRiskScore = data.maxRiskScore ?? 0.5;
    entity.confidenceThreshold = data.confidenceThreshold ?? 0.7;
    entity.cooldownWindowMs = data.cooldownWindowMs ?? 60000;
    entity.escalationStrategy = data.escalationStrategy ?? EscalationStrategy.BLOCK;
    entity.conditions = data.conditions ?? [];
    entity.enabled = data.enabled ?? true;
    entity.effectiveFrom = data.effectiveFrom;
    entity.effectiveTo = data.effectiveTo ?? null;
    entity.workspaceId = data.workspaceId;
    entity.metadata = data.metadata ?? null;
    return entity;
  }
}
```

### 4.3 PolicyEvaluator Service

The `PolicyEvaluator` enforces agent execution policies:

```typescript
/**
 * Policy Evaluation Options
 */
export interface PolicyEvaluationOptions {
  failOpen?: boolean;
  skipCooldown?: boolean;
}

/**
 * PolicyEvaluator
 * 
 * Evaluates agent execution against policies.
 * Integrates with existing CapabilityAccessController.
 */
@Injectable()
export class PolicyEvaluator {
  private readonly logger = new Logger(PolicyEvaluator.name);
  private readonly cache: Map<string, AutomationPolicy> = new Map();

  constructor(
    private readonly policyRepository: AutomationPolicyRepository,
    private readonly capabilityAccessController: CapabilityAccessController,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Evaluate agent execution against policy
   */
  async evaluate(
    agent: AgentDefinition,
    context: AgentContext,
    aiAnalysis?: AIAnalysisResult
  ): Promise<PolicyDecisionResult> {
    const policy = await this.getPolicy(agent.policyBinding);

    if (!policy) {
      return {
        allowed: false,
        decision: AgentDecision.BLOCK,
        policyId: agent.policyBinding,
        reason: 'Policy not found',
        riskScore: 1.0,
      };
    }

    // Check if policy is enabled and effective
    if (!this.isPolicyEffective(policy)) {
      return {
        allowed: false,
        decision: AgentDecision.BLOCK,
        policyId: policy.id,
        reason: 'Policy not effective',
        riskScore: 1.0,
      };
    }

    // Step 1: Capability access check
    const hasCapability = await this.capabilityAccessController.hasAllCapabilities(
      'agent', // System actor
      policy.allowedCapabilities
    );

    if (!hasCapability) {
      return {
        allowed: false,
        decision: AgentDecision.BLOCK,
        policyId: policy.id,
        reason: 'Agent lacks required capabilities',
        riskScore: 1.0,
      };
    }

    // Step 2: Risk score evaluation
    const riskScore = aiAnalysis?.riskScore ?? 0.0;
    if (riskScore > policy.maxRiskScore) {
      if (policy.escalationStrategy === EscalationStrategy.REQUIRE_HUMAN) {
        return {
          allowed: true,
          decision: AgentDecision.ESCALATE,
          policyId: policy.id,
          reason: `Risk score ${riskScore} exceeds threshold ${policy.maxRiskScore}`,
          riskScore,
          confidenceScore: aiAnalysis?.confidence,
        };
      }

      return {
        allowed: false,
        decision: AgentDecision.BLOCK,
        policyId: policy.id,
        reason: `Risk score ${riskScore} exceeds maximum ${policy.maxRiskScore}`,
        riskScore,
        confidenceScore: aiAnalysis?.confidence,
      };
    }

    // Step 3: Confidence threshold check
    if (aiAnalysis && aiAnalysis.confidence < policy.confidenceThreshold) {
      return {
        allowed: true,
        decision: AgentDecision.SUGGEST,
        policyId: policy.id,
        reason: `Confidence ${aiAnalysis.confidence} below threshold ${policy.confidenceThreshold}`,
        riskScore,
        confidenceScore: aiAnalysis.confidence,
      };
    }

    // Step 4: Cooldown check
    if (!this.isCooldownElapsed(policy, context)) {
      return {
        allowed: true,
        decision: AgentDecision.DEFER,
        policyId: policy.id,
        reason: 'Cooldown window not elapsed',
        riskScore,
        confidenceScore: aiAnalysis?.confidence,
      };
    }

    // Step 5: Condition evaluation
    const conditionsMet = this.evaluateConditions(policy.conditions, context);
    if (!conditionsMet) {
      return {
        allowed: false,
        decision: AgentDecision.BLOCK,
        policyId: policy.id,
        reason: 'Policy conditions not met',
        riskScore,
        confidenceScore: aiAnalysis?.confidence,
        conditions: policy.conditions,
      };
    }

    // All checks passed - allow execution
    return {
      allowed: true,
      decision: AgentDecision.EXECUTE,
      policyId: policy.id,
      reason: 'All policy checks passed',
      riskScore,
      confidenceScore: aiAnalysis?.confidence,
    };
  }

  /**
   * Get policy with caching
   */
  private async getPolicy(policyId: string): Promise<AutomationPolicy | null> {
    const cacheKey = `policy:${policyId}`;

    // Try cache
    const cached = this.cache.get(policyId);
    if (cached) {
      return cached;
    }

    // Query database
    const policy = await this.policyRepository.findById(policyId);
    if (policy) {
      this.cache.set(policyId, policy);
    }

    return policy;
  }

  /**
   * Check if policy is currently effective
   */
  private isPolicyEffective(policy: AutomationPolicy): boolean {
    const now = new Date();
    
    if (!policy.enabled) {
      return false;
    }

    if (now < policy.effectiveFrom) {
      return false;
    }

    if (policy.effectiveTo && now > policy.effectiveTo) {
      return false;
    }

    return true;
  }

  /**
   * Check if cooldown has elapsed
   */
  private isCooldownElapsed(policy: AutomationPolicy, context: AgentContext): boolean {
    const cacheKey = `cooldown:${policy.id}:${context.tenantScope.workspaceId}`;
    
    // This would check Redis for last execution time
    // Simplified for documentation
    return true;
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(
    conditions: PolicyCondition[],
    context: AgentContext
  ): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    // Use JSON Logic evaluator
    return conditions.every(condition => {
      const value = context.domainState[condition.field];
      return this.evaluateConditionOperator(condition.operator, value, condition.value);
    });
  }

  private evaluateConditionOperator(
    operator: string,
    actual: unknown,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq': return actual === expected;
      case 'ne': return actual !== expected;
      case 'gt': return (actual as number) > (expected as number);
      case 'gte': return (actual as number) >= (expected as number);
      case 'lt': return (actual as number) < (expected as number);
      case 'lte': return (actual as number) <= (expected as number);
      case 'in': return (expected as unknown[]).includes(actual);
      case 'contains': return String(actual).includes(String(expected));
      default: return false;
    }
  }
}
```

### 4.4 Policy Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | UUID | Unique identifier |
| `name` | string | Human-readable name |
| `version` | number | Semantic versioning for updates |
| `contextType` | string | Type of context this policy applies to |
| `allowedCapabilities` | string[] | Capabilities agents can use |
| `requiresConsent` | boolean | Whether user consent is required |
| `maxRiskScore` | number | Maximum risk score (0.0-1.0) |
| `confidenceThreshold` | number | Minimum confidence for auto-exec (0.0-1.0) |
| `cooldownWindowMs` | number | Minimum time between executions |
| `escalationStrategy` | enum | What to do when escalated |
| `conditions` | PolicyCondition[] | Additional conditions |
| `enabled` | boolean | Whether policy is active |
| `effectiveFrom` | Date | When policy becomes effective |
| `effectiveTo` | Date? | When policy expires |

---

## 5. Agent Types Catalog

The following agent types are defined in the system. Each declares its allowed capabilities explicitly and follows the capability-bound operations principle.

### 5.1 ReminderAgent

| Property | Value |
|----------|-------|
| **Purpose** | Send proactive reminders for upcoming events, deadlines, or actions |
| **Trigger Type** | Event-driven (scheduled time approaching) |
| **Required Capabilities** | `notification_send`, `communication_template_render` |
| **Policy Constraints** | Max risk: 0.3, Consent required |
| **Example Trigger Events** | `Booking.ScheduledV1`, `Commitment.DueApproachingV1` |

```typescript
// ReminderAgent Definition
{
  name: 'BookingReminderAgent',
  type: 'event-driven',
  triggers: [{
    eventTypes: ['BookingScheduledEventV1'],
  }],
  capabilities: ['notification_send', 'communication_template_render'],
  policyBinding: 'reminder-policy-v1',
}
```

### 5.2 RiskMonitoringAgent

| Property | Value |
|----------|-------|
| **Purpose** | Continuously monitor for risk indicators and escalate anomalies |
| **Trigger Type** | Scheduled + Event-driven |
| **Required Capabilities** | `risk_assess`, `escalation_create` |
| **Policy Constraints** | Max risk: 0.8, Escalation strategy: REQUIRE_HUMAN |
| **Example Trigger Events** | `Transaction.AnomalyDetectedV1`, `Rider.BehaviorAnomalyV1` |

```typescript
// RiskMonitoringAgent Definition
{
  name: 'TransactionRiskMonitor',
  type: 'hybrid',
  triggers: [{
    cronExpression: '*/5 * * * *', // Every 5 minutes
  }, {
    eventTypes: ['TransactionCreatedEventV1'],
  }],
  capabilities: ['risk_assess', 'escalation_create'],
  policyBinding: 'risk-monitoring-policy-v1',
}
```

### 5.3 EscalationAgent

| Property | Value |
|----------|-------|
| **Purpose** | Handle escalations from other agents or manual triggers |
| **Trigger Type** | Event-driven |
| **Required Capabilities** | `escalation_update`, `notification_escalation`, `approval_process` |
| **Policy Constraints** | Max risk: 0.5, Requires human approval |
| **Example Trigger Events** | `Agent.EscalatedV1`, `Policy.ViolationDetectedV1` |

### 5.4 SLAAgent

| Property | Value |
|----------|-------|
| **Purpose** | Monitor SLA compliance and trigger breach notifications |
| **Trigger Type** | Scheduled |
| **Required Capabilities** | `sla_check`, `notification_breach`, `report_generate` |
| **Policy Constraints** | Max risk: 0.4, Consent required |
| **Example Trigger Events** | Cron-based periodic checks |

### 5.5 RetryAgent

| Property | Value |
|----------|-------|
| **Purpose** | Handle failed operations with intelligent retry logic |
| **Trigger Type** | Event-driven (operation failed) |
| **Required Capabilities** | `retry_execute`, `operation_replay` |
| **Policy Constraints** | Max risk: 0.2, Exponential backoff |
| **Example Trigger Events** | `Operation.FailedV1`, `Command.TimedOutV1` |

### 5.6 NotificationAgent

| Property | Value |
|----------|-------|
| **Purpose** | General-purpose notification delivery across channels |
| **Trigger Type** | Event-driven |
| **Required Capabilities** | `notification_send`, `notification_template_render` |
| **Policy Constraints** | Max risk: 0.3, RequiresConsent: true |
| **Example Trigger Events** | `Booking.ConfirmedV1`, `Delivery.CompletedV1`, `Payment.ReceivedV1` |

### 5.7 DataSyncAgent

| Property | Value |
|----------|-------|
| **Purpose** | Synchronize data between systems or enforce consistency |
| **Trigger Type** | Scheduled |
| **Required Capabilities** | `data_sync`, `consistency_check` |
| **Policy Constraints** | Max risk: 0.1, Read-only operations preferred |
| **Example Trigger Events** | Cron-based periodic sync |

### 5.8 CleanupAgent

| Property | Value |
|----------|-------|
| **Purpose** | Perform cleanup operations (expired records, temp files) |
| **Trigger Type** | Scheduled |
| **Required Capabilities** | `data_delete`, `archive_execute` |
| **Policy Constraints** | Max risk: 0.1, Audit all deletions |
| **Example Trigger Events** | Cron-based nightly cleanup |

### 5.9 AggregationAgent

| Property | Value |
|----------|-------|
| **Purpose** | Aggregate data for reporting and analytics |
| **Trigger Type** | Scheduled |
| **Required Capabilities** | `data_aggregate`, `report_generate` |
| **Policy Constraints** | Max risk: 0.0, Read-only |
| **Example Trigger Events** | Cron-based hourly/daily aggregation |

### 5.10 WatchdogAgent

| Property | Value |
|----------|-------|
| **Purpose** | Monitor system health and alert on anomalies |
| **Trigger Type** | Scheduled |
| **Required Capabilities** | `health_check`, `alert_trigger`, `notification_send` |
| **Policy Constraints** | Max risk: 0.0, Always alert |
| **Example Trigger Events** | Cron-based periodic health checks |

### 5.11 Agent Type Summary Table

| Agent Type | Trigger | Capabilities | Max Risk | Policy Strategy |
|------------|---------|---------------|----------|-----------------|
| ReminderAgent | Event | notification_send | 0.3 | Consent required |
| RiskMonitoringAgent | Hybrid | risk_assess | 0.8 | Escalate high risk |
| EscalationAgent | Event | escalation_update | 0.5 | Human approval |
| SLAAgent | Scheduled | sla_check | 0.4 | Breach notification |
| RetryAgent | Event | retry_execute | 0.2 | Backoff strategy |
| NotificationAgent | Event | notification_send | 0.3 | Consent required |
| DataSyncAgent | Scheduled | data_sync | 0.1 | Consistency first |
| CleanupAgent | Scheduled | data_delete | 0.1 | Audit all |
| AggregationAgent | Scheduled | data_aggregate | 0.0 | Read-only |
| WatchdogAgent | Scheduled | health_check | 0.0 | Always alert |

---

## Implementation Notes

### Cross-References

- **Capability Module**: [`apps/api/src/modules/capability/`](apps/api/src/modules/capability/) - Agents use `CapabilityAccessController` and `CapabilityOrchestrator`
- **Policy Module**: [`apps/api/src/modules/policy/`](apps/api/src/modules/policy/) - Policy evaluation integrates with existing `PolicyEvaluationEngineService`
- **Workflow Module**: [`apps/api/src/modules/workflow/`](apps/api/src/modules/workflow/) - Agent execution state machine uses `ProcessDefinitionEntity` patterns
- **Event Bus**: [`apps/api/src/core/event-bus/`](apps/api/src/core/event-bus/) - Agent triggers and results flow through NATS

### Patterns Used

- Event naming: `<Module><Entity><Action>Event-V<Number>` (e.g., `AgentExecution.StartedV1`)
- Entity patterns: `@PrimaryColumn('uuid')`, `@CreateDateColumn`, `toDomain()`/`fromDomain()`
- Orchestrator pattern: `OrchestrationRequest` → capability check → command → event emission
- Projections: Dual persistence (PostgreSQL + Neo4j)

---

## Next Steps

This document covers sections 1-5 of the Agent & Background Execution Runtime architecture. The remaining sections will address:

<!-- Sections 6-16 continued in subsequent updates -->

6. **AI Suggestion Layer** - Multi-phase AI analysis integration
7. **Consent Module** - User consent management for agent actions
8. **Telemetry & Observability** - Metrics, logging, tracing
9. **SDUI Integration** - Server-Driven UI for agent suggestions
10. **Workflow Engine Integration** - State machine and transitions
11. **Background Task System** - BullMQ queue configuration
12. **Security & RBAC** - Role-based access control for agents
13. **Multi-Tenant Isolation** - Workspace-level boundaries
14. **Testing Strategy** - Unit, integration, e2e patterns
15. **Migration Guide** - Upgrading existing systems
16. **API Reference** - REST and GraphQL endpoints
