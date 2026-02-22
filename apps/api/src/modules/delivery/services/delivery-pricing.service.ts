import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

/**
 * Delivery Quote DTO - response format for quote requests
 */
export interface DeliveryQuoteResponse {
  quoteId: string;
  basePrice: number;
  distancePrice: number;
  totalPrice: number;
  currency: string;
  distanceKm: number | null;
  estimatedPickupMinutes: number | null;
  estimatedDeliveryMinutes: number | null;
  vehicleType: string | null;
  expiresAt: Date;
  meta: Record<string, unknown>;
}

/**
 * Quote request input from WooCommerce plugin
 */
export interface QuoteRequestInput {
  businessId: string;
  workspaceId: string;
  pickup: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  dropoff: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  distanceKm?: number;
  vehicleType?: string;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
}

/**
 * Delivery Pricing Service
 * 
 * Calculates delivery quotes based on distance, vehicle type, and timing.
 * This is a simplified implementation - in production, this would integrate
 * with a real pricing engine, distance matrix API, and business rules.
 */
@Injectable()
export class DeliveryPricingService {
  private readonly _logger = new Logger(DeliveryPricingService.name);

  // Base pricing configuration (KES)
  private readonly BASE_PRICE = 200; // Minimum base price
  private readonly PRICE_PER_KM = 50; // Price per kilometer
  private readonly RUSH_HOUR_MULTIPLIER = 1.5;
  private readonly SCHEDULED_DISCOUNT = 0.1; // 10% discount for scheduled deliveries

  // Vehicle type multipliers
  private readonly VEHICLE_MULTIPLIERS: Record<string, number> = {
    motorbike: 1.0,
    car: 1.5,
    van: 2.0,
    truck: 3.0,
  };

  // Default vehicle type
  private readonly DEFAULT_VEHICLE = 'motorbike';

  /**
   * Calculate a delivery quote
   */
  async calculateQuote(input: QuoteRequestInput): Promise<DeliveryQuoteResponse> {
    this._logger.debug(`Calculating quote for businessId=${input.businessId}`);

    // Calculate distance if not provided
    const distanceKm = input.distanceKm ?? this.calculateMockDistance(
      input.pickup.latitude ?? 0,
      input.pickup.longitude ?? 0,
      input.dropoff.latitude ?? 0,
      input.dropoff.longitude ?? 0
    );

    // Get vehicle multiplier
    const vehicleType = input.vehicleType ?? this.DEFAULT_VEHICLE;
    const vehicleMultiplier = this.VEHICLE_MULTIPLIERS[vehicleType] ?? 1.0;

    // Determine if rush hour (simplified - 7-9am and 5-7pm)
    const isRushHour = this.isRushHour();

    // Calculate prices
    let basePrice = this.BASE_PRICE * vehicleMultiplier;
    const distancePrice = distanceKm * this.PRICE_PER_KM * vehicleMultiplier;

    // Apply rush hour multiplier
    if (isRushHour) {
      basePrice *= this.RUSH_HOUR_MULTIPLIER;
    }

    // Apply scheduled discount
    if (input.scheduledPickupTime) {
      basePrice *= (1 - this.SCHEDULED_DISCOUNT);
    }

    // Calculate total
    const totalPrice = basePrice + distancePrice;

    // Estimate times (simplified)
    const estimatedPickupMinutes = Math.max(15, Math.round(distanceKm * 2));
    const estimatedDeliveryMinutes = Math.max(30, Math.round(distanceKm * 4));

    // Set expiration (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return {
      quoteId: `quote_${randomUUID()}`,
      basePrice: Math.round(basePrice),
      distancePrice: Math.round(distancePrice),
      totalPrice: Math.round(totalPrice),
      currency: 'KES',
      distanceKm,
      estimatedPickupMinutes,
      estimatedDeliveryMinutes,
      vehicleType,
      expiresAt,
      meta: {
        isRushHour,
        hasScheduledPickup: !!input.scheduledPickupTime,
        vehicleMultiplier,
      },
    };
  }

  /**
   * Validate a quote (check if still valid)
   */
  async validateQuote(quoteId: string): Promise<{ valid: boolean; reason?: string }> {
    // In a real implementation, this would check against stored quotes
    // For now, we just return valid
    return { valid: true };
  }

  /**
   * Calculate mock distance using Haversine formula
   */
  private calculateMockDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // If coordinates are not provided, return a default distance
    if (lat1 === 0 && lon1 === 0 && lat2 === 0 && lon2 === 0) {
      return 5; // Default 5km
    }

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10; // Round to 1 decimal
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Check if current time is rush hour
   */
  private isRushHour(): boolean {
    const hour = new Date().getHours();
    return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  }
}
