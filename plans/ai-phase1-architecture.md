# Phase 1 AI Intelligence Layer Architecture

## Overview

This document defines the architecture for Phase 1 of the Event-Driven AI Intelligence Layer. Phase 1 is designed to be **safe, minimal, observable, non-automating by default, backwards compatible, and extensible** to future phases.

## Phase 1 Goals

1. **Event-triggered suggestion generation** - Subscribe to domain events and generate AI suggestions
2. **Basic hanging-state detection** - Detect workflow states exceeding expected duration
3. **Intelligent reminder generation** - Generate suggestion-based reminders (NOT direct push/email)
4. **Risk scoring (read-only)** - Compute riskScore (0-100), provide riskFactors
5. **Feedback loop capture** - Capture accepted/rejected/expired feedback
6. **Telemetry emission** - Emit telemetry events for AI operations
7. **Suggestion persistence** - Store suggestions with TTL and deduplication
8. **Full auditability** - Every AI operation is traceable via events

**Constraint**: No automatic state mutation in Phase 1 - all AI outputs are suggestions only.

---

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                    ZanaFleet System                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────────────┐ │
│  │  Workflow Module │     │Capability Module │     │      AI Module (Phase 1)        │ │
│  │                  │     │                  │     │                                  │ │
│  │ ┌──────────────┐ │     │ ┌──────────────┐ │     │  ┌────────────────────────────┐  │ │
│  │ │ProcessState  │ │     │ │Capability    │ │     │  │ AIEventListener            │  │ │
│  │ │ChangedEvent  │─┼────►│ │UsedEvent    │ │     │  │ - Subscribes to domain     │  │ │
│  │ └──────────────┘ │     │ └──────────────┘ │     │  │   events                   │  │ │
│  │                  │     │                  │     │  │ - Builds AI context        │  │ │
│  │ ┌──────────────┐ │     │ ┌──────────────┐ │     │  │ - Generates suggestions    │  │ │
│  │ │Process      │ │     │ │Capability   │ │     │  └────────────────────────────┘  │ │
│  │ │Instance     │ │     │ │AuditEvent    │ │     │                                  │ │
│  │ └──────────────┘ │     │ └──────────────┘ │     │  ┌────────────────────────────┐  │ │
│  └────────┬─────────┘     └────────┬─────────┘     │  │ HangingStateDetector       │  │ │
│           │                       │               │  │ - Polls active processes  │  │ │
│           ▼                       ▼               │  │ - Emits detected events   │  │ │
│  ┌─────────────────────────────────────────────┐ │  └────────────────────────────┘  │ │
│  │              NATS Event Bus                   │ │                                  │ │
│  │                                               │ │  ┌────────────────────────────┐  │ │
│  │  Events:                                      │ │  │ AIReminderEngine          │  │ │
│  │  - AI.SuggestionGeneratedV1                   │ │  │ - Generates reminders     │  │ │
│  │  - AI.HangingStateDetectedV1                  │ │  │ - Based on suggestions    │  │ │
│  │  - AI.RiskAnalyzedV1                         │ │  │ - NOT direct push/email  │  │ │
│  │  - AI.SuggestionFeedbackV1                    │ │  └────────────────────────────┘  │ │
│  │  - AI.TelemetryEmittedV1                      │ │                                  │ │
│  └─────────────────────────────────────────────┘ │  ┌────────────────────────────┐  │ │
│           ▲                                       │  │ AIRiskAnalyzer             │  │ │
│           │                                       │  │ - Computes riskScore 0-100 │  │ │
│           │                                       │  │ - Provides riskFactors    │  │ │
│  ┌────────┴──────────────────────────────────────┤  │ - Read-only analysis       │  │ │
│  │              Event Subscribers                 │  └────────────────────────────┘  │ │
│  │                                               │                                  │ │
│  │  ┌──────────────────┐  ┌──────────────────┐ │  ┌────────────────────────────┐  │ │
│  │  │ Projection Layer │  │ Persistence Layer │  │  │ AISuggestionStore         │  │ │
│  │  │ (Neo4j)          │  │ (Postgres)        │  │  │ - TTL-based persistence   │  │ │
│  │  │                  │  │                  │  │  │ - Deduplication           │  │ │
│  │  │ - AISuggestion   │  │ - AI_Suggestions  │  │  │ - Query by actor/context  │  │ │
│  │  │   Neo4j Node     │  │ - AI_Feedback     │  │  └────────────────────────────┘  │ │
│  │  │ - AIRisk Neo4j  │  │ - AI_Telemetry    │  │                                  │ │
│  │  │   Node           │  │                  │  │  ┌────────────────────────────┐  │ │
│  │  └──────────────────┘  └──────────────────┘ │  │ AISuggestionFeedbackService│  │ │
│  │                                               │  │ - Capture accepted         │  │ │
│  └───────────────────────────────────────────────┘  │ - Capture rejected         │  │ │
│                                                       │ - Capture expired          │  │ │
│                                                       └────────────────────────────┘  │ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
apps/api/src/modules/ai/
├── ai.module.ts                          # Main module definition
├── index.ts                              # Public exports
│
├── entities/                             # Database entities
│   ├── ai-suggestion.entity.ts           # AI Suggestion entity
│   ├── ai-feedback.entity.ts             # Feedback capture entity
│   └── ai-telemetry.entity.ts            # Telemetry entity
│
├── events/                               # AI-specific events
│   ├── ai-suggestion-generated.event.ts  # Suggestion generated
│   ├── ai-hanging-state-detected.event.ts# Hanging state detected
│   ├── ai-risk-analyzed.event.ts         # Risk analysis result
│   ├── ai-suggestion-feedback.event.ts   # User feedback on suggestion
│   ├── ai-telemetry-emitted.event.ts     # Telemetry event
│   └── index.ts
│
├── handlers/                             # Event handlers
│   ├── suggestion-generated.handler.ts   # Handle suggestion generation
│   ├── hanging-state.handler.ts          # Handle hanging state detection
│   ├── risk-analysis.handler.ts          # Handle risk analysis
│   └── feedback-handler.ts               # Handle feedback events
│
├── services/                             # Core services
│   ├── ai-event-listener.service.ts      # Main event listener
│   ├── hanging-state-detector.service.ts # Hanging state detection
│   ├── ai-reminder-engine.service.ts     # Reminder generation
│   ├── ai-risk-analyzer.service.ts       # Risk scoring (read-only)
│   ├── ai-suggestion-store.service.ts    # Suggestion persistence
│   └── ai-suggestion-feedback.service.ts # Feedback capture
│
├── projections/                          # Neo4j projections
│   ├── ai-suggestion.neo4j.projection.ts # Suggestion graph node
│   └── ai-risk.neo4j.projection.ts       # Risk analysis graph node
│
├── repositories/                         # Data access
│   ├── ai-suggestion.repository.ts        # Suggestion repository
│   ├── ai-feedback.repository.ts         # Feedback repository
│   └── ai-telemetry.repository.ts        # Telemetry repository
│
├── dto/                                  # Data transfer objects
│   ├── ai-suggestion.dto.ts              # Suggestion DTOs
│   ├── ai-risk.dto.ts                   # Risk analysis DTOs
│   └── ai-feedback.dto.ts                # Feedback DTOs
│
├── queries/                              # Query handlers
│   ├── ai-suggestion.query-handlers.ts   # Query handlers for suggestions
│   └── ai-risk.query-handlers.ts        # Query handlers for risk
│
├── config/                               # Configuration
│   └── ai-config.ts                     # AI module configuration
│
└── tests/
    ├── unit/
    │   ├── ai-event-listener.service.spec.ts
    │   ├── hanging-state-detector.service.spec.ts
    │   ├── ai-risk-analyzer.service.spec.ts
    │   └── ai-suggestion-store.service.spec.ts
    └── integration/
        └── ai-module.integration.spec.ts
