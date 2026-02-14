import { Injectable, Logger } from '@nestjs/common';

import { MoveProfile } from '../domain/move-profile';
import { VehicleCapabilityProfile } from '../domain/vehicle-capability-profile';

// import { PolicyAdjustment, calculateDemandMultiplier } from '../domain/move-estimate';
import {
  IntelligenceContext,
  MoveRecommendation,
  VehicleRecommendation,
  PricingAdjustment,
  RiskAssessment,
  RiskFactor,
  DemandSignals,
  ReasoningStep,
} from './intelligence-context';

/**
 * Intelligence engine version for tracking rule changes
 */
export const INTELLIGENCE_VERSION = '1.0.0';

/**
 * Scoring weights for optimization
 */
const SCORING_WEIGHTS = {
  volume: 0.4,
  labor: 0.2,
  features: 0.2,
  cost: 0.2,
};

/**
 * MoveIntelligenceEngine - Reasoning layer for move recommendations
 * 
 * Implements three-phase operation:
 * 1. Feasibility Analysis - validate vehicles satisfy MoveProfile requirements
 * 2. Optimization Scoring - weighted criteria evaluation
 * 3. Recommendation Synthesis - generate complete recommendation
 */
@Injectable()
export class MoveIntelligenceEngine {
  private readonly logger = new Logger(MoveIntelligenceEngine.name);

  /**
   * Generate a move recommendation from intelligence context
   */
  async generateRecommendation(context: IntelligenceContext): Promise<MoveRecommendation> {
    this.logger.debug('Generating move recommendation from context');

    const reasoningChain: ReasoningStep[] = [];
    const startTime = Date.now();

    // Phase 1: Feasibility Analysis
    const feasibilityResult = this.analyzeFeasibility(context.moveProfile, context.availableVehicles);
    reasoningChain.push(...feasibilityResult.reasoningSteps);

    if (!feasibilityResult.isFeasible) {
      return this.createInfeasibleRecommendation(context, reasoningChain);
    }

    // Phase 2: Optimization Scoring
    const scoredVehicles = this.scoreVehicles(
      context.moveProfile,
      context.availableVehicles,
      context.demandSignals,
      feasibilityResult.vehicleCapabilities
    );
    reasoningChain.push(...scoredVehicles.reasoningSteps);

    // Phase 3: Recommendation Synthesis
    const recommendation = this.synthesizeRecommendation(
      context,
      scoredVehicles.scoredVehicles,
      reasoningChain
    );

    const elapsedMs = Date.now() - startTime;
    this.logger.log(`Recommendation generated in ${elapsedMs}ms with confidence ${recommendation.confidenceScore}`);

    return recommendation;
  }

  /**
   * Phase 1: Analyze if any vehicles can accommodate the move
   */
  private analyzeFeasibility(
    moveProfile: MoveProfile,
    availableVehicles: VehicleCapabilityProfile[]
  ): {
    isFeasible: boolean;
    vehicleCapabilities: Array<{ vehicle: VehicleCapabilityProfile; requirements: string[] }>;
    reasoningSteps: ReasoningStep[];
  } {
    const reasoningSteps: ReasoningStep[] = [];
    const capableVehicles: Array<{ vehicle: VehicleCapabilityProfile; requirements: string[] }> = [];

    reasoningSteps.push({
      stepName: 'feasibility_analysis_start',
      decision: 'Starting feasibility analysis',
      supportingData: {
        requiredVolumeM3: moveProfile.estimatedVolumeM3,
        requiredLabor: moveProfile.laborRequirement,
        fragilityFactor: moveProfile.fragilityFactor,
        specialHandling: moveProfile.specialHandling,
        floorCount: moveProfile.floorCount,
      },
    });

    for (const vehicle of availableVehicles) {
      const { isCapable, requirements, issues } = this.checkVehicleCapability(vehicle, moveProfile);

      reasoningSteps.push({
        stepName: 'vehicle_feasibility_check',
        decision: isCapable ? 'Vehicle is feasible' : 'Vehicle is not feasible',
        supportingData: {
          vehicleId: vehicle.vehicleId,
          maxVolumeM3: vehicle.maxVolumeM3,
          crewCapacity: vehicle.crewCapacity,
          isCapable,
          requirements: isCapable ? requirements : undefined,
          issues: isCapable ? undefined : issues,
        },
      });

      if (isCapable) {
        capableVehicles.push({ vehicle, requirements });
      }
    }

    const isFeasible = capableVehicles.length > 0;

    reasoningSteps.push({
      stepName: 'feasibility_analysis_complete',
      decision: isFeasible
        ? `${capableVehicles.length} vehicle(s) can accommodate the move`
        : 'No vehicles can accommodate the move requirements',
      supportingData: {
        isFeasible,
        capableVehicleCount: capableVehicles.length,
        totalAvailableVehicles: availableVehicles.length,
      },
    });

    return { isFeasible, vehicleCapabilities: capableVehicles, reasoningSteps };
  }

