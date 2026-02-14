import { VehicleCapabilityProfile } from './vehicle-capability-profile';

/**
 * MoveEstimate represents a comprehensive moving quote including
 * vehicle recommendations, pricing breakdown, and policy adjustments.
 */
export interface MoveEstimate {
  /** Unique identifier for this quote */
  quoteId: string;
  /** Recommended vehicles for this move */
  recommendedVehicles: VehicleRecommendation[];
  /** Detailed pricing breakdown */
  priceBreakdown: PriceBreakdown;
  /** Policy-based adjustments (discounts, surcharges) */
  policyAdjustments: PolicyAdjustment[];
  /** Current demand multiplier (e.g., 1.2 for high demand) */
  demandMultiplier?: number;
  /** Human-readable explanation of the estimate */
  explanation: string;
  /** Validity period for this quote */
  validUntil: string;
  /** Additional notes or terms */
  notes?: string[];
}

/**
 * Vehicle recommendation within a move estimate
 */
export interface VehicleRecommendation {
  /** Vehicle identifier */
  vehicleId: string;
  /** Vehicle type name */
  type: string;
  /** Full capability profile of the vehicle */
  capacityProfile: VehicleCapabilityProfile;
  /** Estimated price for using this vehicle */
  estimatedPrice: number;
  /** Estimated duration in minutes */
  estimatedDuration: number;
  /** Current availability status */
  availabilityStatus: 'available' | 'limited' | 'unavailable';
  /** Match score 0-100 indicating how well this vehicle fits the move */
  matchScore: number;
  /** Reason for recommendation */
  recommendationReason?: string;
}

/**
 * Detailed breakdown of pricing components
 */
export interface PriceBreakdown {
  /** Base fare for the move */
  baseFare: number;
  /** Charge based on distance */
  distanceCharge: number;
  /** Charge based on volume */
  volumeCharge: number;
  /** Charge for labor */
  laborCharge: number;
  /** Fuel surcharge */
  fuelSurcharge: number;
  /** Total discounts applied */
  discounts: number;
  /** Applicable taxes */
  taxes: number;
  /** Grand total */
  total: number;
  /** Currency code */
  currency: string;
}

/**
 * Policy adjustment applied to the quote
 */
export interface PolicyAdjustment {
  /** Policy identifier */
  policyId: string;
  /** Type of adjustment */
  type: 'discount' | 'surcharge' | 'restriction';
  /** Display name of the policy */
  name: string;
  /** Amount (positive for discounts, negative for surcharges) */
  amount: number;
  /** Description of the adjustment */
  description: string;
}

/**
 * Quote status enumeration
 */
export enum QuoteStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Quote metadata for tracking
 */
export interface QuoteMetadata {
  createdAt: string;
  expiresAt: string;
  source: 'api' | 'web' | 'mobile';
  version: string;
  correlationId?: string;
}

/**
 * Create a PriceBreakdown with calculated values
 */
export function createPriceBreakdown(params: {
  baseFare: number;
  distanceKm: number;
  volumeM3: number;
  laborHours: number;
  laborRatePerHour: number;
  fuelSurchargePercent: number;
  discountAmount: number;
  taxRatePercent: number;
  currency: string;
}): PriceBreakdown {
  const distanceCharge = params.distanceKm * 2.5; // KES per km
  const volumeCharge = params.volumeM3 * 50; // KES per cubic meter
  const laborCharge = params.laborHours * params.laborRatePerHour;
  const subtotal = params.baseFare + distanceCharge + volumeCharge + laborCharge;
  const fuelSurcharge = subtotal * (params.fuelSurchargePercent / 100);
  const discountedSubtotal = subtotal - params.discountAmount;
  const taxes = discountedSubtotal * (params.taxRatePercent / 100);
  const total = discountedSubtotal + fuelSurcharge + taxes;

  return {
    baseFare: params.baseFare,
    distanceCharge: Math.round(distanceCharge * 100) / 100,
    volumeCharge: Math.round(volumeCharge * 100) / 100,
    laborCharge: Math.round(laborCharge * 100) / 100,
    fuelSurcharge: Math.round(fuelSurcharge * 100) / 100,
    discounts: -Math.abs(params.discountAmount),
    taxes: Math.round(taxes * 100) / 100,
    total: Math.round(total * 100) / 100,
    currency: params.currency,
  };
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Calculate demand multiplier based on date and season
 */
export function calculateDemandMultiplier(requestedDate: Date): number {
  const dayOfWeek = requestedDate.getDay();
  const month = requestedDate.getMonth();
  const dayOfMonth = requestedDate.getDate();

  // Weekend premium
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 1.25;
  }

  // Month-end premium (moving day)
  if (dayOfMonth >= 25 || dayOfMonth <= 3) {
    return 1.15;
  }

  // Peak season (June-August, December)
  if (month >= 5 && month <= 7) {
    return 1.2;
  }
  if (month === 11) {
    return 1.3;
  }

  // Holiday premium (within 3 days of major holidays)
  const holidays = [
    new Date(requestedDate.getFullYear(), 11, 25), // Christmas
    new Date(requestedDate.getFullYear(), 0, 1), // New Year
    new Date(requestedDate.getFullYear(), 2, 8), // International Women's Day approximate
  ];

  for (const holiday of holidays) {
    const diffDays = Math.abs(requestedDate.getTime() - holiday.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 3) {
      return 1.35;
    }
  }

  return 1.0;
}
