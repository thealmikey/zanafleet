/**
 * VehicleCapabilityProfile represents the capabilities of a vehicle
 * used for moving operations. This is used to match vehicles with
 * move requirements.
 */
export interface VehicleCapabilityProfile {
  /** Unique identifier for the vehicle */
  vehicleId: string;
  /** Maximum volume capacity in cubic meters */
  maxVolumeM3: number;
  /** Types of load allowed (e.g., 'standard', 'fragile', 'bulk') */
  allowedLoadType: string[];
  /** Number of crew members the vehicle can accommodate */
  crewCapacity: number;
  /** Types of moves this vehicle supports */
  supportedMoveTypes: string[];
  /** Special features available (e.g., 'liftgate', 'climate-control', 'tiedowns') */
  specialFeatures?: string[];
  /** Fuel type of the vehicle */
  fuelType?: 'petrol' | 'diesel' | 'electric' | 'hybrid';
  /** Whether the vehicle has liftgate for easy loading */
  hasLiftgate?: boolean;
  /** Whether the vehicle is climate controlled */
  climateControlled?: boolean;
  /** Year of the vehicle */
  vehicleYear?: number;
  /** Make/brand of the vehicle */
  vehicleMake?: string;
  /** Model of the vehicle */
  vehicleModel?: string;
}

/**
 * Vehicle type categories for movers
 */
export enum VehicleType {
  CARGO_VAN = 'cargo_van',
  SMALL_TRUCK = 'small_truck',
  MEDIUM_TRUCK = 'medium_truck',
  LARGE_TRUCK = 'large_truck',
  BOX_TRUCK = 'box_truck',
  ENCLOSED_TRAILER = 'enclosed_trailer',
  FLATBED = 'flatbed',
}

/**
 * Default vehicle capability profiles by type
 */
export const VEHICLE_CAPABILITY_DEFAULTS: Record<
  VehicleType,
  Omit<VehicleCapabilityProfile, 'vehicleId' | 'vehicleYear' | 'vehicleMake' | 'vehicleModel'>
> = {
  [VehicleType.CARGO_VAN]: {
    maxVolumeM3: 12,
    allowedLoadType: ['standard', 'boxes', 'furniture'],
    crewCapacity: 2,
    supportedMoveTypes: ['studio', '1br'],
    specialFeatures: ['rear-barn-doors'],
    fuelType: 'petrol',
    hasLiftgate: false,
    climateControlled: false,
  },
  [VehicleType.SMALL_TRUCK]: {
    maxVolumeM3: 20,
    allowedLoadType: ['standard', 'boxes', 'furniture', 'appliances'],
    crewCapacity: 2,
    supportedMoveTypes: ['1br', '2br'],
    specialFeatures: ['liftgate', 'rear-barn-doors'],
    fuelType: 'diesel',
    hasLiftgate: true,
    climateControlled: false,
  },
  [VehicleType.MEDIUM_TRUCK]: {
    maxVolumeM3: 35,
    allowedLoadType: ['standard', 'boxes', 'furniture', 'appliances', 'fragile'],
    crewCapacity: 3,
    supportedMoveTypes: ['2br', '3br'],
    specialFeatures: ['liftgate', 'climate-control', 'rear-ramp'],
    fuelType: 'diesel',
    hasLiftgate: true,
    climateControlled: true,
  },
  [VehicleType.LARGE_TRUCK]: {
    maxVolumeM3: 50,
    allowedLoadType: ['standard', 'boxes', 'furniture', 'appliances', 'fragile', 'bulk'],
    crewCapacity: 4,
    supportedMoveTypes: ['3br', '4br+'],
    specialFeatures: ['liftgate', 'climate-control', 'rear-ramp', 'tiedowns'],
    fuelType: 'diesel',
    hasLiftgate: true,
    climateControlled: true,
  },
  [VehicleType.BOX_TRUCK]: {
    maxVolumeM3: 55,
    allowedLoadType: ['standard', 'boxes', 'furniture', 'appliances', 'fragile', 'bulk'],
    crewCapacity: 4,
    supportedMoveTypes: ['3br', '4br+'],
    specialFeatures: ['liftgate', 'climate-control', 'rear-ramp', 'tiedowns', 'box-enclosed'],
    fuelType: 'diesel',
    hasLiftgate: true,
    climateControlled: true,
  },
  [VehicleType.ENCLOSED_TRAILER]: {
    maxVolumeM3: 45,
    allowedLoadType: ['standard', 'fragile', 'high-value'],
    crewCapacity: 0, // Towed, no crew
    supportedMoveTypes: ['2br', '3br', '4br+'],
    specialFeatures: ['climate-control', 'lockable', 'shock-absorption'],
    fuelType: undefined,
    hasLiftgate: false,
    climateControlled: true,
  },
  [VehicleType.FLATBED]: {
    maxVolumeM3: 60,
    allowedLoadType: ['bulk', 'machinery', 'construction'],
    crewCapacity: 2,
    supportedMoveTypes: ['4br+'],
    specialFeatures: ['tiedowns', 'winch', 'liftgate'],
    fuelType: 'diesel',
    hasLiftgate: true,
    climateControlled: false,
  },
};

/**
 * Check if a vehicle profile can accommodate a move profile
 */
export function canAccommodateMove(
  vehicleProfile: VehicleCapabilityProfile,
  requiredVolumeM3: number,
  requiredLabor: number,
  requiredLoadTypes: string[],
  requiresLiftgate?: boolean,
  requiresClimateControl?: boolean
): boolean {
  // Check volume capacity
  if (vehicleProfile.maxVolumeM3 < requiredVolumeM3) {
    return false;
  }

  // Check crew capacity
  if (vehicleProfile.crewCapacity < requiredLabor) {
    return false;
  }

  // Check load type compatibility
  const hasCompatibleLoadType = requiredLoadTypes.some((loadType) =>
    vehicleProfile.allowedLoadType.includes(loadType)
  );
  if (!hasCompatibleLoadType) {
    return false;
  }

  // Check liftgate requirement
  if (requiresLiftgate && !vehicleProfile.hasLiftgate) {
    return false;
  }

  // Check climate control requirement
  if (requiresClimateControl && !vehicleProfile.climateControlled) {
    return false;
  }

  return true;
}

/**
 * Calculate match score between vehicle and move requirements
 */
export function calculateMatchScore(
  vehicleProfile: VehicleCapabilityProfile,
  requiredVolumeM3: number,
  requiredLabor: number
): number {
  let score = 100;

  // Penalize for volume underutilization (vehicle too large)
  const volumeRatio = vehicleProfile.maxVolumeM3 / requiredVolumeM3;
  if (volumeRatio > 2) {
    score -= 20; // Significantly over capacity
  } else if (volumeRatio > 1.5) {
    score -= 10; // Moderately over capacity
  } else if (volumeRatio > 1.2) {
    score -= 5; // Slightly over capacity
  }

  // Penalize for crew capacity mismatch
  if (vehicleProfile.crewCapacity < requiredLabor) {
    score -= 50; // Can't handle the load
  } else if (vehicleProfile.crewCapacity > requiredLabor + 1) {
    score -= 10; // Overstaffed
  }

  // Bonus for extra capacity (flexibility)
  if (volumeRatio >= 1.1 && volumeRatio <= 1.3) {
    score += 10; // Optimal fit
  }

  // Bonus for climate control (premium feature)
  if (vehicleProfile.climateControlled) {
    score += 5;
  }

  // Bonus for liftgate (convenience)
  if (vehicleProfile.hasLiftgate) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}