  /**
   * Check if a vehicle can accommodate the move profile
   */
  private checkVehicleCapability(
    vehicle: VehicleCapabilityProfile,
    moveProfile: MoveProfile
  ): { isCapable: boolean; requirements: string[]; issues: string[] } {
    const requirements: string[] = [];
    const issues: string[] = [];

    // Check volume capacity
    if (vehicle.maxVolumeM3 >= moveProfile.estimatedVolumeM3) {
      requirements.push(`Volume: ${vehicle.maxVolumeM3}m3 >= ${moveProfile.estimatedVolumeM3}m3 required`);
    } else {
      issues.push(`Volume: ${vehicle.maxVolumeM3}m3 < ${moveProfile.estimatedVolumeM3}m3 required`);
    }

    // Check crew capacity
    if (vehicle.crewCapacity >= moveProfile.laborRequirement) {
      requirements.push(`Crew: ${vehicle.crewCapacity} >= ${moveProfile.laborRequirement} required`);
    } else {
      issues.push(`Crew: ${vehicle.crewCapacity} < ${moveProfile.laborRequirement} required`);
    }

    // Check load type compatibility
    const requiredLoadTypes = ['standard', 'furniture'];
    const hasCompatibleLoadType = requiredLoadTypes.some((type) =>
      vehicle.allowedLoadType.includes(type)
    );
    if (hasCompatibleLoadType) {
      requirements.push('Load type compatibility: OK');
    } else {
      issues.push('Load type compatibility: Failed');
    }

    // Check liftgate requirement (for floor access)
    const requiresLiftgate = (moveProfile.floorCount ?? 1) > 1;
    if (requiresLiftgate) {
      if (vehicle.hasLiftgate) {
        requirements.push('Liftgate: Required and available');
      } else {
        issues.push('Liftgate: Required but not available');
      }
    }

    // Check climate control for high fragility
    const requiresClimateControl = moveProfile.fragilityFactor === 'high';
    if (requiresClimateControl) {
      if (vehicle.climateControlled) {
        requirements.push('Climate control: Required and available');
      } else {
        issues.push('Climate control: Required but not available');
      }
    }

    const isCapable = issues.length === 0;

    return { isCapable, requirements, issues };
  }