```

---

## Module Definition (ai.module.ts)

```typescript
import { Module, Type } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EventBusModule } from '@api/core/event-bus';
import { Neo4jModule } from '@api/core/neo4j';

import { AISuggestionEntity } from './entities/ai-suggestion.entity';
import { AIFeedbackEntity } from './entities/ai-feedback.entity';
import { AITelemetryEntity } from './entities/ai-telemetry.entity';

import { SuggestionGeneratedHandler } from './handlers/suggestion-generated.handler';
import { HangingStateHandler } from './handlers/hanging-state.handler';
import { RiskAnalysisHandler } from './handlers/risk-analysis.handler';
import { FeedbackHandler } from './handlers/feedback-handler';

import { AIEventListenerService } from './services/ai-event-listener.service';
import { HangingStateDetectorService } from './services/hanging-state-detector.service';
import { AIReminderEngineService } from './services/ai-reminder-engine.service';
import { AIRiskAnalyzerService } from './services/ai-risk-analyzer.service';
import { AISuggestionStoreService } from './services/ai-suggestion-store.service';
import { AISuggestionFeedbackService } from './services/ai-suggestion-feedback.service';

import { AISuggestionNeo4jProjection } from './projections/ai-suggestion.neo4j.projection';
import { AIRiskNeo4jProjection } from './projections/ai-risk.neo4j.projection';

