import { Injectable, Logger, Optional } from '@nestjs/common';

import { ChargeInput } from '../commands/create-invoice.command';
import { ChargeType } from '../dto/billing.enums';

import { PricingSignalService, PricingContext, PricingSignals } from './pricing-signal.service';

export interface DeliveryPricingInput {
  distanceKm: number;
  currency: string;
  baseDeliveryFee?: number;
  pricePerKm?: number;
  surgeMultiplier?: number;
  serviceFeePercent?: number;
  taxPercent?: number;
  tip?: number;
  discount?: number;
  subsidy?: number;
  pricingContext?: PricingContext;
}

export interface CalculatedCharges {
  charges: ChargeInput[];
  subtotal: number;
  totalDiscounts: number;
  totalTax: number;
  grandTotal: number;
}

/**
 * BillingCalculatorService
 * Calculates delivery charges based on distance and applies pricing rules
 * Integrates with PricingSignalService for dynamic pricing when available
 */
@Injectable()
export class BillingCalculatorService {
  private readonly logger = new Logger(BillingCalculatorService.name);

  private readonly DEFAULT_BASE_FEE = 5.0;
  private readonly DEFAULT_PRICE_PER_KM = 1.5;
  private readonly DEFAULT_SERVICE_FEE_PERCENT = 0.1;
  private readonly DEFAULT_TAX_PERCENT = 0.16;

  constructor(@Optional() private readonly pricingSignalService?: PricingSignalService) {
    if (!this.pricingSignalService) {
      this.logger.warn('PricingSignalService not available - dynamic pricing disabled');
    }
  }

