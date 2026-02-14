import { Inject, Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { GEO_PROVIDER, GeoPoint } from '../../location-intelligence/providers/geo-provider.interface';
import { 
  MovingQuoteRequest, 
  MovingQuote, 
  AvailableSlot, 
  PricingFactor,
  HOUSE_SIZE_CONFIG,
  HouseSize,
} from '../dto';

/**
 * Movers Pricing Service
 * 
 * Calculates moving quotes based on:
 * - Distance between locations
 * - House size
 */
@Injectable()
export class MoversPricingService {
  private readonly logger = new Logger(MoversPricingService.name);

  constructor(
    @Inject(GEO_PROVIDER) private readonly geoProvider: { calculateDistance(from: GeoPoint, to: GeoPoint): Promise<number> },
  ) {}

  /**
   * Calculate a moving quote
   */
  async calculateQuote(request: MovingQuoteRequest): Promise<Omit<MovingQuote, 'vehicles'>> {
    this.logger.log(`Calculating quote for move: ${request.movingFrom.formattedAddress} → ${request.movingTo.formattedAddress}`);

    // Calculate distance
    const fromPoint: GeoPoint = { 
      latitude: request.movingFrom.latitude, 
      longitude: request.movingFrom.longitude 
    };
    const toPoint: GeoPoint = { 
      latitude: request.movingTo.latitude, 
      longitude: request.movingTo.longitude 
    };

    const distanceMeters = await this.geoProvider.calculateDistance(fromPoint, toPoint);
    const distanceKm = distanceMeters / 1000;

    // Calculate base price
    const basePrice = this.calculateBasePrice(request.currentHouseSize, request.destinationHouseSize, distanceKm);
    
    // Apply modifiers
    const adjustedPrice = this.applyPriceModifiers(basePrice, request);
    
    // Calculate duration
    const duration = this.calculateDuration(distanceKm, request.currentHouseSize);
    
    // Get available time slots
    const availableSlots = this.getAvailableSlots(request.preferredDate);
    
    // Extract pricing factors
    const pricingFactors = this.extractPricingFactors(adjustedPrice, basePrice, request);

    return {
      quoteId: uuidv4(),
      estimatedPrice: {
        min: Math.round(adjustedPrice.min),
        max: Math.round(adjustedPrice.max),
        currency: 'KES',
      },
      estimatedDuration: duration,
      distanceKilometers: distanceKm,
      availableSlots,
      pricingFactors,
      validUntil: this.getQuoteExpiration(),
    };
  }

  /**
   * Calculate base price
   */
  private calculateBasePrice(
    currentSize: HouseSize,
    destinationSize: HouseSize,
    distanceKm: number
  ): number {
    const currentConfig = HOUSE_SIZE_CONFIG[currentSize];
    const destinationConfig = HOUSE_SIZE_CONFIG[destinationSize];
    
    const baseFee = 1500;
    const perKmRate = 45;
    const sizeMultiplier = Math.max(currentConfig.capacityCubicMeters, destinationConfig.capacityCubicMeters) / 10;
    
    const price = baseFee + (distanceKm * perKmRate * sizeMultiplier);
    return Math.round(price);
  }

  /**
   * Apply price modifiers
   */
  private applyPriceModifiers(
    basePrice: number,
    request: MovingQuoteRequest
  ): { min: number; max: number } {
    let price = basePrice;

    // Weekend surcharge (20%)
    const today = new Date();
    if (today.getDay() === 6) {
      price = Math.round(price * 1.2);
    }

    // Packing service (+30%)
    if (request.requirePackingService) {
      price = Math.round(price * 1.3);
    }

    // Elevator/stairs might affect price (+15%)
    if (request.requireElevator === false) {
      price = Math.round(price * 1.15);
    }

    // Add 10% buffer for price range
    const buffer = Math.round(price * 0.1);
    
    return {
      min: Math.round(price - buffer),
      max: Math.round(price + buffer),
    };
  }

  /**
   * Calculate duration
   */
  private calculateDuration(distanceKm: number, houseSize: HouseSize): { minMinutes: number; maxMinutes: number } {
    const config = HOUSE_SIZE_CONFIG[houseSize];
    
    const baseTimeMinutes = (distanceKm / 10) * 30;
    const loadingTimeMinutes = config.capacityCubicMeters * 2;
    
    const totalMin = Math.round(baseTimeMinutes + loadingTimeMinutes);
    const totalMax = Math.round(totalMin * 1.5);
    
    return {
      minMinutes: Math.max(totalMin, 60),
      maxMinutes: Math.max(totalMax, 120),
    };
  }

  /**
   * Get available time slots
   */
  private getAvailableSlots(preferredDate?: Date): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const today = preferredDate || new Date();
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      
      if (date.getDay() === 0) continue; // Skip Sundays
      
      slots.push({
        date,
        startTime: '08:00',
        endTime: '12:00',
        available: true,
      });
      
      slots.push({
        date,
        startTime: '13:00',
        endTime: '17:00',
        available: true,
      });
    }

    return slots.slice(0, 10);
  }

  /**
   * Extract pricing factors
   */
  private extractPricingFactors(
    adjustedPrice: { min: number; max: number },
    basePrice: number,
    request: MovingQuoteRequest
  ): PricingFactor[] {
    const factors: PricingFactor[] = [];
    
    factors.push({
      name: 'Base Rate',
      impact: 'neutral',
      description: 'Standard base rate and distance calculation',
    });
    
    const priceChange = adjustedPrice.max - basePrice;
    if (priceChange > 0) {
      factors.push({
        name: 'Service Adjustments',
        impact: 'negative',
        description: 'Additional services selected',
      });
    }
    
    const today = new Date();
    if (today.getDay() === 6) {
      factors.push({
        name: 'Weekend Booking',
        impact: 'negative',
        description: 'Weekend booking surcharge applies',
      });
    }

    if (request.requirePackingService) {
      factors.push({
        name: 'Packing Service',
        impact: 'negative',
        description: 'Professional packing included',
      });
    }

    return factors;
  }

  /**
   * Get quote expiration
   */
  private getQuoteExpiration(): Date {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 7);
    expiration.setHours(23, 59, 59, 999);
    return expiration;
  }
}
