/**
 * AI Risk Analysis Interface
 *
 * Represents the risk analysis results for an AI suggestion.
 * This is read-only - the risk score is computed but not used for automatic decisions.
 */

/**
 * Risk Factor
 *
 * Individual factor that contributes to the overall risk score
 */
export interface RiskFactor {
  /** Name of the risk factor */
  factor: string;

  /** Weight of this factor (0-1) */
  weight: number;

  /** Description of the risk factor */
  description: string;
}

/**
 * AI Risk Analysis
 *
 * Complete risk analysis result
 */
export interface AIRiskAnalysis {
  /** Overall risk score (0-100) */
  riskScore: number;

  /** Individual risk factors */
  riskFactors: RiskFactor[];

  /** When the analysis was performed */
  analysisTimestamp: Date;

  /** Context ID for the analysis */
  contextId?: string;

  /** Actor ID for the analysis */
  actorId?: string;
}

/**
 * AI Risk Analysis Request
 */
export interface AIRiskAnalysisRequest {
  actorId: string;
  contextType: string;
  contextId: string;
  workflowState: string;
  capability: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

/**
 * Risk Level Categories
 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Helper to determine risk level from score
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score < 25) return RiskLevel.LOW;
  if (score < 50) return RiskLevel.MEDIUM;
  if (score < 75) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

/**
 * Default risk factors for workflow states
 */
export const DEFAULT_WORKFLOW_RISK_FACTORS: RiskFactor[] = [
  {
    factor: 'workflow_duration',
    weight: 0.3,
    description: 'Time spent in current workflow state',
  },
  {
    factor: 'capability_confidence',
    weight: 0.2,
    description: 'Confidence in the suggested capability',
  },
  {
    factor: 'actor_history',
    weight: 0.2,
    description: 'Historical patterns of the actor',
  },
  {
    factor: 'context_complexity',
    weight: 0.15,
    description: 'Complexity of the current context',
  },
  {
    factor: 'related_actors',
    weight: 0.15,
    description: 'Number and relevance of related actors',
  },
];
