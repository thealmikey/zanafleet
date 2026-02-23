import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { BillingCalculatorService } from '@api/modules/billing/services/billing-calculator.service';
import { ChargeType } from '@api/modules/billing/dto/billing.enums';

export class CreateQuoteRequestDto {
  businessId!: string;
  workspaceId!: string;
  actorId?: string;
  pickup!: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  dropoff!: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  distanceKm?: number;
  vehicleType?: string;
  scheduledPickupTime?: Date;
  scheduledDropoffTime?: Date;
  packageDetails?: {
    weight?: number;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
    description?: string;
    value?: number;
  };
}

/**
 * Quotes Controller for WooCommerce Integration
 * 
 * Provides endpoints at /api/v1/quotes for the WooCommerce plugin
 * to create delivery quotes without requiring full delivery creation.
 */
@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly billingCalculator: BillingCalculatorService,
  ) {}

  /**
   * POST /api/v1/quotes
   * Create a delivery quote (WooCommerce compatible API)
   * 
   * This endpoint matches the WooCommerce plugin's expected interface:
   * - POST /api/v1/quotes
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createQuote(
    @Body() dto: CreateQuoteRequestDto,
  ): Promise<{
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
  }> {
    // Use billing calculator to compute pricing
    const distanceKm = dto.distanceKm ?? 5; // Default 5km if not provided
    const charges = this.billingCalculator.calculateDeliveryCharges({
      distanceKm,
      currency: 'KES',
      baseDeliveryFee: 200,
      pricePerKm: 50,
    });

    // Return quote in WooCommerce-compatible format
    return {
      quoteId: `quote_${Date.now()}`,
      basePrice: charges.charges.find(c => c.chargeType === ChargeType.BASE_DELIVERY_FEE)?.amount ?? 200,
      distancePrice: charges.charges.find(c => c.chargeType === ChargeType.DISTANCE_FEE)?.amount ?? (distanceKm * 50),
      totalPrice: charges.grandTotal,
      currency: 'KES',
      distanceKm,
      estimatedPickupMinutes: Math.max(15, Math.round(distanceKm * 2)),
      estimatedDeliveryMinutes: Math.max(30, Math.round(distanceKm * 4)),
      vehicleType: dto.vehicleType ?? 'motorbike',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    };
  }
}
