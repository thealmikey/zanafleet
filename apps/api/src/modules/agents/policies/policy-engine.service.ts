// =============================================================================
// Policy Engine Service - Evaluates automation policies for agents
// Returns PolicyDecision: EXECUTE, SUGGEST, REQUIRE_CONSENT, BLOCK, ESCALATE
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';

import {
  Agent,
  AgentContext,
  AgentDecision,
  AutomationPolicy,
  PolicyDecision,
  AIResult,
} from '../types';

/**
 * Default policy configuration
 */
const DEFAULT_POLICY: AutomationPolicy = {
  id: 'default',
  name: 'Default Automation Policy',
  version: '1.0.0',
  confidenceThreshold: 0.7,
  maxRiskScore: 0.8,
  cooldownWindowMs: 60000,
  allowedCapabilities: [],
  failOpen: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

@Injectable()
export class PolicyEngine {
  private readonly logger = new Logger(PolicyEngine.name);
  private readonly policies: Map<string, AutomationPolicy> = new Map();

  constructor() {
    // Register default policy
    this.policies.set(DEFAULT_POLICY.id, DEFAULT_POLICY);
  }

  /**
   * Register a policy
   */
  registerPolicy(policy: AutomationPolicy): void {
    this.policies.set(policy.id, policy);
    this.logger.log(`Registered policy: ${policy.name} (${policy.id})`);
  }

  /**
   * Evaluate agent execution against policy
   */
  async evaluate(
    agent: Agent,
    _context: AgentContext,
    aiResult?: AIResult,
  ): Promise<AgentDecision> {
    const policy = await this.getPolicy(agent.policyId);

    // Check capability whitelist
    if (!this.validateCapabilities(agent, policy)) {
      return {
        decision: PolicyDecision.BLOCK,
        reason: 'Agent capabilities not in policy allowed list',
        policyId: policy.id,
        requiresConsent: false,
      };
    }

    // Check cooldown window
    if (await this.isInCooldown(agent.id, policy)) {
      return {
        decision: PolicyDecision.BLOCK,
        reason: 'Agent is in cooldown window',
        policyId: policy.id,
        requiresConsent: false,
      };
    }

    // Evaluate AI result if available
    if (aiResult) {
      // Check confidence threshold
      if (aiResult.confidence < policy.confidenceThreshold) {
        return {
          decision: PolicyDecision.REQUIRE_CONSENT,
          reason: `AI confidence (${aiResult.confidence}) below threshold (${policy.confidenceThreshold})`,
          policyId: policy.id,
          riskScore: aiResult.riskScore,
          confidenceScore: aiResult.confidence,
          requiresConsent: true,
        };
      }

      // Check risk score
      if (aiResult.riskScore > policy.maxRiskScore) {
        return {
          decision: PolicyDecision.BLOCK,
          reason: `AI risk score (${aiResult.riskScore}) exceeds max allowed (${policy.maxRiskScore})`,
          policyId: policy.id,
          riskScore: aiResult.riskScore,
          confidenceScore: aiResult.confidence,
          requiresConsent: false,
        };
      }

      // Medium risk - require consent
      if (aiResult.riskScore > 0.5) {
        return {
          decision: PolicyDecision.REQUIRE_CONSENT,
          reason: `Medium risk score requires user consent: ${aiResult.explanation}`,
          policyId: policy.id,
          riskScore: aiResult.riskScore,
          confidenceScore: aiResult.confidence,
          requiresConsent: true,
        };
      }

      // High confidence, low risk - execute directly
      if (aiResult.confidence >= 0.9 && aiResult.riskScore <= 0.3) {
        return {
          decision: PolicyDecision.EXECUTE,
          reason: `High confidence (${aiResult.confidence}), low risk - executing`,
          policyId: policy.id,
          riskScore: aiResult.riskScore,
          confidenceScore: aiResult.confidence,
          requiresConsent: false,
        };
      }

      // Default to suggest for moderate confidence
      return {
        decision: aiResult.confidence >= policy.confidenceThreshold
          ? PolicyDecision.EXECUTE
          : PolicyDecision.SUGGEST,
        reason: aiResult.explanation,
        policyId: policy.id,
        riskScore: aiResult.riskScore,
        confidenceScore: aiResult.confidence,
        requiresConsent: false,
      };
    }

    // No AI result - use policy defaults
    return {
      decision: policy.failOpen ? PolicyDecision.EXECUTE : PolicyDecision.REQUIRE_CONSENT,
      reason: policy.failOpen
        ? 'No AI analysis, executing (fail-open mode)'
        : 'No AI analysis, consent required (fail-closed mode)',
      policyId: policy.id,
      requiresConsent: !policy.failOpen,
    };
  }

  /**
   * Validate that agent capabilities are in policy allowed list
   */
  private validateCapabilities(agent: Agent, policy: AutomationPolicy): boolean {
    if (policy.allowedCapabilities.length === 0) {
      return true; // Empty means allow all
    }

    return agent.allowedCapabilities.every((cap) =>
      policy.allowedCapabilities.includes(cap),
    );
  }

  /**
   * Check if agent is in cooldown window
   */
  private async isInCooldown(_agentId: string, _policy: AutomationPolicy): Promise<boolean> {
    // Would check Redis/cache for last execution time
    // For now, always return false (not in cooldown)
    return false;
  }

  /**
   * Get policy by ID
   */
  private async getPolicy(policyId: string): Promise<AutomationPolicy> {
    const policy = this.policies.get(policyId);
    if (policy) {
      return policy;
    }

    // Return default policy if not found
    this.logger.warn(`Policy not found: ${policyId}, using default`);
    return DEFAULT_POLICY;
  }
}
