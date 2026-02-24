import { HouseSize } from '../dto/house-size.enum';

/**
 * MoveProfile represents the estimated requirements for a moving operation.
 * This is AI-driven mapping that interprets house size and other factors
 * into concrete move requirements.
 */
export interface MoveProfile {
  /** Estimated volume of items to move in cubic meters */
  estimatedVolumeM3: number;
  /** How fragile the items are - affects handling requirements */
  fragilityFactor: 'low' | 'medium' | 'high';
  /** Number of movers needed based on volume and floor */
  laborRequirement: number;
  /** Special handling requirements (e.g., 'piano', 'artwork', 'electronics') */
  specialHandling?: string[];
  /** Number of floors at origin/destination */
  floorCount?: number;
  /** Whether packing service is included */
  packingService?: boolean;
  /** Estimated weight in kg (optional, for heavy items) */
  estimatedWeightKg?: number;
  /** Distance category for labor estimation */
  distanceCategory: 'local' | 'regional' | 'long-distance';
}

/**
 * Default move profile configurations based on house size
 */
export const MOVE_PROFILE_DEFAULTS: Record<
  HouseSize,
  Omit<MoveProfile, 'fragilityFactor' | 'specialHandling' | 'floorCount' | 'packingService'>
> = {
  [HouseSize.STUDIO]: {
    estimatedVolumeM3: 8,
    laborRequirement: 2,
    distanceCategory: 'local',
    estimatedWeightKg: 200,
  },
  [HouseSize.ONE_BEDROOM]: {
    estimatedVolumeM3: 15,
    laborRequirement: 2,
    distanceCategory: 'local',
    estimatedWeightKg: 400,
  },
  [HouseSize.TWO_BEDROOM]: {
    estimatedVolumeM3: 25,
    laborRequirement: 3,
    distanceCategory: 'local',
    estimatedWeightKg: 700,
  },
  [HouseSize.THREE_BEDROOM]: {
    estimatedVolumeM3: 40,
    laborRequirement: 4,
    distanceCategory: 'regional',
    estimatedWeightKg: 1000,
  },
  [HouseSize.FOUR_PLUS]: {
    estimatedVolumeM3: 60,
    laborRequirement: 5,
    distanceCategory: 'regional',
    estimatedWeightKg: 1500,
  },
};

/**
 * AI-driven function to map house size to a detailed move profile
 * This simulates AI interpretation with configurable options
 */
export function houseSizeToMoveProfile(
  houseSize: HouseSize,
  options?: {
    fragilityLevel?: 'low' | 'medium' | 'high';
    floorCount?: number;
    packingService?: boolean;
    specialItems?: string[];
    distanceKm?: number;
  }
): MoveProfile {
  const defaults = MOVE_PROFILE_DEFAULTS[houseSize];

  // Determine distance category based on actual distance
  let distanceCategory: MoveProfile['distanceCategory'] = 'local';
  if (options?.distanceKm !== undefined) {
    if (options.distanceKm > 100) {
      distanceCategory = 'long-distance';
    } else if (options.distanceKm > 30) {
      distanceCategory = 'regional';
    }
  }

  // Adjust labor requirement based on floor count
  let laborRequirement = defaults.laborRequirement;
  if (options?.floorCount && options.floorCount > 1) {
    // Add one mover per floor above 1, up to a maximum
    const additionalLabor = Math.min(options.floorCount - 1, 2);
    laborRequirement += additionalLabor;
  }

  // Calculate volume adjustment based on fragility and packing
  let volumeMultiplier = 1.0;
  if (options?.packingService) {
    volumeMultiplier *= 1.1; // Packing materials add ~10%
  }
  if (options?.fragilityLevel === 'high') {
    volumeMultiplier *= 1.15; // Extra padding for fragile items
  }

  // Determine special handling items
  const specialHandling: string[] = [];
  if (options?.specialItems) {
    specialHandling.push(...options.specialItems);
  }

  return {
    estimatedVolumeM3: Math.round(defaults.estimatedVolumeM3 * volumeMultiplier),
    fragilityFactor: options?.fragilityLevel ?? 'medium',
    laborRequirement,
    specialHandling: specialHandling.length > 0 ? specialHandling : undefined,
    floorCount: options?.floorCount,
    packingService: options?.packingService,
    estimatedWeightKg: defaults.estimatedWeightKg,
    distanceCategory,
  };
}

/**
 * Calculate estimated move duration in minutes
 */
export function estimateMoveDuration(moveProfile: MoveProfile, distanceKm: number): number {
  // Base time per cubic meter based on fragility
  const baseTimePerM3: Record<MoveProfile['fragilityFactor'], number> = {
    low: 2,
    medium: 3,
    high: 4,
  };

  // Base loading/unloading time
  const loadingMinutes = moveProfile.estimatedVolumeM3 * baseTimePerM3[moveProfile.fragilityFactor];

  // Travel time (assuming average 40 km/h in urban areas)
  const travelMinutes = (distanceKm / 40) * 60;

  // Floor adjustment (extra time per floor for stairs)
  const floorAdjustment = (moveProfile.floorCount ?? 1) * 15;

  // Special handling time
  const specialHandlingMinutes = (moveProfile.specialHandling?.length ?? 0) * 30;

  // Total time with buffer
  const totalMinutes = loadingMinutes + travelMinutes + floorAdjustment + specialHandlingMinutes;

  // Add 30% buffer for contingencies
  return Math.round(totalMinutes * 1.3);
}
