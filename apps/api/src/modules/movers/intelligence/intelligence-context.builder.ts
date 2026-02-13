import { Injectable, Logger, Optional } from '@nestjs/common';

import { calculateDemandMultiplier, PolicyAdjustment } from '../domain/move-estimate';
import { MoveProfile } from '../domain/move-profile';
import { HouseSizeEnum , LocationInput } from '../dto/movers-estimate-request.dto';
import type { MediaInsight } from '../media-insight';
import {
  MediaPerceptionAdapter,
  MediaReference,
  DEFAULT_MEDIA_PERCEPTION_CONFIG,
} from '../media-insight';
import { MediaPerceptionFeatureService } from '../media-insight/services/media-perception-feature.service';
import { AIMoveProfileService } from '../services/ai-move-profile.service';
import { LocationNormalizationService } from '../services/location-normalization.service';
import { VehicleMatchingService } from '../services/vehicle-matching.service';

import {
  IntelligenceContext,
  IntelligenceContextOptions,
  DemandSignals,
  IntelligenceMetadata,
  LocationContext,
  ProfileMergeResult,
} from './intelligence-context';

/**
 * IntelligenceContextBuilder
 * 
 * Service responsible for building IntelligenceContext objects by aggregating
 * data from existing services without modifying their behavior or the Order
 * entities they wrap. Follows the composition pattern and dependency inversion
 * principle.
 */
@Injectable()
export class IntelligenceContextBuilder {
  private readonly logger = new Logger(IntelligenceContextBuilder.name);

  constructor(
    private readonly vehicleMatchingService: VehicleMatchingService,
    private readonly aiMoveProfileService: AIMoveProfileService,
    private readonly locationNormalizationService: LocationNormalizationService,
    @Optional() private readonly mediaPerceptionAdapter: MediaPerceptionAdapter,
    @Optional() private readonly featureService: MediaPerceptionFeatureService,
    private readonly config: { confidenceThreshold: number } = { confidenceThreshold: DEFAULT_MEDIA_PERCEPTION_CONFIG.confidenceThreshold }
  ) {}