import { AISuggestionQueryHandlers } from './queries/ai-suggestion.query-handlers';

// Re-export for external use
export { AIEventListenerService } from './services/ai-event-listener.service';
export { AISuggestionStoreService } from './services/ai-suggestion-store.service';
export { AIRiskAnalyzerService } from './services/ai-risk-analyzer.service';
export { AISuggestionFeedbackService } from './services/ai-suggestion-feedback-service';
export * from './events';

// Command handlers - none in Phase 1 (suggestions are auto-generated)
const CommandHandlers: Type<any>[] = [];

// Event handlers
const EventHandlers = [
  SuggestionGeneratedHandler,
  HangingStateHandler,
  RiskAnalysisHandler,
  FeedbackHandler,
  AISuggestionNeo4jProjection,
  AIRiskNeo4jProjection,
];

@Module({
  imports: [
    CqrsModule,
    EventBusModule.forFeature(),
    TypeOrmModule.forFeature([
      AISuggestionEntity,
      AIFeedbackEntity,
      AITelemetryEntity,
    ]),
  ],
  providers: [
    // Core Services
    AIEventListenerService,
    HangingStateDetectorService,
    AIReminderEngineService,
    AIRiskAnalyzerService,
    AISuggestionStoreService,
    AISuggestionFeedbackService,
    
    // Event Handlers
    ...CommandHandlers,
    ...EventHandlers,
    
    // Query Handlers
    ...AISuggestionQueryHandlers,
  ],
  exports: [
    // Services
    AIEventListenerService,
    HangingStateDetectorService,
    AIRiskAnalyzerService,
    AISuggestionStoreService,
    AISuggestionFeedbackService,
    
    // Re-export events
    './events',
  ],
})
export class AIModule {}
```

---

## Event Naming Conventions

Following the ZanaFleet pattern `<Module>.<Entity>.<Action>V<Number>`, the AI events will use the prefix `AI`:

| Event Name | Description |
|------------|-------------|
| `AI.Suggestion.GeneratedV1` | Emitted when AI generates a suggestion |
| `AI.HangingState.DetectedV1` | Emitted when hanging state is detected |
| `AI.Risk.AnalyzedV1` | Emitted when risk analysis completes |
| `AI.Suggestion.FeedbackV1` | Emitted when user provides feedback on suggestion |
| `AI.Telemetry.EmittedV1` | Emitted for AI operation telemetry |
| `AI.Reminder.GeneratedV1` | Emitted when AI generates a reminder suggestion |
| `AI.Suggestion.ExpiredV1` | Emitted when a suggestion expires |
| `AI.Suggestion.AcceptedV1` | Emitted when a suggestion is accepted |
| `AI.Suggestion.RejectedV1` | Emitted when a suggestion is rejected |

### Event Payload Examples

#### AI.Suggestion.GeneratedV1

```typescript
interface AISuggestionGeneratedEventV1 {
  eventId: string;
  eventType: 'AI.Suggestion.GeneratedV1';
  eventVersion: '1.0.0';
  occurredAt: Date;
  aggregateId: string; // suggestion ID
  aggregateType: 'AISuggestion';
  
