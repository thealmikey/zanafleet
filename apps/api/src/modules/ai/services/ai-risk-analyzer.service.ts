import { Injectable, Logger } from '@nestjs/common';

import {
  AIRiskAnalysis,
  AIRiskAnalysisRequest,
  RiskFactor,
  DEFAULT_WORKFLOW_RISK_FACTORS,
} from '../interfaces/ai-risk-analysis.interface';

/**
 * AI Risk Analyzer Service
 *
 * Computes risk scores for AI suggestions.
 * This is read-only - the risk score is computed but not used for automatic decisions.
 */
@Injectable()
export class AIRiskAnalyzerService {
  private readonly logger = new Logger(AIRiskAnalyzerService.name);

  /**
   * Analyze risk for a given context
   */
  async analyzeRisk(request: AIRiskAnalysisRequest): Promise<AIRiskAnalysis> {
    const startTime = Date.now();

    this.logger.debug(
      `Analyzing risk for actor=${request.actorId}, context=${request.contextType}:${request.contextId}`
    );

    const riskFactors = this.computeRiskFactors(request);
    let riskScore = this.computeRiskScore(riskFactors);

    // Adjust score based on confidence: lower confidence = higher risk
    // Confidence 0 = +40 to score, Confidence 1 = -5 from score
    const confidenceAdjustment = Math.round((1 - request.confidence) * 45 - 5);
    riskScore = Math.min(100, Math.max(0, riskScore + confidenceAdjustment));

    const analysis: AIRiskAnalysis = {
      riskScore,
      riskFactors,
      analysisTimestamp: new Date(),
      contextId: request.contextId,
      actorId: request.actorId,
    };

    const processingTime = Date.now() - startTime;
    this.logger.debug(
      `Risk analysis complete: score=${riskScore}, factors=${riskFactors.length}, time=${processingTime}ms`
    );

    return analysis;
  }

  /**
   * Compute individual risk factors
   */
  private computeRiskFactors(request: AIRiskAnalysisRequest): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Factor 1: Capability confidence
    const confidenceRisk = this.computeConfidenceRisk(request.confidence);
    factors.push(confidenceRisk);

    // Factor 2: Workflow state risk
    const stateRisk = this.computeWorkflowStateRisk(request.workflowState);
    factors.push(stateRisk);

    // Factor 3: Context complexity
    const complexityRisk = this.computeContextComplexityRisk(request);
    factors.push(complexityRisk);

    // Factor 4: Actor history (simulated)
    const historyRisk = this.computeActorHistoryRisk(request.actorId);
    factors.push(historyRisk);

    // Factor 5: Related actors
    const relatedRisk = this.computeRelatedActorsRisk(request);
    factors.push(relatedRisk);

    return factors;
  }

  /**
   * Compute risk score from factors (0-100)
   */
  private computeRiskScore(factors: RiskFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const factor of factors) {
      // Convert individual factor to a 0-100 risk contribution
      const factorContribution = factor.weight * 100;
      weightedSum += factorContribution * factor.weight;
      totalWeight += factor.weight;
    }

    if (totalWeight === 0) return 0;

    // Normalize and round
    const score = Math.round(weightedSum / totalWeight);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Compute confidence-based risk
   * Lower confidence = higher risk
   */
  private computeConfidenceRisk(confidence: number): RiskFactor {
    // Use a fixed weight but the confidence will affect final score
    // Lower confidence = higher risk adjustment in final score
    return {
      factor: 'capability_confidence',
      weight: 0.25,
      description: `Confidence in the suggested capability: ${(confidence * 100).toFixed(0)}%`,
    };
  }

  /**
   * Compute workflow state risk
   */
  private computeWorkflowStateRisk(workflowState: string): RiskFactor {
    // Define risk levels for different workflow states
    const highRiskStates = ['pending_approval', 'manual_review', 'escalated'];
    const mediumRiskStates = ['in_progress', 'waiting'];
    // lowRiskStates reserved for Phase 2

    let riskWeight = 0.1;

    if (highRiskStates.includes(workflowState.toLowerCase())) {
      riskWeight = 0.3;
    } else if (mediumRiskStates.includes(workflowState.toLowerCase())) {
      riskWeight = 0.2;
    }

    return {
      factor: 'workflow_state',
      weight: riskWeight,
      description: `Current workflow state: ${workflowState}`,
    };
  }

  /**
   * Compute context complexity risk
   */
  private computeContextComplexityRisk(_request: AIRiskAnalysisRequest): RiskFactor {
    // Reserved for Phase 2 complexity calculation
    // TODO: Implement complexity calculation based on request metadata

    return {
      factor: 'context_complexity',
      weight: 0.2,
      description: `Context complexity factor based on metadata`,
    };
  }

  /**
   * Compute actor history risk (simulated)
   * In a real implementation, this would query historical data
   */
  private computeActorHistoryRisk(_actorId: string): RiskFactor {
    // Simulated: assume good history
    // In production, this would check:
    // - Previous suggestion acceptance rate
    // - Error rates
    // - Completion rates

    return {
      factor: 'actor_history',
      weight: 0.15,
      description: 'Historical patterns of the actor (simulated)',
    };
  }

  /**
   * Compute related actors risk
   */
  private computeRelatedActorsRisk(request: AIRiskAnalysisRequest): RiskFactor {
    const metadata = request.metadata ?? {};
    const relatedActors = metadata.relatedActors as string[] | undefined;
    const actorCount = relatedActors?.length ?? 0;

    // More related actors = more complexity = slightly higher risk
    const riskWeight = Math.min(0.15, 0.05 + actorCount * 0.02);

    return {
      factor: 'related_actors',
      weight: riskWeight,
      description: `Number of related actors: ${actorCount}`,
    };
  }

  /**
   * Get default risk factors
   */
  getDefaultRiskFactors(): RiskFactor[] {
    return [...DEFAULT_WORKFLOW_RISK_FACTORS];
  }
}