  /**
   * Build IntelligenceContext from movers estimate request.
   * Supports optional media assets for enhanced profiling.
   */
  async buildFromEstimateRequest(params: {
    fromHouseSize: string;
    toHouseSize: string;
    fromLocation: {
      placeId: string;
      formattedAddress: string;
      latitude: number;
      longitude: number;
      locality?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    toLocation: {
      placeId: string;
      formattedAddress: string;
      latitude: number;
      longitude: number;
      locality?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    requestedDate?: Date;
    fragilityLevel?: 'low' | 'medium' | 'high';
    fromFloorCount?: number;
    toFloorCount?: number;
    packingService?: boolean;
    specialItems?: string[];
    distanceKm?: number;
    mediaRefs?: MediaReference[];
    options?: IntelligenceContextOptions;
  }): Promise<IntelligenceContext> {
    this.logger.debug('Building IntelligenceContext from estimate request');

    const correlationId = params.options?.correlationId ?? this.generateCorrelationId();
    const source = params.options?.source ?? 'api';
    const quoteVersion = params.options?.quoteVersion ?? '1.0.0';

    // Build base move profile from legacy input
    const baseMoveProfile = await this.buildMoveProfile({
      fromHouseSize: params.fromHouseSize,
      toHouseSize: params.toHouseSize,
      fragilityLevel: params.fragilityLevel,
      fromFloorCount: params.fromFloorCount,
      toFloorCount: params.toFloorCount,
      packingService: params.packingService,
      specialItems: params.specialItems,
      distanceKm: params.distanceKm,
    });

    // Try to get media insight if media provided
    const mediaInsight = await this.buildMediaInsight(params.mediaRefs);

    // Determine profile source and refine if media available
    let refinedProfile: MoveProfile;
    let profileSource: 'legacy' | 'media-enhanced' | 'media-only';

    if (mediaInsight) {
      const mergeResult = this.mergeProfiles(baseMoveProfile, mediaInsight);
      refinedProfile = mergeResult.profile;
      profileSource = 'media-enhanced';

      this.logger.debug(
        `Profile enhanced with media insight: ${JSON.stringify(mergeResult.mergeDetails)}`
      );
    } else {
      refinedProfile = baseMoveProfile;
      profileSource = 'legacy';
    }

    // Build available vehicles
    const availableVehicles = await this.buildAvailableVehicles(refinedProfile);

    // Build demand signals
    const demandSignals = this.buildDemandSignals(params.requestedDate);

    // Build metadata
    const metadata = this.buildMetadata({
      correlationId,
      source,
      quoteVersion,
      requestedDate: params.requestedDate,
      clientPreferences: params.options?.clientPreferences,
    });

    // Build location context (if both locations provided)
    const locationContext = await this.buildLocationContext(params.fromLocation, params.toLocation);

    // Build policy context (placeholder - would integrate with policy service)
    const policyContext = this.buildPolicyContext();

    return {
      moveProfile: refinedProfile,
      availableVehicles,
      demandSignals,
      metadata,
      locationContext,
      policyContext,
      mediaInsight: mediaInsight ?? undefined,
      profileSource,
    };
  }

  /**
   * Build move profile from house size and options
   */
  async buildMoveProfile(params: {
    fromHouseSize: string;
    toHouseSize: string;
    fragilityLevel?: 'low' | 'medium' | 'high';
    fromFloorCount?: number;
    toFloorCount?: number;
    packingService?: boolean;
    specialItems?: string[];
    distanceKm?: number;
  }): Promise<MoveProfile> {
    this.logger.debug(`Building move profile for ${params.fromHouseSize} -> ${params.toHouseSize}`);

    // Map string to HouseSizeEnum
    const houseSizeEnumMap: Record<string, HouseSizeEnum> = {
      studio: HouseSizeEnum.STUDIO,
      '1br': HouseSizeEnum.ONE_BEDROOM,
      '2br': HouseSizeEnum.TWO_BEDROOM,
      '3br': HouseSizeEnum.THREE_BEDROOM,
      '4br+': HouseSizeEnum.FOUR_PLUS,
    };

    const fromHouseSize = houseSizeEnumMap[params.fromHouseSize] ?? HouseSizeEnum.STUDIO;
    const toHouseSize = houseSizeEnumMap[params.toHouseSize] ?? HouseSizeEnum.STUDIO;

    const { combinedProfile } = await this.aiMoveProfileService.interpretMoveRequirements(
      fromHouseSize,
      toHouseSize,
      {
        fragilityLevel: params.fragilityLevel,
        fromFloorCount: params.fromFloorCount,
        toFloorCount: params.toFloorCount,
        packingService: params.packingService,
        specialItems: params.specialItems,
        distanceKm: params.distanceKm,
      }
    );

    return combinedProfile;
  }

  /**
   * Build available vehicles from move profile
   */
  async buildAvailableVehicles(moveProfile: MoveProfile): Promise<IntelligenceContext['availableVehicles']> {
    this.logger.debug(`Building available vehicles for move profile`);

    const vehicleRecommendations = await this.vehicleMatchingService.findMatchingVehicles(moveProfile);

    return vehicleRecommendations.map((rec) => rec.capacityProfile);
  }

  /**
   * Build demand signals from requested date
   */
  buildDemandSignals(requestedDate?: Date): DemandSignals {
    const date = requestedDate ?? new Date();

    const demandMultiplier = calculateDemandMultiplier(date);

    const holidayProximity = this.calculateHolidayProximity(date);

    const seasonClassification = this.determineSeasonClassification(date);

    return {
      demandMultiplier,
      dayOfWeek: date.getDay(),
      month: date.getMonth(),
      holidayProximity,
      seasonClassification,
    };
  }

  /**
   * Calculate days until nearest holiday
   */
  private calculateHolidayProximity(date: Date): number {
    const holidays = [
      { name: 'New Year', month: 0, day: 1 },
      { name: 'Christmas', month: 11, day: 25 },
    ];

    let minDays = Infinity;

    for (const holiday of holidays) {
      const holidayDate = new Date(date.getFullYear(), holiday.month, holiday.day);
      if (holidayDate < date) {
        holidayDate.setFullYear(holidayDate.getFullYear() + 1);
      }
      const days = (holidayDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      minDays = Math.min(minDays, days);
    }

    return Math.round(minDays);
  }

  /**
   * Determine season classification
   */
  private determineSeasonClassification(date: Date): DemandSignals['seasonClassification'] {
    const month = date.getMonth();

    // Peak season: June-August (summer moving) and December (holiday season)
    if (month >= 5 && month <= 7) {
      return 'long-distance';
    }
    if (month === 11) {
      return 'regional';
    }

    // Off-peak: January-May, September-October
    if (month >= 0 && month <= 4) {
      return 'local';
    }
    if (month >= 8 && month <= 10) {
      return 'regional';
    }

    return 'local';
  }

  /**
   * Build metadata
   */
  private buildMetadata(params: {
    correlationId: string;
    source: 'api' | 'web' | 'mobile';
    quoteVersion: string;
    requestedDate?: Date;
    clientPreferences?: IntelligenceMetadata['clientPreferences'];
  }): IntelligenceMetadata {
    return {
      requestTimestamp: new Date().toISOString(),
      correlationId: params.correlationId,
      source: params.source,
      quoteVersion: params.quoteVersion,
      clientPreferences: params.clientPreferences,
    };
  }

  /**
   * Build location context from raw location inputs
   */
  async buildLocationContext(
    fromLocation: LocationInput,
    toLocation: LocationInput
  ): Promise<LocationContext | undefined> {
    try {
      const normalizedOrigin = await this.locationNormalizationService.normalize(fromLocation);
      const normalizedDestination = await this.locationNormalizationService.normalize(toLocation);

      return {
        origin: normalizedOrigin,
        destination: normalizedDestination,
      };
    } catch (error) {
      this.logger.warn(`Failed to normalize locations: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * Build policy context
   * Note: This is a placeholder. In production, this would integrate with the policy service.
   */
  private buildPolicyContext(): PolicyAdjustment[] {
    // Placeholder - would evaluate policies based on move profile
    return [];
  }

  /**
   * Build MediaInsight from media references if available.
   *
   * This method attempts to analyze media using the MediaPerceptionAdapter.
   * Returns null if no media is provided, adapter is not available, or
   * analysis fails - ensuring non-blocking behavior.
   *
   * Uses the MediaPerceptionFeatureService to check if media should be processed.
   *
   * @param mediaRefs - Optional array of media references to analyze
   * @returns MediaInsight if analysis succeeds, null otherwise
   */
  async buildMediaInsight(mediaRefs?: MediaReference[]): Promise<MediaInsight | null> {
    // Check if media should be processed using feature service
    if (this.featureService && !this.featureService.shouldProcessMedia(!!mediaRefs?.length)) {
      return null;
    }

    if (!mediaRefs || mediaRefs.length === 0) {
      return null;
    }

    if (!this.mediaPerceptionAdapter) {
      this.logger.debug('MediaPerceptionAdapter not available');
      return null;
    }

    const result = await this.mediaPerceptionAdapter.analyzeMedia(mediaRefs);

    if (result.status !== 'success' || !result.insight) {
      this.logger.debug(`Media insight not available: ${result.errorCode ?? result.status}`);
      return null;
    }

    // Get confidence threshold from feature service or fallback to config
    const confidenceThreshold = this.featureService?.getConfidenceThreshold() ?? this.config.confidenceThreshold;

    // Only return if confidence meets threshold
    if (result.insight.perceptionConfidence < confidenceThreshold) {
      this.logger.debug(
        `Media insight confidence ${result.insight.perceptionConfidence} below threshold ${confidenceThreshold}`
      );
      return null;
    }

    return result.insight;
  }

  /**
   * Merge MediaInsight into base MoveProfile.
   *
   * This method enhances the base profile with data from media analysis.
   * The merge logic only adds/enhances data, never removes existing data,
   * ensuring backward compatibility.
   *
   * @param baseProfile - The base move profile from legacy estimation
   * @param mediaInsight - The media insight from AI analysis
   * @returns ProfileMergeResult containing the refined profile and merge details
   */
  mergeProfiles(baseProfile: MoveProfile, mediaInsight: MediaInsight): ProfileMergeResult {
    const mergeDetails = {
      volumeOverridden: false,
      laborAdjusted: false,
      fragilitySet: false,
      itemsAdded: 0,
      sourceConfidence: mediaInsight.perceptionConfidence,
    };

    const refinedProfile: MoveProfile = { ...baseProfile };

    // Override estimatedVolume if media provides higher-confidence value
    if (mediaInsight.estimatedTotalVolumeM3 > 0) {
      refinedProfile.estimatedVolumeM3 = mediaInsight.estimatedTotalVolumeM3;
      mergeDetails.volumeOverridden = true;
    }

    // Adjust laborRequirement using estimatedLaborIntensity
    if (
      mediaInsight.estimatedLaborIntensity >= 1 &&
      mediaInsight.estimatedLaborIntensity <= 5
    ) {
      refinedProfile.laborRequirement = mediaInsight.estimatedLaborIntensity;
      mergeDetails.laborAdjusted = true;
    }

    // Set fragilityLevel using fragilityScore
    if (mediaInsight.fragilityScore >= 0) {
      refinedProfile.fragilityFactor = this.mapFragilityScore(mediaInsight.fragilityScore);
      mergeDetails.fragilitySet = true;
    }

    // Add detectedItems to specialHandling
    const specialItems = mediaInsight.detectedItems
      .filter(
        (item) => item.category === 'fragile' || mediaInsight.specialHandlingRequired
      )
      .map((item) => item.label);

    if (specialItems.length > 0) {
      refinedProfile.specialHandling = [
        ...(baseProfile.specialHandling ?? []),
        ...specialItems,
      ];
      mergeDetails.itemsAdded = specialItems.length;
    }

    return { profile: refinedProfile, mergeDetails };
  }

  /**
   * Map fragility score (0-1) to fragility factor.
   *
   * @param score - Fragility score from 0 to 1
   * @returns Fragility factor classification
   */
  private mapFragilityScore(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.7) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Generate a correlation ID for tracing
   */
  private generateCorrelationId(): string {
    return `ctx-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