  /**
   * Phase 2: Score vehicles based on weighted criteria
   */
  private scoreVehicles(
    moveProfile: MoveProfile,
    _availableVehicles: VehicleCapabilityProfile[],
    demandSignals: DemandSignals,
    capableVehicles: Array<{ vehicle: VehicleCapabilityProfile; requirements: string[] }>
  ): {
    scoredVehicles: Array<{
      vehicle: VehicleCapabilityProfile;
      totalScore: number;
      volumeScore: number;
      laborScore: number;
      featureScore: number;
      costScore: number;
    }>;
    reasoningSteps: ReasoningStep[];
  } {
    const reasoningSteps: ReasoningStep[] = [];

    reasoningSteps.push({
      stepName: 'optimization_scoring_start',
      decision: 'Starting optimization scoring',
      supportingData: {
        volumeWeight: SCORING_WEIGHTS.volume,
        laborWeight: SCORING_WEIGHTS.labor,
        featuresWeight: SCORING_WEIGHTS.features,
        costWeight: SCORING_WEIGHTS.cost,
        demandMultiplier: demandSignals.demandMultiplier,
      },
    });

    const scoredVehicles = capableVehicles.map(({ vehicle }) => {
      const volumeScore = this.calculateVolumeScore(vehicle, moveProfile);
      const laborScore = this.calculateLaborScore(vehicle, moveProfile);
      const featureScore = this.calculateFeatureScore(vehicle, moveProfile);
      const costScore = this.calculateCostScore(vehicle, demandSignals);

      const totalScore =
        volumeScore * SCORING_WEIGHTS.volume +
        laborScore * SCORING_WEIGHTS.labor +
        featureScore * SCORING_WEIGHTS.features +
        costScore * SCORING_WEIGHTS.cost;

      reasoningSteps.push({
        stepName: 'vehicle_scoring',
        decision: `Vehicle ${vehicle.vehicleId} scored ${totalScore.toFixed(1)}`,
        supportingData: {
          vehicleId: vehicle.vehicleId,
          volumeScore: Math.round(volumeScore),
          laborScore: Math.round(laborScore),
          featureScore: Math.round(featureScore),
          costScore: Math.round(costScore),
          totalScore: Math.round(totalScore * 10) / 10,
        },
      });

      return { vehicle, totalScore, volumeScore, laborScore, featureScore, costScore };
    });

    // Sort by total score descending
    scoredVehicles.sort((a, b) => b.totalScore - a.totalScore);

    reasoningSteps.push({
      stepName: 'optimization_scoring_complete',
      decision: 'Scoring complete',
      supportingData: {
        topVehicleId: scoredVehicles[0]?.vehicle.vehicleId,
        topScore: scoredVehicles[0]?.totalScore,
        vehicleCount: scoredVehicles.length,
      },
    });

    return { scoredVehicles, reasoningSteps };
  }

