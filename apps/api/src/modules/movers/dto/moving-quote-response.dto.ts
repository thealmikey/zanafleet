/**
 * Vehicle Recommendation DTO
 * Represents a recommended vehicle for a moving job
 */
export interface VehicleRecommendation {
  vehicleType: string;
  vehicleName: string;
  capacity: string;
  recommendedFor: string[];
  estimatedCapacityCubicMeters: number;
  imageUrl?: string;
  features?: string[];
}

/**
 * Available Time Slot DTO
 */
export interface AvailableSlot {
  date: Date;
  startTime: string;
  endTime: string;
  available: boolean;
}

/**
 * Pricing Factor DTO
 */
export interface PricingFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Price Range DTO
 */
export interface PriceRange {
  min: number;
  max: number;
  currency: string;
}

/**
 * Duration Estimate DTO
 */
export interface DurationEstimate {
  minMinutes: number;
  maxMinutes: number;
}

/**
 * Moving Quote Response DTO
 */
export interface MovingQuote {
  quoteId: string;
  vehicles: VehicleRecommendation[];
  estimatedPrice: PriceRange;
  estimatedDuration: DurationEstimate;
  distanceKilometers: number;
  availableSlots: AvailableSlot[];
  pricingFactors: PricingFactor[];
  validUntil: Date;
  notes?: string[];
}
