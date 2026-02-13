import { Injectable, Logger } from '@nestjs/common';
import {
  MoveProfile,
  houseSizeToMoveProfile,
  estimateMoveDuration,
} from '../domain/move-profile';
import { HouseSizeEnum, mapHouseSizeEnumToHouseSize } from '../dto/movers-estimate-request.dto';

/**
 * AI Move Profile Service
 * 
 * Service that provides AI-driven interpretation of house sizes
 * and move requirements. This simulates AI behavior with configurable
 * intelligence levels and contextual adjustments.
 */
@Injectable()
export class AIMoveProfileService {
  private readonly logger = new Logger(AIMoveProfileService.name);

  /**
   * Interpret house size to a detailed move profile
   * 
   * @param houseSize - The size of the residence
   * @param options - Optional parameters for customization
   * @returns Detailed move profile
   */
  async interpretHouseSize(
    houseSize: HouseSizeEnum,
    options?: {
      /** Fragility level of items */
      fragilityLevel?: 'low' | 'medium' | 'high';
      /** Number of floors at origin */
      floorCount?: number;
      /** Whether packing service is included */
      packingService?: boolean;
      /** Special items requiring extra handling */
      specialItems?: string[];
      /** Distance to destination in kilometers */
      distanceKm?: number;
    }
  ): Promise<MoveProfile> {
    this.logger.debug(`Interpreting house size: ${houseSize}`);

    // Convert enum to internal house size type
    const internalHouseSize = mapHouseSizeEnumToHouseSize(houseSize);

    // Use the domain function with AI-driven defaults
    const profile = houseSizeToMoveProfile(internalHouseSize, {
      fragilityLevel: options?.fragilityLevel,
      floorCount: options?.floorCount,
      packingService: options?.packingService,
      specialItems: options?.specialItems,
      distanceKm: options?.distanceKm,
    });

    // Apply AI contextual adjustments
    const enhancedProfile = this.applyContextualAdjustments(profile, options);

    return enhancedProfile;
  }

  /**
   * Interpret house sizes for both origin and destination
   * and determine the appropriate move profile
   */
  async interpretMoveRequirements(
    fromHouseSize: HouseSizeEnum,
    toHouseSize: HouseSizeEnum,
    options?: {
      fragilityLevel?: 'low' | 'medium' | 'high';
      fromFloorCount?: number;
      toFloorCount?: number;
      packingService?: boolean;
      specialItems?: string[];
      distanceKm?: number;
    }
  ): Promise<{
    fromProfile: MoveProfile;
    toProfile: MoveProfile;
    combinedProfile: MoveProfile;
  }> {
    const fromProfile = await this.interpretHouseSize(fromHouseSize, {
      fragilityLevel: options?.fragilityLevel,
      floorCount: options?.fromFloorCount,
      packingService: options?.packingService,
      specialItems: options?.specialItems,
      distanceKm: options?.distanceKm,
    });

    const toProfile = await this.interpretHouseSize(toHouseSize, {
      fragilityLevel: options?.fragilityLevel,
      floorCount: options?.toFloorCount,
      packingService: options?.packingService,
      specialItems: options?.specialItems,
      distanceKm: options?.distanceKm,
    });

    // Combine profiles (take the larger values)
    const combinedProfile: MoveProfile = {
      estimatedVolumeM3: Math.max(fromProfile.estimatedVolumeM3, toProfile.estimatedVolumeM3),
      fragilityFactor: this.getHigherFragility(fromProfile.fragilityFactor, toProfile.fragilityFactor),
      laborRequirement: Math.max(fromProfile.laborRequirement, toProfile.laborRequirement),
      specialHandling: this.mergeSpecialHandling(fromProfile.specialHandling, toProfile.specialHandling),
      floorCount: Math.max(fromProfile.floorCount ?? 1, toProfile.floorCount ?? 1),
      packingService: fromProfile.packingService || toProfile.packingService,
      estimatedWeightKg: Math.max(
        fromProfile.estimatedWeightKg ?? 0,
        toProfile.estimatedWeightKg ?? 0
      ) || undefined,
      distanceCategory: fromProfile.distanceCategory,
    };

    return { fromProfile, toProfile, combinedProfile };
  }

  /**
   * Estimate move duration based on profile and distance
   */
  async estimateDuration(
    moveProfile: MoveProfile,
    distanceKm: number
  ): Promise<number> {
    return estimateMoveDuration(moveProfile, distanceKm);
  }

  /**
   * Apply contextual AI adjustments to the move profile
   */
  private applyContextualAdjustments(
    profile: MoveProfile,
    options?: {
      fragilityLevel?: 'low' | 'medium' | 'high';
      floorCount?: number;
      packingService?: boolean;
      specialItems?: string[];
    }
  ): MoveProfile {
    // Apply fragility level from options if provided
    if (options?.fragilityLevel) {
      profile.fragilityFactor = options.fragilityLevel;
    }

    // Adjust for floor count
    if (options?.floorCount && options.floorCount > 3) {
      // High-rise buildings may need additional labor
      profile.laborRequirement += 1;
      profile.specialHandling = [
        ...(profile.specialHandling ?? []),
        'high-rise-access',
      ];
    }

    // Adjust for packing service
    if (options?.packingService) {
      profile.packingService = true;
      // Packing typically adds time but doesn't change volume much
      profile.estimatedVolumeM3 *= 1.1; // ~10% for packing materials
    }

    // Adjust for special items
    if (options?.specialItems && options.specialItems.length > 0) {
      const heavyItems = ['piano', 'safe', 'marble', 'granite', 'hot-tub'];
      const fragileItems = ['art', 'glass', 'crystal', 'mirrors', 'electronics'];

      for (const item of options.specialItems) {
        if (heavyItems.includes(item.toLowerCase())) {
          profile.estimatedWeightKg = (profile.estimatedWeightKg ?? 0) + 200;
        }
        if (fragileItems.includes(item.toLowerCase())) {
          if (profile.fragilityFactor !== 'high') {
            profile.fragilityFactor = 'high';
          }
        }
      }

      profile.specialHandling = [
        ...(profile.specialHandling ?? []),
        ...options.specialItems.map((item) => `special-item:${item.toLowerCase()}`),
      ];
    }

    return profile;
  }

  /**
   * Get the higher fragility level between two
   */
  private getHigherFragility(
    a: MoveProfile['fragilityFactor'],
    b: MoveProfile['fragilityFactor']
  ): MoveProfile['fragilityFactor'] {
    const levels: Record<MoveProfile['fragilityFactor'], number> = {
      low: 1,
      medium: 2,
      high: 3,
    };
    return levels[a] > levels[b] ? a : b;
  }

  /**
   * Merge special handling arrays, removing duplicates
   */
  private mergeSpecialHandling(
    a?: string[],
    b?: string[]
  ): string[] | undefined {
    const combined = new Set([...(a ?? []), ...(b ?? [])]);
    return combined.size > 0 ? Array.from(combined) : undefined;
  }
}