  // Suggestion details
  suggestionId: string;
  suggestionType: 'workflow_action' | 'reminder' | 'risk_alert' | 'capability_suggestion';
  suggestionText: string;
  suggestionContext: Record<string, unknown>;
  
  // Actor context
  actorId: string;
  actorType: string;
  workspaceId?: string;
  
  // Trigger
  triggerEventType: string;
  triggerEventId: string;
  
  // Metadata
  confidence?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  expiresAt?: Date;
  
  correlationId?: string;
  causationId?: string;
}
```

#### AI.HangingState.DetectedV1

```typescript
interface AIHangingStateDetectedEventV1 {
  eventId: string;
  eventType: 'AI.HangingState.DetectedV1';
  eventVersion: '1.0.0';
  occurredAt: Date;
  aggregateId: string;
  aggregateType: 'ProcessInstance';
  
  // Process context
  instanceId: string;
  definitionId: string;
  currentState: string;
  durationMinutes: number;
  expectedMaxDurationMinutes: number;
  
  // Suggestion
  suggestionId?: string;
  suggestedAction?: string;
  
  correlationId?: string;
  causationId?: string;
}
```

#### AI.Risk.AnalyzedV1

```typescript
interface AIRiskAnalyzedEventV1 {
  eventId: string;
  eventType: 'AI.Risk.AnalyzedV1';
  eventVersion: '1.0.0';
  occurredAt: Date;
  aggregateId: string;
  aggregateType: string; // The entity being analyzed
  
  // Risk assessment
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    contribution: number; // 0-100
    description: string;
  }>;
  
  // Context
  analysisType: 'workflow' | 'transaction' | 'actor' | 'capability';
  contextSnapshot: Record<string, unknown>;
  
  correlationId?: string;
  causationId?: string;
}
```

#### AI.Suggestion.FeedbackV1

```typescript
interface AISuggestionFeedbackEventV1 {
  eventId: string;
  eventType: 'AI.Suggestion.FeedbackV1';
  eventVersion: '1.0.0';
  occurredAt: Date;
  aggregateId: string; // suggestion ID
  aggregateType: 'AISuggestion';
  
  // Feedback details
  feedbackType: 'accepted' | 'rejected' | 'expired';
  suggestionId: string;
  
  // Actor providing feedback
  actorId: string;
  actorType: string;
  workspaceId?: string;
  
  // Optional reason
  reason?: string;
  
  correlationId?: string;
  causationId?: string;
}
```

---

## Data Schema Overview

### AI Suggestion Entity (Postgres)

```typescript
// apps/api/src/modules/ai/entities/ai-suggestion.entity.ts

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AISuggestionType {
  WORKFLOW_ACTION = 'workflow_action',
  REMINDER = 'reminder',
  RISK_ALERT = 'risk_alert',
  CAPABILITY_SUGGESTION = 'capability_suggestion',
}