  /**
   * Calculate volume fit score (0-100)
   * Penalizes over-capacity more than under-capacity
   */
  private calculateVolumeScore(
    vehicle: VehicleCapabilityProfile,
    moveProfile: MoveProfile
  ): number {
    const volumeRatio = vehicle.maxVolumeM3 / moveProfile.estimatedVolumeM3;
    let score = 100;

    // Penalize over-capacity (wasteful)
    if (volumeRatio > 2) {
      score -= 25; // Significantly over capacity
    } else if (volumeRatio > 1.5) {
      score -= 15; // Moderately over capacity
    } else if (volumeRatio > 1.2) {
      score -= 8; // Slightly over capacity
    }

    // Penalize under-capacity (risky)
    if (volumeRatio < 1.0) {
      score -= 50; // Can't fit everything
    } else if (volumeRatio < 1.1) {
      score -= 5; // Slightly under capacity
    }

    // Bonus for optimal fit (10-20% extra capacity)
    if (volumeRatio >= 1.1 && volumeRatio <= 1.2) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate labor fit score (0-100)
   */
  private calculateLaborScore(
    vehicle: VehicleCapabilityProfile,
    moveProfile: MoveProfile
  ): number {
    const laborRatio = vehicle.crewCapacity / moveProfile.laborRequirement;
    let score = 100;

    // Penalize under-staffing severely
    if (laborRatio < 1.0) {
      score -= 60; // Can't handle the load
    } else if (laborRatio < 1.25) {
      score -= 20; // Barely adequate
    }

    // Penalize over-staffing slightly
    if (laborRatio > 2.0) {
      score -= 15; // Overstaffed
    } else if (laborRatio > 1.5) {
      score -= 5; // Slightly overstaffed
    }

    // Bonus for optimal fit
    if (laborRatio >= 1.25 && laborRatio <= 1.5) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate feature match score (0-100)
   */
  private calculateFeatureScore(
    vehicle: VehicleCapabilityProfile,
    moveProfile: MoveProfile
  ): number {
    let score = 80; // Base score
    const requiredFeatures: string[] = [];

    // Check liftgate requirement
    const requiresLiftgate = (moveProfile.floorCount ?? 1) > 1;
    if (requiresLiftgate) {
      requiredFeatures.push('liftgate');
      if (vehicle.hasLiftgate) {
        score += 10;
      } else {
        score -= 30;
      }
    }

    // Check climate control requirement
    const requiresClimateControl = moveProfile.fragilityFactor === 'high';
    if (requiresClimateControl) {
      requiredFeatures.push('climate-control');
      if (vehicle.climateControlled) {
        score += 10;
      } else {
        score -= 30;
      }
    }

    // Bonus for special features that aren't required
    if (vehicle.specialFeatures) {
      const extras = vehicle.specialFeatures.filter(
        (f) => !requiredFeatures.includes(f)
      ).length;
      score += Math.min(extras * 3, 15); // Up to 15 bonus points
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate cost efficiency score (0-100)
   * Based on demand multiplier and vehicle size
   */
  private calculateCostScore(
    vehicle: VehicleCapabilityProfile,
    demandSignals: DemandSignals
  ): number {
    // Base score on vehicle size (smaller = potentially cheaper)
    const sizeScore = Math.max(0, 100 - (vehicle.maxVolumeM3 * 0.5));

    // Adjust for demand (high demand = lower availability = lower score)
    const demandPenalty = (demandSignals.demandMultiplier - 1) * 20;

    // Adjust for season (peak season = lower availability)
    const seasonMultiplier = {
      local: 1.0,
      regional: 0.95,
      'long-distance': 0.9,
    };
    const seasonAdjustment = (1 - seasonMultiplier[demandSignals.seasonClassification]) * 10;

    const score = sizeScore - demandPenalty - seasonAdjustment;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Phase 3: Synthesize complete recommendation
   */
  private synthesizeRecommendation(
    context: IntelligenceContext,
    scoredVehicles: Array<{
      vehicle: VehicleCapabilityProfile;
      totalScore: number;
      volumeScore: number;
      laborScore: number;
      featureScore: number;
      costScore: number;
    }>,
    reasoningChain: ReasoningStep[]
  ): MoveRecommendation {
    const topScored = scoredVehicles[0];
    const alternatives = scoredVehicles.slice(1, 4);

    reasoningChain.push({
      stepName: 'recommendation_synthesis',
      decision: `Selected ${topScored.vehicle.vehicleId} as primary recommendation`,
      supportingData: {
        selectedVehicleId: topScored.vehicle.vehicleId,
        totalScore: topScored.totalScore,
        alternativeCount: alternatives.length,
      },
    });

    // Build vehicle recommendation
    const vehicleRecommendation: VehicleRecommendation = {
      selectedVehicle: topScored.vehicle,
      matchScore: Math.round(topScored.totalScore),
      alternativeVehicles: alternatives.map((alt) => ({
        vehicle: alt.vehicle,
        matchScore: Math.round(alt.totalScore),
        reason: this.generateAlternativeReason(alt),
      })),
    };

    // Calculate pricing adjustments
    const pricingAdjustment = this.calculatePricingAdjustment(context, topScored);
    reasoningChain.push(...pricingAdjustment.reasoningSteps);

    // Calculate risk assessment
    const riskAssessment = this.assessRisk(context.moveProfile);
    reasoningChain.push(...riskAssessment.reasoningSteps);

    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(context, scoredVehicles);
    reasoningChain.push({
      stepName: 'confidence_calculation',
      decision: `Confidence: ${confidenceScore.toFixed(2)}`,
      supportingData: {
        confidenceScore,
        dataCompleteness: context.locationContext ? 1.0 : 0.8,
        vehicleOptions: Math.min(scoredVehicles.length / 4, 1.0),
        policyCompleteness: context.policyContext ? 1.0 : 0.9,
      },
    });

    return {
      recommendationTimestamp: new Date().toISOString(),
      intelligenceVersion: INTELLIGENCE_VERSION,
      vehicleRecommendation,
      pricingAdjustment: pricingAdjustment.adjustment,
      riskAssessment: riskAssessment.assessment,
      confidenceScore,
      reasoningChain,
      alternatives: alternatives.map((alt) => ({
        recommendationTimestamp: new Date().toISOString(),
        intelligenceVersion: INTELLIGENCE_VERSION,
        vehicleRecommendation: {
          selectedVehicle: alt.vehicle,
          matchScore: Math.round(alt.totalScore),
          alternativeVehicles: [],
        },
        pricingAdjustment: pricingAdjustment.adjustment,
        riskAssessment: riskAssessment.assessment,
        confidenceScore: confidenceScore * 0.9,
        reasoningChain: [],
      })),
    };
  }

  /**
   * Generate reason for alternative vehicle
   */
  private generateAlternativeReason(
    alt: { vehicle: VehicleCapabilityProfile; totalScore: number }
  ): string {
    const reasons: string[] = [];

    if (alt.totalScore >= 80) {
      reasons.push('Good alternative');
    } else if (alt.totalScore >= 60) {
      reasons.push('Acceptable option');
    } else {
      reasons.push('Consider if primary is unavailable');
    }

    if (alt.vehicle.maxVolumeM3 > 40) {
      reasons.push('Larger capacity');
    } else if (alt.vehicle.maxVolumeM3 < 20) {
      reasons.push('More compact');
    }

    return reasons.join('. ');
  }

  /**
   * Calculate pricing adjustments
   */
  private calculatePricingAdjustment(
    context: IntelligenceContext,
    scoredVehicle: { vehicle: VehicleCapabilityProfile; costScore: number }
  ): {
    adjustment: PricingAdjustment;
    reasoningSteps: ReasoningStep[];
  } {
    const reasoningSteps: ReasoningStep[] = [];
    const moveProfile = context.moveProfile;

    reasoningSteps.push({
      stepName: 'pricing_adjustment_start',
      decision: 'Calculating pricing adjustments',
      supportingData: {},
    });

    // Base adjustment from vehicle cost score
    const baseAdjustment = (100 - scoredVehicle.costScore) / 10;
    reasoningSteps.push({
      stepName: 'base_adjustment',
      decision: `Base adjustment: ${baseAdjustment.toFixed(1)}%`,
      supportingData: { baseAdjustment },
    });

    // Demand adjustment
    const demandAdjustment = (context.demandSignals.demandMultiplier - 1) * 100;
    reasoningSteps.push({
      stepName: 'demand_adjustment',
      decision: `Demand adjustment: ${demandAdjustment.toFixed(1)}%`,
      supportingData: {
        demandAdjustment,
        demandMultiplier: context.demandSignals.demandMultiplier,
      },
    });

    // Complexity adjustment
    let complexityAdjustment = 0;
    const complexityFactors: string[] = [];

    if (moveProfile.fragilityFactor === 'high') {
      complexityAdjustment += 15;
      complexityFactors.push('high fragility');
    } else if (moveProfile.fragilityFactor === 'medium') {
      complexityAdjustment += 5;
      complexityFactors.push('medium fragility');
    }

    if (moveProfile.specialHandling && moveProfile.specialHandling.length > 0) {
      complexityAdjustment += moveProfile.specialHandling.length * 5;
      complexityFactors.push(`${moveProfile.specialHandling.length} special items`);
    }

    if (moveProfile.floorCount && moveProfile.floorCount > 1) {
      complexityAdjustment += (moveProfile.floorCount - 1) * 5;
      complexityFactors.push(`${moveProfile.floorCount} floors`);
    }

    reasoningSteps.push({
      stepName: 'complexity_adjustment',
      decision: `Complexity adjustment: ${complexityAdjustment.toFixed(1)}%`,
      supportingData: {
        complexityAdjustment,
        complexityFactors,
      },
    });

    // Policy adjustments
    let policyAdjustment = 0;
    if (context.policyContext) {
      for (const policy of context.policyContext) {
        if (policy.type === 'discount') {
          policyAdjustment -= policy.amount;
        } else if (policy.type === 'surcharge') {
          policyAdjustment += policy.amount;
        }
      }
    }

    // Total adjustment
    const totalAdjustment = baseAdjustment + demandAdjustment + complexityAdjustment + policyAdjustment;

    reasoningSteps.push({
      stepName: 'pricing_adjustment_complete',
      decision: `Total adjustment: ${totalAdjustment.toFixed(1)}%`,
      supportingData: {
        totalAdjustment,
        baseAdjustment,
        demandAdjustment,
        complexityAdjustment,
        policyAdjustment,
      },
    });

    // Generate explanation
    const explanation = this.generatePricingExplanation(
      baseAdjustment,
      demandAdjustment,
      complexityAdjustment,
      policyAdjustment
    );

    return {
      adjustment: {
        baseAdjustment: Math.round(baseAdjustment * 10) / 10,
        demandAdjustment: Math.round(demandAdjustment * 10) / 10,
        complexityAdjustment: Math.round(complexityAdjustment * 10) / 10,
        totalAdjustment: Math.round(totalAdjustment * 10) / 10,
        explanation,
      },
      reasoningSteps,
    };
  }

  /**
   * Generate human-readable pricing explanation
   */
  private generatePricingExplanation(
    baseAdjustment: number,
    demandAdjustment: number,
    complexityAdjustment: number,
    policyAdjustment: number
  ): string {
    const parts: string[] = [];

    if (baseAdjustment > 5) {
      parts.push('Vehicle cost above average');
    } else if (baseAdjustment < -5) {
      parts.push('Vehicle cost below average');
    }

    if (demandAdjustment > 10) {
      parts.push('High demand period');
    } else if (demandAdjustment > 5) {
      parts.push('Moderate demand period');
    }

    if (complexityAdjustment > 10) {
      parts.push('Complex move requirements');
    }

    if (policyAdjustment < 0) {
      parts.push('Policy discount applied');
    } else if (policyAdjustment > 0) {
      parts.push('Policy surcharge applied');
    }

    if (parts.length === 0) {
      parts.push('Standard pricing');
    }

    return parts.join('. ');
  }

  /**
   * Assess risk factors for the move
   */
  private assessRisk(
    moveProfile: MoveProfile
  ): {
    assessment: RiskAssessment;
    reasoningSteps: ReasoningStep[];
  } {
    const reasoningSteps: ReasoningStep[] = [];
    const riskFactors: RiskFactor[] = [];
    let overallRiskScore = 0;
    const requiredPrecautions: string[] = [];

    reasoningSteps.push({
      stepName: 'risk_assessment_start',
      decision: 'Starting risk assessment',
      supportingData: {},
    });

    // Volume risk
    if (moveProfile.estimatedVolumeM3 > 50) {
      overallRiskScore += 15;
      riskFactors.push({
        factorName: 'large_volume',
        severity: 'medium',
        mitigation: 'Consider multiple trips or larger vehicle',
      });
      requiredPrecautions.push('Additional vehicle on standby');
    }

    // Fragility risk
    if (moveProfile.fragilityFactor === 'high') {
      overallRiskScore += 25;
      riskFactors.push({
        factorName: 'high_fragility',
        severity: 'high',
        mitigation: 'Climate-controlled transport, extra padding',
      });
      requiredPrecautions.push('Climate-controlled vehicle required');
      requiredPrecautions.push('Premium packing materials');
    } else if (moveProfile.fragilityFactor === 'medium') {
      overallRiskScore += 10;
      riskFactors.push({
        factorName: 'medium_fragility',
        severity: 'medium',
        mitigation: 'Standard padding, careful handling',
      });
    }

    // Floor risk
    if (moveProfile.floorCount && moveProfile.floorCount > 3) {
      overallRiskScore += 20;
      riskFactors.push({
        factorName: 'high_floor_count',
        severity: 'high',
        mitigation: 'Elevator required or additional movers',
      });
      requiredPrecautions.push('Verify elevator availability');
      requiredPrecautions.push('Additional movers for stairs');
    } else if (moveProfile.floorCount && moveProfile.floorCount > 1) {
      overallRiskScore += 10;
      riskFactors.push({
        factorName: 'multi_floor',
        severity: 'low',
        mitigation: 'Request liftgate vehicle',
      });
      requiredPrecautions.push('Liftgate vehicle recommended');
    }

    // Special items risk
    if (moveProfile.specialHandling && moveProfile.specialHandling.length > 0) {
      const specialRisk = Math.min(moveProfile.specialHandling.length * 8, 25);
      overallRiskScore += specialRisk;
      riskFactors.push({
        factorName: 'special_items',
        severity: moveProfile.specialHandling.length > 2 ? 'high' : 'medium',
        mitigation: `Special handling for: ${moveProfile.specialHandling.join(', ')}`,
      });
      requiredPrecautions.push('Special equipment for special items');
    }

    // Distance risk
    const distanceRiskMultiplier: Record<MoveProfile['distanceCategory'], number> = {
      local: 0.8,
      regional: 1.0,
      'long-distance': 1.5,
    };
    overallRiskScore = Math.round(overallRiskScore * distanceRiskMultiplier[moveProfile.distanceCategory]);

    // Cap overall score at 100
    overallRiskScore = Math.min(overallRiskScore, 100);

    // Calculate success probability (inverse of risk, with minimum 0.5)
    const successProbability = Math.max(0.5, 1 - overallRiskScore / 100);

    reasoningSteps.push({
      stepName: 'risk_assessment_complete',
      decision: `Risk assessment complete: ${overallRiskScore}/100`,
      supportingData: {
        overallRiskScore,
        riskFactorCount: riskFactors.length,
        requiredPrecautions: requiredPrecautions.length,
        successProbability,
      },
    });

    return {
      assessment: {
        overallRiskScore,
        riskFactors,
        requiredPrecautions,
        successProbability,
      },
      reasoningSteps,
    };
  }

  /**
   * Calculate confidence score based on data completeness
   */
  private calculateConfidence(
    context: IntelligenceContext,
    scoredVehicles: Array<{ totalScore: number }>
  ): number {
    let confidence = 1.0;

    // Reduce confidence if location context is missing
    if (!context.locationContext) {
      confidence *= 0.9;
    }

    // Reduce confidence if policy context is missing
    if (!context.policyContext) {
      confidence *= 0.95;
    }

    // Reduce confidence if few vehicle options
    if (scoredVehicles.length < 2) {
      confidence *= 0.9;
    } else if (scoredVehicles.length < 4) {
      confidence *= 0.95;
    }

    // Reduce confidence if top scores are very close
    if (scoredVehicles.length >= 2) {
      const topScore = scoredVehicles[0].totalScore;
      const secondScore = scoredVehicles[1].totalScore;
      if (topScore - secondScore < 5) {
        confidence *= 0.9; // Unclear winner
      }
    }

    return Math.round(confidence * 100) / 100;
  }

  /**
   * Create recommendation when no vehicles are feasible
   */
  private createInfeasibleRecommendation(
    context: IntelligenceContext,
    reasoningChain: ReasoningStep[]
  ): MoveRecommendation {
    reasoningChain.push({
      stepName: 'infeasible_recommendation',
      decision: 'No vehicles can accommodate the move requirements',
      supportingData: {
        requiredVolume: context.moveProfile.estimatedVolumeM3,
        requiredLabor: context.moveProfile.laborRequirement,
        availableVehicles: context.availableVehicles.length,
      },
    });

    return {
      recommendationTimestamp: new Date().toISOString(),
      intelligenceVersion: INTELLIGENCE_VERSION,
      vehicleRecommendation: {
        selectedVehicle: context.availableVehicles[0] ?? {} as VehicleCapabilityProfile,
        matchScore: 0,
        alternativeVehicles: [],
      },
      pricingAdjustment: {
        baseAdjustment: 0,
        demandAdjustment: 0,
        complexityAdjustment: 0,
        totalAdjustment: 0,
        explanation: 'Move cannot be completed with available resources',
      },
      riskAssessment: {
        overallRiskScore: 100,
        riskFactors: [
          {
            factorName: 'infeasible_move',
            severity: 'high',
            mitigation: 'Contact customer service for custom solution',
          },
        ],
        requiredPrecautions: ['Manual intervention required'],
        successProbability: 0,
      },
      confidenceScore: 1.0,
      reasoningChain,
    };
  }
}
