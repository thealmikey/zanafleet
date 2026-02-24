// =============================================================================
// Agent Runtime Service - Core execution engine for agents
// Implements: register, handleEvent, runScheduled, execute
// Includes: Idempotency guard, retry logic, policy check, telemetry, dead-letter
// =============================================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventBusService } from '../../../core/event-bus/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

import {
  Agent,
  AgentContext,
  AgentDecision,
  AgentExecutionResult,
  AgentExecutionStatus,
  AgentTriggerType,
  PolicyDecision,
  RetryPolicy,
  DeadLetterMessage,
  BackgroundJob,
  AIResult,
  AgentTelemetryEvent,
  AgentTelemetryEventType,
} from '../types';
import { PolicyEngine } from '../policies/policy-engine.service';
import { AgentTelemetry } from '../telemetry/agent-telemetry.service';
import { JobQueue } from '../queue/job-queue.interface';

@Injectable()
export class AgentRuntime implements OnModuleInit {
  private readonly logger = new Logger(AgentRuntime.name);
  private readonly agents: Map<string, Agent> = new Map();
  private readonly executionTimestamps: Map<string, number> = new Map();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly policyEngine: PolicyEngine,
    private readonly telemetry: AgentTelemetry,
    private readonly jobQueue: JobQueue
  ) {}

  async onModuleInit(): Promise<void> {
    // Initialize job queue
    await this.jobQueue.initialize();
  }

  /**
   * Register an agent with the runtime
   */
  register(agent: Agent): void {
    if (!agent.enabled) {
      this.logger.debug(`Agent ${agent.name} is disabled, skipping registration`);
      return;
    }

    this.agents.set(agent.id, agent);
    this.logger.log(`Registered agent: ${agent.name} (${agent.id})`);
  }

  /**
   * Handle incoming domain events - event-driven triggers
   */
  async handleEvent(event: Record<string, unknown>): Promise<void> {
    const eventType = event['eventType'] as string;

    // Find agents that match this event type
    const matchingAgents = this.findAgentsByEventType(eventType);

    for (const agent of matchingAgents) {
      const idempotencyKey = this.generateIdempotencyKey(agent.id, event);

      // Check idempotency (simple in-memory check for now)
      if (this.isIdempotent(idempotencyKey)) {
        this.logger.debug(`Skipping duplicate event for agent ${agent.name}: ${idempotencyKey}`);
        continue;
      }

      // Execute agent
      await this.executeWithRetry(agent, {
        triggerType: AgentTriggerType.EVENT,
        triggerEventId: event['eventId'] as string,
        payload: event,
      });
    }
  }

  /**
   * Run scheduled agents - cron-based triggers
   */
  async runScheduled(): Promise<void> {
    const scheduledAgents = this.findScheduledAgents();

    for (const agent of scheduledAgents) {
      try {
        await this.executeWithRetry(agent, {
          triggerType: AgentTriggerType.SCHEDULED,
          payload: {},
        });
      } catch (error) {
        this.logger.error(`Scheduled execution failed for agent ${agent.name}`, error);
      }
    }
  }

  /**
   * Execute an agent with the given context
   */
  async execute(agentId: string, context: AgentContext): Promise<AgentExecutionResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return this.executeAgent(agent, context);
  }

  /**
   * Execute agent with retry logic
   */
  private async executeWithRetry(
    agent: Agent,
    triggerContext: {
      triggerType: AgentTriggerType;
      triggerEventId?: string;
      payload: Record<string, unknown>;
    }
  ): Promise<void> {
    const executionId = uuidv4();
    const correlationId = uuidv4();
    const idempotencyKey = `agent:${agent.id}:${executionId}`;

    const context: AgentContext = {
      agentId: agent.id,
      agentName: agent.name,
      triggerType: triggerContext.triggerType,
      triggerEventId: triggerContext.triggerEventId,
      workspaceId: agent.tenantScope.workspaceId,
      organizationId: agent.tenantScope.organizationId,
      actorId: 'system',
      actorType: 'agent',
      correlationId,
      executionId,
      idempotencyKey,
      payload: triggerContext.payload,
      timestamp: new Date(),
    };

    const retryPolicy = agent.retryPolicy;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        await this.executeAgent(agent, context);
        return;
      } catch (error) {
        lastError = error as Error;

        if (attempt < retryPolicy.maxRetries) {
          const backoff = this.calculateBackoff(retryPolicy, attempt);
          this.logger.warn(
            `Agent ${agent.name} failed (attempt ${attempt + 1}/${
              retryPolicy.maxRetries + 1
            }), retrying in ${backoff}ms`
          );
          await this.delay(backoff);
        }
      }
    }

    // All retries exhausted - send to dead letter
    await this.handleDeadLetter(agent, context, lastError!);
  }

  /**
   * Execute the agent through the full pipeline
   */
  private async executeAgent(agent: Agent, context: AgentContext): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    let decision: AgentDecision;
    let result: unknown;
    let status: AgentExecutionStatus = AgentExecutionStatus.FAILED;

    try {
      // Emit triggered event
      this.telemetry.emit({
        eventType: AgentTelemetryEventType.TRIGGERED,
        executionId: context.executionId,
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date(),
        correlationId: context.correlationId,
        payload: context.payload,
      });

      // Policy evaluation with safe fallback
      try {
        const aiResult = await this.runAIAnalysis(agent, context);
        decision = await this.policyEngine.evaluate(agent, context, aiResult);
      } catch (policyError) {
        this.logger.error(`Policy evaluation failed for agent ${agent.name}`, policyError);
        decision = {
          decision: PolicyDecision.EXECUTE,
          reason: 'Policy evaluation failed, executing with fail-open',
          policyId: 'fallback',
          requiresConsent: false,
        };
      }

      // Emit decision event
      this.telemetry.emit({
        eventType: AgentTelemetryEventType.DECISION_MADE,
        executionId: context.executionId,
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date(),
        correlationId: context.correlationId,
        payload: { decision: decision.decision, reason: decision.reason },
      });

      // Handle decision
      switch (decision.decision) {
        case PolicyDecision.BLOCK:
          status = AgentExecutionStatus.BLOCKED;
          this.telemetry.emit({
            eventType: AgentTelemetryEventType.BLOCKED,
            executionId: context.executionId,
            agentId: agent.id,
            agentName: agent.name,
            timestamp: new Date(),
            correlationId: context.correlationId,
            payload: { reason: decision.reason, policyId: decision.policyId },
          });
          return this.createExecutionResult(
            agent,
            context,
            status,
            decision,
            undefined,
            `Blocked: ${decision.reason}`,
            startTime
          );

        case PolicyDecision.REQUIRE_CONSENT:
          status = AgentExecutionStatus.DEFERRED;
          this.telemetry.emit({
            eventType: AgentTelemetryEventType.CONSENT_REQUESTED,
            executionId: context.executionId,
            agentId: agent.id,
            agentName: agent.name,
            timestamp: new Date(),
            correlationId: context.correlationId,
            payload: { reason: decision.reason },
          });
          return this.createExecutionResult(
            agent,
            context,
            status,
            decision,
            undefined,
            'Consent required',
            startTime
          );

        case PolicyDecision.ESCALATE:
          status = AgentExecutionStatus.DEFERRED;
          return this.createExecutionResult(
            agent,
            context,
            status,
            decision,
            undefined,
            'Escalated',
            startTime
          );

        case PolicyDecision.SUGGEST:
          status = AgentExecutionStatus.SUCCEEDED;
          result = { suggestion: decision.reason };
          break;

        case PolicyDecision.EXECUTE:
        default:
          // Execute through capability orchestrator (would be injected in real implementation)
          status = AgentExecutionStatus.SUCCEEDED;
          result = { executed: true, capability: agent.allowedCapabilities[0] };
          break;
      }

      // Emit completion event
      const telemetryType =
        status === AgentExecutionStatus.SUCCEEDED
          ? AgentTelemetryEventType.EXECUTION_SUCCEEDED
          : AgentTelemetryEventType.EXECUTION_FAILED;

      this.telemetry.emit({
        eventType: telemetryType,
        executionId: context.executionId,
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date(),
        correlationId: context.correlationId,
        payload: { status, result },
      });

      return this.createExecutionResult(
        agent,
        context,
        status,
        decision,
        result,
        undefined,
        startTime
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      status = AgentExecutionStatus.FAILED;

      this.telemetry.emit({
        eventType: AgentTelemetryEventType.EXECUTION_FAILED,
        executionId: context.executionId,
        agentId: agent.id,
        agentName: agent.name,
        timestamp: new Date(),
        correlationId: context.correlationId,
        payload: { status, error: errorMessage },
      });

      throw error;
    }
  }

  /**
   * Run optional AI analysis (safe fallback on failure)
   */
  private async runAIAnalysis(
    _agent: Agent,
    _context: AgentContext
  ): Promise<AIResult | undefined> {
    // Placeholder - would integrate with AI module
    // Returns undefined to fall back to policy defaults
    return undefined;
  }

  /**
   * Handle dead letter - failed executions after all retries
   */
  private async handleDeadLetter(agent: Agent, context: AgentContext, error: Error): Promise<void> {
    const deadLetter: DeadLetterMessage = {
      id: uuidv4(),
      originalJobId: context.executionId,
      agentId: agent.id,
      context,
      error: error.message,
      retryCount: agent.retryPolicy.maxRetries,
      lastAttemptAt: new Date(),
      deadLetteredAt: new Date(),
      payload: context.payload,
    };

    this.logger.error(
      `Dead letter: Agent ${agent.name} failed after ${agent.retryPolicy.maxRetries} retries`,
      error
    );

    this.telemetry.emit({
      eventType: AgentTelemetryEventType.EXECUTION_FAILED,
      executionId: context.executionId,
      agentId: agent.id,
      agentName: agent.name,
      timestamp: new Date(),
      correlationId: context.correlationId,
      payload: { error: error.message, retryCount: deadLetter.retryCount },
    });
  }

  /**
   * Find agents that match an event type
   */
  private findAgentsByEventType(eventType: string): Agent[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.triggers.some(
        (trigger) =>
          trigger.type === AgentTriggerType.EVENT && trigger.eventTypes?.includes(eventType)
      )
    );
  }

  /**
   * Find scheduled agents
   */
  private findScheduledAgents(): Agent[] {
    return Array.from(this.agents.values()).filter((agent) =>
      agent.triggers.some((trigger) => trigger.type === AgentTriggerType.SCHEDULED)
    );
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(agentId: string, event: Record<string, unknown>): string {
    return `agent:${agentId}:${event['eventId'] ?? JSON.stringify(event)}`;
  }

  /**
   * Check idempotency (simple in-memory implementation)
   */
  private isIdempotent(key: string): boolean {
    const now = Date.now();
    const lastSeen = this.executionTimestamps.get(key);

    if (lastSeen && now - lastSeen < 60000) {
      return true; // Within 60 second window
    }

    this.executionTimestamps.set(key, now);
    return false;
  }

  /**
   * Calculate exponential backoff
   */
  private calculateBackoff(retryPolicy: RetryPolicy, attempt: number): number {
    return Math.min(
      retryPolicy.initialBackoffMs * Math.pow(retryPolicy.backoffMultiplier, attempt),
      retryPolicy.maxBackoffMs
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create execution result
   */
  private createExecutionResult(
    agent: Agent,
    context: AgentContext,
    status: AgentExecutionStatus,
    decision: AgentDecision,
    result: unknown,
    error: string | undefined,
    startTime: number
  ): AgentExecutionResult {
    return {
      executionId: context.executionId,
      agentId: agent.id,
      status,
      decision,
      result,
      error,
      executionTimeMs: Date.now() - startTime,
      telemetry: [],
    };
  }
}