  async calculateDeliveryChargesWithSignals(
    input: DeliveryPricingInput
  ): Promise<CalculatedCharges & { pricingSignals?: PricingSignals }> {
    let pricingSignals: PricingSignals | undefined;

    if (this.pricingSignalService && input.pricingContext) {
      try {
        pricingSignals = await this.pricingSignalService.getPricingSignals(input.pricingContext);

        if (input.surgeMultiplier === undefined && pricingSignals.surgeMultiplier !== 1.0) {
          input = { ...input, surgeMultiplier: pricingSignals.surgeMultiplier };
        }

        for (const adjustment of pricingSignals.dynamicAdjustments) {
          if (adjustment.type === 'DISCOUNT' && adjustment.fixedAmount && !input.discount) {
            input = { ...input, discount: (input.discount ?? 0) + adjustment.fixedAmount };
          }
          if (adjustment.type === 'SUBSIDY' && adjustment.fixedAmount && !input.subsidy) {
            input = { ...input, subsidy: (input.subsidy ?? 0) + adjustment.fixedAmount };
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to get pricing signals: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
      }
    }

    const result = this.calculateDeliveryCharges(input);

    return {
      ...result,
      pricingSignals,
    };
  }

  calculateDeliveryCharges(input: DeliveryPricingInput): CalculatedCharges {
    const charges: ChargeInput[] = [];
    const currency = input.currency;

    const baseFee = input.baseDeliveryFee ?? this.DEFAULT_BASE_FEE;
    charges.push({
      chargeType: ChargeType.BASE_DELIVERY_FEE,
      description: 'Base delivery fee',
      amount: baseFee,
      currency,
      quantity: 1,
      unitPrice: baseFee,
    });

    const pricePerKm = input.pricePerKm ?? this.DEFAULT_PRICE_PER_KM;
    const distanceFee = this.roundToTwoDecimals(input.distanceKm * pricePerKm);
    if (distanceFee > 0) {
      charges.push({
        chargeType: ChargeType.DISTANCE_FEE,
        description: `Distance fee (${input.distanceKm} km)`,
        amount: distanceFee,
        currency,
        quantity: input.distanceKm,
        unitPrice: pricePerKm,
      });
    }

    const surgeMultiplier = input.surgeMultiplier ?? 1;
    if (surgeMultiplier > 1) {
      const deliverySubtotal = baseFee + distanceFee;
      const surgeFee = this.roundToTwoDecimals(deliverySubtotal * (surgeMultiplier - 1));
      charges.push({
        chargeType: ChargeType.SURGE_FEE,
        description: `Surge pricing (${surgeMultiplier}x)`,
        amount: surgeFee,
        currency,
        quantity: 1,
        unitPrice: surgeFee,
      });
    }

    const deliveryTotal = charges.reduce((sum, c) => sum + c.amount, 0);

    const serviceFeePercent = input.serviceFeePercent ?? this.DEFAULT_SERVICE_FEE_PERCENT;
    const serviceFee = this.roundToTwoDecimals(deliveryTotal * serviceFeePercent);
    if (serviceFee > 0) {
      charges.push({
        chargeType: ChargeType.SERVICE_FEE,
        description: `Service fee (${(serviceFeePercent * 100).toFixed(0)}%)`,
        amount: serviceFee,
        currency,
        quantity: 1,
        unitPrice: serviceFee,
      });
    }

    if (input.tip && input.tip > 0) {
      charges.push({
        chargeType: ChargeType.TIP,
        description: 'Tip',
        amount: input.tip,
        currency,
        quantity: 1,
        unitPrice: input.tip,
      });
    }

    let totalDiscounts = 0;
    if (input.discount && input.discount > 0) {
      const discountAmount = -Math.abs(input.discount);
      charges.push({
        chargeType: ChargeType.DISCOUNT,
        description: 'Discount',
        amount: discountAmount,
        currency,
        quantity: 1,
        unitPrice: discountAmount,
      });
      totalDiscounts += Math.abs(input.discount);
    }

    if (input.subsidy && input.subsidy > 0) {
      const subsidyAmount = -Math.abs(input.subsidy);
      charges.push({
        chargeType: ChargeType.SUBSIDY,
        description: 'Platform subsidy',
        amount: subsidyAmount,
        currency,
        quantity: 1,
        unitPrice: subsidyAmount,
      });
      totalDiscounts += Math.abs(input.subsidy);
    }

    const subtotal = this.roundToTwoDecimals(
      charges.filter((c) => c.chargeType !== ChargeType.TAX).reduce((sum, c) => sum + c.amount, 0)
    );

    const taxPercent = input.taxPercent ?? this.DEFAULT_TAX_PERCENT;
    const taxableAmount = Math.max(0, subtotal + totalDiscounts);
    const tax = this.roundToTwoDecimals(taxableAmount * taxPercent);
    if (tax > 0) {
      charges.push({
        chargeType: ChargeType.TAX,
        description: `Tax (${(taxPercent * 100).toFixed(0)}%)`,
        amount: tax,
        currency,
        quantity: 1,
        unitPrice: tax,
      });
    }

    const grandTotal = this.roundToTwoDecimals(subtotal + tax);

    this.logger.debug(
      `Calculated charges: subtotal=${subtotal}, discounts=${totalDiscounts}, tax=${tax}, grandTotal=${grandTotal}`
    );

    return {
      charges,
      subtotal: subtotal + totalDiscounts,
      totalDiscounts,
      totalTax: tax,
      grandTotal,
    };
  }

  calculateTotalsFromCharges(charges: ChargeInput[]): {
    subtotal: number;
    totalDiscounts: number;
    totalTax: number;
    grandTotal: number;
  } {
    let subtotal = 0;
    let totalDiscounts = 0;
    let totalTax = 0;

    for (const charge of charges) {
      if (charge.chargeType === ChargeType.TAX) {
        totalTax += charge.amount;
      } else if (
        charge.chargeType === ChargeType.DISCOUNT ||
        charge.chargeType === ChargeType.SUBSIDY
      ) {
        totalDiscounts += Math.abs(charge.amount);
        subtotal += charge.amount;
      } else {
        subtotal += charge.amount;
      }
    }

    subtotal = this.roundToTwoDecimals(subtotal + totalDiscounts);
    totalTax = this.roundToTwoDecimals(totalTax);
    const grandTotal = this.roundToTwoDecimals(subtotal - totalDiscounts + totalTax);

    return { subtotal, totalDiscounts, totalTax, grandTotal };
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