export enum AISuggestionStatus {
  ACTIVE = 'active',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum AISuggestionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('ai_suggestions')
@Index('idx_ai_suggestions_actor_status', ['actorId', 'status'])
@Index('idx_ai_suggestions_workspace_status', ['workspaceId', 'status'])
@Index('idx_ai_suggestions_type_status', ['suggestionType', 'status'])
@Index('idx_ai_suggestions_expires_at', ['expiresAt'])
export class AISuggestionEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AISuggestionType,
  })
  suggestionType!: AISuggestionType;

  @Column({ type: 'text' })
  suggestionText!: string;

  @Column({ type: 'jsonb', default: {} })
  suggestionContext!: Record<string, unknown>;

  @Column({ type: 'uuid' })
  actorId!: string;

  @Column({ type: 'varchar', nullable: true })
  actorType!: string | null;

  @Column({ type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({
    type: 'enum',
    enum: AISuggestionStatus,
    default: AISuggestionStatus.ACTIVE,
  })
  status!: AISuggestionStatus;

  @Column({
    type: 'enum',
    enum: AISuggestionPriority,
    default: AISuggestionPriority.MEDIUM,
  })
  priority!: AISuggestionPriority;

  @Column({ type: 'float', nullable: true })
  confidence!: number | null;

  // Trigger information
  @Column({ type: 'varchar' })
  triggerEventType!: string;

  @Column({ type: 'uuid' })
  triggerEventId!: string;

  // TTL - suggestions auto-expire
  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejectedAt!: Date | null;

  // Feedback
  @Column({ type: 'text', nullable: true })
  feedbackReason!: string | null;

  // Audit
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
```

### AI Feedback Entity (Postgres)

```typescript
// apps/api/src/modules/ai/entities/ai-feedback.entity.ts

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AIFeedbackType {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('ai_feedback')
@Index('idx_ai_feedback_suggestion_id', ['suggestionId'])
@Index('idx_ai_feedback_actor_id', ['actorId'])
export class AIFeedbackEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  suggestionId!: string;

  @Column({
    type: 'enum',
    enum: AIFeedbackType,
  })
  feedbackType!: AIFeedbackType;

  @Column({ type: 'uuid' })
  actorId!: string;

  @Column({ type: 'varchar' })
  actorType!: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
```

### AI Telemetry Entity (Postgres)

```typescript
// apps/api/src/modules/ai/entities/ai-telemetry.entity.ts

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AITelemetryType {
  SUGGESTION_GENERATED = 'suggestion_generated',
  SUGGESTION_DISPLAYED = 'suggestion_displayed',
  SUGGESTION_ACCEPTED = 'suggestion_accepted',
  SUGGESTION_REJECTED = 'suggestion_rejected',
  RISK_ANALYZED = 'risk_analyzed',
  HANGING_STATE_DETECTED = 'hanging_state_detected',
}

@Entity('ai_telemetry')
@Index('idx_ai_telemetry_actor_id', ['actorId'])
@Index('idx_ai_telemetry_type_created', ['telemetryType', 'createdAt'])
@Index('idx_ai_telemetry_workspace_id', ['workspaceId'])
export class AITelemetryEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: AITelemetryType,
  })
  telemetryType!: AITelemetryType;

  @Column({ type: 'uuid' })
  actorId!: string;

  @Column({ type: 'varchar', nullable: true })
  actorType!: string | null;

  @Column({ type: 'uuid', nullable: true })
  workspaceId!: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @Column({ type: 'float', nullable: true })
  durationMs!: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
```

---

## Integration Points

### 1. Event Bus Integration

The AI module subscribes to domain events from other modules:

| Input Event | Source Module | Handler |
|-------------|---------------|---------|
| `Workflow.Process.StateChangedV1` | Workflow | AIEventListenerService |
| `Capability.UsedV1` | Capability | AIEventListenerService |
| `Interaction.EventCreatedV1` | Interaction | AIEventListenerService |

The AI module publishes its own events:

| Output Event | Subscribers |
|--------------|-------------|
| `AI.Suggestion.GeneratedV1` | Neo4j Projection, Feedback Service |
| `AI.HangingState.DetectedV1` | Neo4j Projection |
| `AI.Risk.AnalyzedV1` | Neo4j Projection |
| `AI.Suggestion.FeedbackV1` | Suggestion Store, Telemetry |

### 2. Database Integration

- **Postgres**: TypeORM entities for persistence (AISuggestionEntity, AIFeedbackEntity, AITelemetryEntity)
- **Neo4j**: ProjectionBuilder for graph updates

### 3. Module Dependencies

```typescript
// In ai.module.ts imports
imports: [
  CqrsModule,
  EventBusModule.forFeature(),  // For subscribing to events
  TypeOrmModule.forFeature([     // For Postgres entities
    AISuggestionEntity,
    AIFeedbackEntity,
    AITelemetryEntity,
  ]),
]
```

### 4. Capability Security

The AI module follows the existing capability-based security model:

- AI suggestions are scoped to actors and workspaces
- Query handlers respect capability checks
- All suggestions include actor/workspace context

---

## Component Responsibilities

### AIEventListenerService

**Responsibility**: Main event subscriber that listens to domain events and triggers AI context building

- Subscribes to `Workflow.Process.StateChangedV1`
- Subscribes to `Capability.UsedV1`  
- Builds AI context from event payload
- Triggers suggestion generation via AISuggestionStoreService
- Emits `AI.Suggestion.GeneratedV1` events

**Public API**:
```typescript
@Injectable()
export class AIEventListenerService {
  // Called by EventBus when relevant events arrive
  async handleWorkflowStateChanged(event: ProcessStateChangedEventV1): Promise<void>;
  async handleCapabilityUsed(event: CapabilityUsedEventV1): Promise<void>;
}
```

### HangingStateDetectorService

**Responsibility**: Poll-based detection of workflow states exceeding expected duration

- Queries active process instances
- Compares elapsed time against expected duration per state
- Emits `AI.HangingState.DetectedV1` when threshold exceeded
- Respects process definition timeout configurations

**Public API**:
```typescript
@Injectable()
export class HangingStateDetectorService {
  // Called periodically by scheduler
  @Cron('*/5 * * * *') // Every 5 minutes
  async detectHangingStates(): Promise<void>;
  
  // Manual trigger for testing
  async detectForInstance(instanceId: string): Promise<AIHangingStateDetectedEventV1 | null>;
}
```

### AIReminderEngineService

**Responsibility**: Generate suggestion-based reminders (NOT direct push/email)

- Analyzes active suggestions approaching expiry
- Generates reminder suggestions
- Respects user notification preferences
- **Does NOT** send push/email - only creates suggestions

**Public API**:
```typescript
@Injectable()
export class AIReminderEngineService {
  // Called periodically
  @Cron('*/15 * * * *') // Every 15 minutes
  async generateReminders(): Promise<void>;
}
```

### AIRiskAnalyzerService

**Responsibility**: Compute risk scores and identify risk factors (READ-ONLY)

- Analyzes workflow patterns
- Analyzes capability usage patterns
- Computes riskScore (0-100)
- Provides riskFactors array with contributions
- Emits `AI.Risk.AnalyzedV1` events
- **Does NOT** take any action, only analyzes

**Public API**:
```typescript
@Injectable()
export class AIRiskAnalyzerService {
  async analyzeWorkflow(workflowInstanceId: string): Promise<RiskAnalysisResult>;
  async analyzeCapability(actorId: string, capabilityName: string): Promise<RiskAnalysisResult>;
  
  // For batch analysis
  async analyzeWorkspace(workspaceId: string): Promise<RiskAnalysisResult[]>;
}

interface RiskAnalysisResult {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    contribution: number;
    description: string;
  }>;
}
```

### AISuggestionStoreService

**Responsibility**: Persistence layer for AI suggestions

- Create suggestions with TTL
- Deduplicate similar suggestions
- Query by actor + context
- Update status on feedback
- Handle expiry

**Public API**:
```typescript
@Injectable()
export class AISuggestionStoreService {
  async createSuggestion(data: CreateSuggestionDTO): Promise<AISuggestionEntity>;
  async findByActor(actorId: string, options?: QueryOptions): Promise<AISuggestionEntity[]>;
  async findActiveByContext(contextKey: string, contextValue: unknown): Promise<AISuggestionEntity[]>;
  async markAccepted(suggestionId: string, actorId: string): Promise<void>;
  async markRejected(suggestionId: string, actorId: string, reason?: string): Promise<void>;
  async expireOldSuggestions(): Promise<number>;
}
```

### AISuggestionFeedbackService

**Responsibility**: Capture and process user feedback on suggestions

- Accept feedback (accepted/rejected/expired)
- Store feedback in AIFeedbackEntity
- Emit telemetry events
- Update suggestion status

**Public API**:
```typescript
@Injectable()
export class AISuggestionFeedbackService {
  async acceptSuggestion(suggestionId: string, actorId: string): Promise<void>;
  async rejectSuggestion(suggestionId: string, actorId: string, reason?: string): Promise<void>;
  async expireSuggestion(suggestionId: string): Promise<void>;
  
