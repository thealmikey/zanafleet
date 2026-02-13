import { Injectable, Logger } from '@nestjs/common';
import { MoveProfile } from '../domain/move-profile';
import {
  VehicleCapabilityProfile,
  canAccommodateMove,
  calculateMatchScore,
  VEHICLE_CAPABILITY_DEFAULTS,
  VehicleType,
} from '../domain/vehicle-capability-profile';
import { VehicleRecommendation } from '../domain/move-estimate';
import { NormalizedLocation } from './location-normalization.service';

/**
 * VehicleMatchingService
 * 
 * Service for matching vehicles to move requirements.
 * Finds available vehicles and filters them based on capacity 
 * and capability requirements.
 */
@Injectable()
export class VehicleMatchingService {
  private readonly logger = new Logger(VehicleMatchingService.name);

  /**
   * Find matching vehicles for a move profile near a location
   * 
   * @param moveProfile - The move requirements
   * @param _origin - The origin location (reserved for future geo-search)
   * @param _radiusKm - Search radius in kilometers (reserved for future geo-search)
   * @returns Array of vehicle recommendations ranked by match score
   */
  async findMatchingVehicles(
    moveProfile: MoveProfile,
    _origin?: NormalizedLocation,
    _radiusKm: number = 50
  ): Promise<VehicleRecommendation[]> {
    this.logger.debug(
      `Finding vehicles for move profile: ${moveProfile.estimatedVolumeM3}m3, ` +
      `${moveProfile.laborRequirement} laborers`
    );

    // Get default vehicles for demo/testing
    const vehicles = this.getDefaultVehicles();

    // Filter by capacity and capability requirements
    const matchingVehicles = this.filterByCapacity(vehicles, moveProfile);

    // Calculate match scores and rank
    const recommendations = this.rankByMatchScore(matchingVehicles, moveProfile);

    this.logger.log(
      `Found ${recommendations.length} matching vehicles for the move profile`
    );

    return recommendations;
  }

  /**
   * Get default vehicles for demo/testing purposes
   */
  private getDefaultVehicles(): VehicleCapabilityProfile[] {
    return [
      {
        vehicleId: 'cargo-van-001',
        ...VEHICLE_CAPABILITY_DEFAULTS[VehicleType.CARGO_VAN],
      },
      {
        vehicleId: 'small-truck-001',
        ...VEHICLE_CAPABILITY_DEFAULTS[VehicleType.SMALL_TRUCK],
      },
      {
        vehicleId: 'medium-truck-001',
        ...VEHICLE_CAPABILITY_DEFAULTS[VehicleType.MEDIUM_TRUCK],
      },
      {
        vehicleId: 'large-truck-001',
        ...VEHICLE_CAPABILITY_DEFAULTS[VehicleType.LARGE_TRUCK],
      },
    ];
  }

  /**
   * Filter vehicles by capacity requirements
   */
  private filterByCapacity(
    vehicles: VehicleCapabilityProfile[],
    moveProfile: MoveProfile
  ): VehicleCapabilityProfile[] {
    const requiresLiftgate = (moveProfile.floorCount ?? 1) > 1;
    const requiresClimateControl = moveProfile.fragilityFactor === 'high';

    return vehicles.filter((vehicle) =>
      canAccommodateMove(
        vehicle,
        moveProfile.estimatedVolumeM3,
        moveProfile.laborRequirement,
        ['standard', 'furniture'],
        requiresLiftgate,
        requiresClimateControl
      )
    );
  }

