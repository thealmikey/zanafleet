import { Injectable, Logger } from '@nestjs/common';

import { HOUSE_SIZE_CONFIG, HouseSize, VehicleRecommendation } from '../dto';

/**
 * Vehicle Recommendation Service
 *
 * Provides intelligent vehicle recommendations based on:
 * - House size (current and destination)
 * - Distance of the move
 */
@Injectable()
export class VehicleRecommendationService {
  private readonly logger = new Logger(VehicleRecommendationService.name);

  /**
   * Vehicle capacity configuration
   * Maps vehicle types to their cubic meter capacity
   */
  private readonly vehicleCapacities: Record<string, number> = {
    small_truck: 8, // ~1 ton payload
    medium_truck: 15, // ~2-3 ton payload
    large_truck: 25, // ~4-5 ton payload
    extra_large_truck: 40, // ~6-8 ton payload
    van: 10, // Small van
    pickup: 5, // Single cab pickup
  };

  /**
   * Vehicle recommendations based on house size
   */
  private readonly vehicleRecommendations: Record<string, string[]> = {
    [HouseSize.STUDIO]: ['van', 'pickup', 'small_truck'],
    [HouseSize.ONE_BEDROOM]: ['van', 'small_truck', 'medium_truck'],
    [HouseSize.TWO_BEDROOM]: ['small_truck', 'medium_truck', 'large_truck'],
    [HouseSize.THREE_BEDROOM]: ['medium_truck', 'large_truck', 'extra_large_truck'],
    [HouseSize.FOUR_PLUS]: ['large_truck', 'extra_large_truck'],
  };

  /**
   * Get recommended vehicles based on house sizes and distance
   */
  async recommendVehicles(
    currentSize: HouseSize,
    destinationSize: HouseSize,
    distanceKm: number
  ): Promise<VehicleRecommendation[]> {
    this.logger.log(
      `Generating vehicle recommendations for ${currentSize} → ${destinationSize} (${distanceKm}km)`
    );

    // Calculate required capacity
    const requiredCapacity = this.calculateRequiredCapacity(currentSize, destinationSize);

    // Get preferred vehicle types
    const preferredTypes = this.getPreferredVehicleTypes(currentSize, destinationSize);

    // Generate recommendations
    return this.generateRecommendations(preferredTypes, requiredCapacity, distanceKm);
  }

  /**
   * Calculate required capacity based on house sizes
   */
  private calculateRequiredCapacity(currentSize: HouseSize, destinationSize: HouseSize): number {
    const currentConfig = HOUSE_SIZE_CONFIG[currentSize];
    const destinationConfig = HOUSE_SIZE_CONFIG[destinationSize];

    const maxCapacity = Math.max(
      currentConfig.capacityCubicMeters,
      destinationConfig.capacityCubicMeters
    );

    // Add 20% buffer
    return Math.ceil(maxCapacity * 1.2);
  }

  /**
   * Get preferred vehicle types
   */
  private getPreferredVehicleTypes(currentSize: HouseSize, destinationSize: HouseSize): string[] {
    const currentRecs = this.vehicleRecommendations[currentSize] || [];
    const destinationRecs = this.vehicleRecommendations[destinationSize] || [];

    return [...new Set([...currentRecs, ...destinationRecs])];
  }

  /**
   * Generate vehicle recommendations
   */
  private generateRecommendations(
    preferredTypes: string[],
    requiredCapacity: number,
    _distanceKm: number
  ): VehicleRecommendation[] {
    const recommendations: VehicleRecommendation[] = [];

    for (const vehicleType of preferredTypes) {
      const capacity = this.vehicleCapacities[vehicleType] || 10;

      recommendations.push({
        vehicleType,
        vehicleName: this.getVehicleDisplayName(vehicleType),
        capacity: `${capacity} cubic meters`,
        recommendedFor: this.getRecommendedHouseSizes(vehicleType),
        estimatedCapacityCubicMeters: capacity,
        features: this.getVehicleFeatures(vehicleType),
      });
    }

    // Sort by capacity match
    recommendations.sort((a, b) => {
      const capacityDiffA = Math.abs(a.estimatedCapacityCubicMeters - requiredCapacity);
      const capacityDiffB = Math.abs(b.estimatedCapacityCubicMeters - requiredCapacity);
      return capacityDiffA - capacityDiffB;
    });

    return recommendations;
  }

  /**
   * Get display name for vehicle type
   */
  private getVehicleDisplayName(vehicleType: string): string {
    const displayNames: Record<string, string> = {
      small_truck: 'Small Truck (1 Ton)',
      medium_truck: 'Medium Truck (2-3 Ton)',
      large_truck: 'Large Truck (4-5 Ton)',
      extra_large_truck: 'Extra Large Truck (6-8 Ton)',
      van: 'Cargo Van',
      pickup: 'Pickup Truck',
    };
    return displayNames[vehicleType] || vehicleType;
  }

  /**
   * Get recommended house sizes for a vehicle type
   */
  private getRecommendedHouseSizes(vehicleType: string): string[] {
    const houseSizeMappings: Record<string, HouseSize[]> = {
      pickup: [HouseSize.STUDIO],
      van: [HouseSize.STUDIO, HouseSize.ONE_BEDROOM],
      small_truck: [HouseSize.STUDIO, HouseSize.ONE_BEDROOM],
      medium_truck: [HouseSize.ONE_BEDROOM, HouseSize.TWO_BEDROOM],
      large_truck: [HouseSize.TWO_BEDROOM, HouseSize.THREE_BEDROOM],
      extra_large_truck: [HouseSize.THREE_BEDROOM, HouseSize.FOUR_PLUS],
    };
    return houseSizeMappings[vehicleType] || [];
  }

  /**
   * Get features for a vehicle type
   */
  private getVehicleFeatures(vehicleType: string): string[] {
    const featureMappings: Record<string, string[]> = {
      pickup: ['Easy loading', 'Compact', 'Fuel efficient'],
      van: ['Enclosed cargo', 'Weather protected', 'Easy maneuvering'],
      small_truck: ['Standard moving', 'Good for apartments'],
      medium_truck: ['Ideal for 1-2 bedroom', 'Professional grade'],
      large_truck: ['Full home moving', 'Premium service'],
      extra_large_truck: ['Complete home', 'Large families', 'Long distance'],
    };
    return featureMappings[vehicleType] || [];
  }
}
