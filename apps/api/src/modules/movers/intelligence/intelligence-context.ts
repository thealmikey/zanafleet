import { PolicyAdjustment } from '../domain/move-estimate';
import { MoveProfile } from '../domain/move-profile';
import { VehicleCapabilityProfile } from '../domain/vehicle-capability-profile';
import type { MediaInsight } from '../media-insight';
import { NormalizedLocation } from '../services/location-normalization.service';

/**
 * Demand signals containing temporal and contextual demand indicators
 */
export interface DemandSignals {
  /** Current demand surge level as a decimal multiplier */
  demandMultiplier: number;
  /** Day of week where 0 = Sunday */
  dayOfWeek: number;
  /** Month where 0 = January */
  month: number;
  /** Days until nearest holiday */
  holidayProximity: number;
  /** Season classification */
  seasonClassification: 'local' | 'regional' | 'long-distance';
}

/**
 * Metadata about the intelligence request
 */
export interface IntelligenceMetadata {
  /** ISO timestamp when the request was made */
  requestTimestamp: string;
  /** Correlation ID for tracing across services */
  correlationId: string;
  /** Source of the request: api, web, or mobile */
  source: 'api' | 'web' | 'mobile';
  /** Version of intelligence rules */
  quoteVersion: string;
  /** Client preferences for the move */
  clientPreferences?: {
    /** Budget constraints if specified */
    budgetConstraints?: {
      maxBudget?: number;
      minBudget?: number;
    };
    /** Preferred service level */
    serviceLevel?: 'standard' | 'premium' | 'economy';
    /** Specific vehicle preferences */
    vehiclePreferences?: string[];
  };
}

/**
 * Location context containing normalized origin and destination
 */
export interface LocationContext {
  /** Origin location */
  origin: NormalizedLocation;
  /** Destination location */
  destination: NormalizedLocation;
}

/**
 * IntelligenceContext is a snapshot object that wraps all inputs required
 * for agentic reasoning about moving jobs. It serves as the single source
 * of truth for the MoveIntelligenceEngine.
 */
export interface IntelligenceContext {
  /** Move profile containing estimated volume, labor, and special requirements */
  moveProfile: MoveProfile;
  /** Array of available vehicles for matching */
  availableVehicles: VehicleCapabilityProfile[];
  /** Temporal and contextual demand indicators */
  demandSignals: DemandSignals;
  /** Metadata about the intelligence request */
  metadata: IntelligenceMetadata;
  /** Normalized location context */
  locationContext?: LocationContext;
  /** Applicable policy adjustments */
  policyContext?: PolicyAdjustment[];
  /**
   * Media insight from AI analysis of uploaded photos/videos.
   * Optional - may be null if no media was uploaded or analysis failed.
   */
  mediaInsight?: MediaInsight | null;
  /**
   * Source of the move profile estimation.
   * Indicates whether the profile came from legacy estimation or media analysis.
   */
  profileSource: 'legacy' | 'media-enhanced' | 'media-only';
}

/**
 * Vehicle recommendation within a move recommendation
 */
export interface VehicleRecommendation {
  /** The selected vehicle profile */
  selectedVehicle: VehicleCapabilityProfile;
  /** Match score from 0-100 */
  matchScore: number;
  /** Alternative vehicles ranked by match score */
  alternativeVehicles: Array<{
    vehicle: VehicleCapabilityProfile;
    matchScore: number;
    reason: string;
  }>;
}

/**
 * Pricing adjustments for the recommendation
 */
export interface PricingAdjustment {
  /** Base adjustment percentage */
  baseAdjustment: number;
  /** Demand-based adjustment percentage */
  demandAdjustment: number;
  /** Complexity-based adjustment percentage */
  complexityAdjustment: number;
  /** Total adjustment percentage */
  totalAdjustment: number;
  /** Human-readable explanation of pricing */
  explanation: string;
}

/**
 * Risk factor detail
 */
export interface RiskFactor {
  /** Name of the risk factor */
  factorName: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high';
  /** Suggested mitigation */
  mitigation: string;
}

/**
 * Risk assessment for the move
 */
export interface RiskAssessment {
  /** Overall risk score from 0-100 */
  overallRiskScore: number;
  /** Array of identified risk factors */
  riskFactors: RiskFactor[];
  /** Required precautions for the move */
  requiredPrecautions: string[];
  /** Estimated probability of successful completion (0-1) */
  successProbability: number;
}

/**
 * Reasoning chain step for auditability
 */
export interface ReasoningStep {
  /** Name of the reasoning step */
  stepName: string;
  /** Decision made at this step */
  decision: string;
  /** Supporting data for the decision */
  supportingData: Record<string, unknown>;
}

/**
 * Complete move recommendation from the intelligence engine
 */
export interface MoveRecommendation {
  /** ISO timestamp when recommendation was generated */
  recommendationTimestamp: string;
  /** Semantic version of intelligence rules */
  intelligenceVersion: string;
  /** Vehicle recommendation details */
  vehicleRecommendation: VehicleRecommendation;
  /** Pricing adjustment details */
  pricingAdjustment: PricingAdjustment;
  /** Risk assessment details */
  riskAssessment: RiskAssessment;
  /** Confidence score from 0-1 */
  confidenceScore: number;
  /** Reasoning chain for auditability */
  reasoningChain: ReasoningStep[];
  /** Alternative recommendations */
  alternatives?: MoveRecommendation[];
}

/**
 * Options for building an IntelligenceContext
 */
export interface IntelligenceContextOptions {
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Source of the request */
  source?: 'api' | 'web' | 'mobile';
  /** Version of intelligence rules */
  quoteVersion?: string;
  /** Requested date for demand calculation */
  requestedDate?: Date;
  /** Client preferences */
  clientPreferences?: IntelligenceMetadata['clientPreferences'];
}

/**
 * Result of merging MediaInsight with a base MoveProfile.
 * Contains the refined profile and details about what was modified.
 */
export interface ProfileMergeResult {
  /** The refined move profile after merging with media insight */
  profile: MoveProfile;
  /** Details about what was modified during the merge */
  mergeDetails: {
    /** Whether the estimated volume was overridden from media analysis */
    volumeOverridden: boolean;
    /** Whether the labor requirement was adjusted from media analysis */
    laborAdjusted: boolean;
    /** Whether the fragility factor was set from media analysis */
    fragilitySet: boolean;
    /** Number of special handling items added from media analysis */
    itemsAdded: number;
    /** Confidence score of the media insight source (0-1) */
    sourceConfidence: number;
  };
}