  /**
   * Rank vehicles by match score and create recommendations
   */
  private rankByMatchScore(
    vehicles: VehicleCapabilityProfile[],
    moveProfile: MoveProfile
  ): VehicleRecommendation[] {
    const recommendations: VehicleRecommendation[] = vehicles.map((vehicle) => {
      const matchScore = calculateMatchScore(
        vehicle,
        moveProfile.estimatedVolumeM3,
        moveProfile.laborRequirement
      );

      // Calculate estimated price based on vehicle type
      const estimatedPrice = this.calculateEstimatedPrice(vehicle, moveProfile);

      // Estimate duration based on vehicle capabilities
      const estimatedDuration = this.estimateDuration(vehicle, moveProfile);

      // Determine availability status based on match score
      const availabilityStatus: VehicleRecommendation['availabilityStatus'] =
        matchScore >= 80 ? 'available' : matchScore >= 50 ? 'limited' : 'unavailable';

      return {
        vehicleId: vehicle.vehicleId,
        type: vehicle.vehicleModel ?? vehicle.vehicleMake ?? 'Unknown',
        capacityProfile: vehicle,
        estimatedPrice,
        estimatedDuration,
        availabilityStatus,
        matchScore,
        recommendationReason: this.generateRecommendationReason(vehicle, moveProfile, matchScore),
      };
    });

    // Sort by match score descending
    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Calculate estimated price based on vehicle and move profile
   */
  private calculateEstimatedPrice(
    vehicle: VehicleCapabilityProfile,
    moveProfile: MoveProfile
  ): number {
    // Base price by vehicle size
    const basePriceBySize: Record<number, number> = {
      12: 2500,   // Cargo van
      20: 4000,   // Small truck
      35: 6500,   // Medium truck
      50: 9000,   // Large truck
      55: 11000,  // Box truck
    };

    // Find closest base price
    const basePrice = Object.entries(basePriceBySize).reduce(
      (closest, [capacity, price]) => {
        const diff = Math.abs(vehicle.maxVolumeM3 - Number(capacity));
        return diff < Math.abs(vehicle.maxVolumeM3 - closest.capacity) 
          ? { capacity: Number(capacity), price } 
          : closest;
      },
      { capacity: 0, price: 5000 }
    ).price;

    // Adjust for fragility
    const fragilityMultiplier = {
      low: 1.0,
      medium: 1.15,
      high: 1.35,
    }[moveProfile.fragilityFactor];

    // Adjust for special features
    let featureMultiplier = 1.0;
    if (vehicle.hasLiftgate) featureMultiplier += 0.1;
    if (vehicle.climateControlled) featureMultiplier += 0.15;

    // Calculate final price
    const price = basePrice * fragilityMultiplier * featureMultiplier;

    // Round to nearest 100
    return Math.round(price / 100) * 100;
  }

  /**
   * Estimate duration based on vehicle capabilities
   */
  private estimateDuration(
    vehicle: VehicleCapabilityProfile,
    moveProfile: MoveProfile
  ): number {
    // Base duration by vehicle size (minutes)
    const baseDurationBySize: Record<number, number> = {
      12: 180,   // ~3 hours
      20: 270,   // ~4.5 hours
      35: 360,   // ~6 hours
      50: 450,   // ~7.5 hours
      55: 540,   // ~9 hours
    };

    // Find closest base duration
    const baseDuration = Object.entries(baseDurationBySize).reduce(
      (closest, [capacity, duration]) => {
        const diff = Math.abs(vehicle.maxVolumeM3 - Number(capacity));
        return diff < Math.abs(vehicle.maxVolumeM3 - closest.capacity) 
          ? { capacity: Number(capacity), duration } 
          : closest;
      },
      { capacity: 0, duration: 300 }
    ).duration;

    // Adjust for labor count (more crew = faster)
    const laborAdjustment = moveProfile.laborRequirement / 2; // Assume 2 is baseline

    // Adjust for fragility
    const fragilityMultiplier = {
      low: 0.9,
      medium: 1.0,
      high: 1.25,
    }[moveProfile.fragilityFactor];

    return Math.round(baseDuration * (1 / laborAdjustment) * fragilityMultiplier);
  }

  /**
   * Generate a human-readable recommendation reason
   */
  private generateRecommendationReason(
    vehicle: VehicleCapabilityProfile,
    moveProfile: MoveProfile,
    matchScore: number
  ): string {
    const reasons: string[] = [];

    // Check volume fit
    const volumeRatio = vehicle.maxVolumeM3 / moveProfile.estimatedVolumeM3;
    if (volumeRatio >= 1 && volumeRatio <= 1.3) {
      reasons.push('Optimal volume fit');
    } else if (volumeRatio > 1.5) {
      reasons.push('Generous capacity for all items');
    }

    // Check crew capacity
    if (vehicle.crewCapacity >= moveProfile.laborRequirement) {
      reasons.push('Adequate crew capacity');
    }

    // Special features
    if (vehicle.climateControlled && moveProfile.fragilityFactor === 'high') {
      reasons.push('Climate control for fragile items');
    }
    if (vehicle.hasLiftgate && (moveProfile.floorCount ?? 1) > 1) {
      reasons.push('Liftgate for easy loading');
    }

    // Overall assessment
    if (matchScore >= 80) {
      return `Highly recommended. ${reasons.join('. ')}.`;
    } else if (matchScore >= 60) {
      return `Good option. ${reasons.join('. ')}.`;
    } else {
      return `Suitable. ${reasons.join('. ')}.`;
    }
  }
}