  // Query feedback
  async getFeedbackBySuggestion(suggestionId: string): Promise<AIFeedbackEntity[]>;
  async getFeedbackByActor(actorId: string): Promise<AIFeedbackEntity[]>;
}
```

---

## Neo4j Projections

### AISuggestionNeo4jProjection

Projects AI suggestions to Neo4j for real-time visibility:

```cypher
// Node: AISuggestion
// Properties: id, type, text, status, priority, confidence, actorId, workspaceId, createdAt
// Relationships: 
//   - (actor:Actor)-[:RECEIVED_SUGGESTION]->(s:AISuggestion)
//   - (s:AISuggestion)-[:RELATED_TO_WORKFLOW]->(p:ProcessInstance)
//   - (s:AISuggestion)-[:SUGGESTED_ACTION]->(action)
```

### AIRiskNeo4jProjection

Projects risk analysis results to Neo4j:

```cypher
// Node: AIRiskAnalysis
// Properties: id, score, level, analysisType, actorId, workspaceId, createdAt
// Relationships:
//   - (r:AIRiskAnalysis)-[:ANALYZED_FOR]->(a:Actor)
//   - (r:AIRiskAnalysis)-[:RISK_FACTOR]->(factor:RiskFactor)
```

---

## Phase 1 Constraints & Safety

### Non-Automating by Default

- All AI outputs are **suggestions only**
- No automatic state mutation
- No automatic push notifications
- No automatic email/SMS sending

### Backwards Compatibility

- Existing event schemas unchanged
- AI module is opt-in for existing flows
- No breaking changes to existing modules

### Extensibility for Phase 2+

- Clean separation of services allows easy addition of:
  - Auto-execution handlers
  - Direct notification integration
  - ML model updates
  - Additional suggestion types
- Event-driven architecture allows easy addition of new subscribers

### Observability

- All AI operations emit telemetry events
- All suggestions are auditable via events
- Risk analysis results are persisted
- Feedback loop is complete

---

## Implementation Checklist

- [ ] Create AI module folder structure
- [ ] Implement entity definitions (AISuggestionEntity, AIFeedbackEntity, AITelemetryEntity)
- [ ] Implement event definitions (all Phase 1 events)
- [ ] Implement AISuggestionStoreService with TTL and deduplication
- [ ] Implement AIEventListenerService for domain event subscription
- [ ] Implement HangingStateDetectorService with scheduler
- [ ] Implement AIRiskAnalyzerService (read-only)
- [ ] Implement AIReminderEngineService (suggestion-only)
- [ ] Implement AISuggestionFeedbackService
- [ ] Implement Neo4j projections
- [ ] Add AI module to app.module.ts
- [ ] Write unit tests for all services
- [ ] Write integration tests
- [ ] Add database migration for AI tables

---

## Summary

Phase 1 creates a minimal but complete foundation for AI intelligence:

1. **Event-driven** - Subscribes to existing domain events, emits AI-specific events
2. **Observable** - Full telemetry and audit trail via events
3. **Safe** - Suggestions only, no automatic actions
4. **Extensible** - Clean service architecture ready for Phase 2+
5. **Compatible** - No breaking changes, follows existing patterns
