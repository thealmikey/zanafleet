import { BillingCalculatorService } from '../../services/billing-calculator.service';
import { ChargeType } from '../../dto/billing.enums';
import { PricingSignalService, PricingSignals } from '../../services/pricing-signal.service';

describe('BillingCalculatorService', () => {
  let service: BillingCalculatorService;
  let mockPricingSignalService: jest.Mocked<PricingSignalService>;

  beforeEach(() => {
    mockPricingSignalService = {
      getPricingSignals: jest.fn(),
    } as unknown as jest.Mocked<PricingSignalService>;

    service = new BillingCalculatorService(undefined);
  });

  describe('calculateDeliveryCharges', () => {
    it('should calculate charges with defaults', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 10,
        currency: 'USD',
      });

      expect(result.charges.length).toBeGreaterThan(0);
      expect(result.grandTotal).toBeGreaterThan(0);

      const baseFee = result.charges.find((c) => c.chargeType === ChargeType.BASE_DELIVERY_FEE);
      expect(baseFee).toBeDefined();
      expect(baseFee?.amount).toBe(5.0);

      const distanceFee = result.charges.find((c) => c.chargeType === ChargeType.DISTANCE_FEE);
      expect(distanceFee).toBeDefined();
      expect(distanceFee?.amount).toBe(15.0);
    });

    it('should apply surge multiplier', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 10,
        currency: 'USD',
        surgeMultiplier: 1.5,
      });

      const surgeFee = result.charges.find((c) => c.chargeType === ChargeType.SURGE_FEE);
      expect(surgeFee).toBeDefined();
      expect(surgeFee?.amount).toBe(10.0);
    });

    it('should not add surge fee when multiplier is 1', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 10,
        currency: 'USD',
        surgeMultiplier: 1,
      });

      const surgeFee = result.charges.find((c) => c.chargeType === ChargeType.SURGE_FEE);
      expect(surgeFee).toBeUndefined();
    });

    it('should calculate service fee as percentage of delivery total', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 10,
        currency: 'USD',
        serviceFeePercent: 0.1,
      });

      const serviceFee = result.charges.find((c) => c.chargeType === ChargeType.SERVICE_FEE);
      expect(serviceFee).toBeDefined();
      expect(serviceFee?.amount).toBe(2.0);
    });

    it('should add tip when provided', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 5,
        currency: 'USD',
        tip: 3.0,
      });

      const tip = result.charges.find((c) => c.chargeType === ChargeType.TIP);
      expect(tip).toBeDefined();
      expect(tip?.amount).toBe(3.0);
    });

    it('should add discount as negative amount', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 5,
        currency: 'USD',
        discount: 5.0,
      });

      const discount = result.charges.find((c) => c.chargeType === ChargeType.DISCOUNT);
      expect(discount).toBeDefined();
      expect(discount?.amount).toBe(-5.0);
      expect(result.totalDiscounts).toBe(5.0);
    });

    it('should add subsidy as negative amount', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 5,
        currency: 'USD',
        subsidy: 2.0,
      });

      const subsidy = result.charges.find((c) => c.chargeType === ChargeType.SUBSIDY);
      expect(subsidy).toBeDefined();
      expect(subsidy?.amount).toBe(-2.0);
      expect(result.totalDiscounts).toBe(2.0);
    });

    it('should calculate tax on pre-discount amount', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 10,
        currency: 'USD',
        baseDeliveryFee: 10,
        pricePerKm: 0,
        serviceFeePercent: 0,
        taxPercent: 0.16,
      });

      const tax = result.charges.find((c) => c.chargeType === ChargeType.TAX);
      expect(tax).toBeDefined();
      expect(tax?.amount).toBe(1.6);
      expect(result.totalTax).toBe(1.6);
    });

    it('should verify grandTotal = subtotal - totalDiscounts + totalTax', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 10,
        currency: 'USD',
        discount: 5.0,
        taxPercent: 0.1,
      });

      const expectedGrandTotal = result.subtotal - result.totalDiscounts + result.totalTax;
      expect(result.grandTotal).toBeCloseTo(expectedGrandTotal, 2);
    });

    it('should handle custom pricing parameters', () => {
      const result = service.calculateDeliveryCharges({
        distanceKm: 5,
        currency: 'KES',
        baseDeliveryFee: 100,
        pricePerKm: 20,
        serviceFeePercent: 0.05,
        taxPercent: 0.16,
      });

      const baseFee = result.charges.find((c) => c.chargeType === ChargeType.BASE_DELIVERY_FEE);
      expect(baseFee?.amount).toBe(100);

      const distanceFee = result.charges.find((c) => c.chargeType === ChargeType.DISTANCE_FEE);
      expect(distanceFee?.amount).toBe(100);

      expect(result.grandTotal).toBeGreaterThan(200);
    });
  });

  describe('calculateDeliveryChargesWithSignals', () => {
    beforeEach(() => {
      service = new BillingCalculatorService(mockPricingSignalService);
    });

    it('should apply surge multiplier from pricing signals', async () => {
      const pricingSignals: PricingSignals = {
        surgeMultiplier: 1.5,
        isOffPeak: false,
        isHoliday: false,
        dynamicAdjustments: [],
        evaluatedAt: new Date(),
      };
      mockPricingSignalService.getPricingSignals.mockResolvedValue(pricingSignals);

      const result = await service.calculateDeliveryChargesWithSignals({
        distanceKm: 10,
        currency: 'USD',
        pricingContext: {
          workspaceId: 'ws-123',
          timestamp: new Date(),
          timezone: 'UTC',
        },
      });

      expect(result.pricingSignals).toBe(pricingSignals);

      const surgeFee = result.charges.find((c) => c.chargeType === ChargeType.SURGE_FEE);
      expect(surgeFee).toBeDefined();
      expect(surgeFee?.amount).toBe(10);
    });

    it('should not override explicit surge multiplier', async () => {
      const pricingSignals: PricingSignals = {
        surgeMultiplier: 2.0,
        isOffPeak: false,
        isHoliday: false,
        dynamicAdjustments: [],
        evaluatedAt: new Date(),
      };
      mockPricingSignalService.getPricingSignals.mockResolvedValue(pricingSignals);

      const result = await service.calculateDeliveryChargesWithSignals({
        distanceKm: 10,
        currency: 'USD',
        surgeMultiplier: 1.5,
        pricingContext: {
          workspaceId: 'ws-123',
          timestamp: new Date(),
          timezone: 'UTC',
        },
      });

      const surgeFee = result.charges.find((c) => c.chargeType === ChargeType.SURGE_FEE);
      expect(surgeFee?.amount).toBe(10);
    });

    it('should work without pricing context', async () => {
      const result = await service.calculateDeliveryChargesWithSignals({
        distanceKm: 10,
        currency: 'USD',
      });

      expect(result.pricingSignals).toBeUndefined();
      expect(mockPricingSignalService.getPricingSignals).not.toHaveBeenCalled();
    });

    it('should handle pricing signal service errors gracefully', async () => {
      mockPricingSignalService.getPricingSignals.mockRejectedValue(new Error('Service error'));

      const result = await service.calculateDeliveryChargesWithSignals({
        distanceKm: 10,
        currency: 'USD',
        pricingContext: {
          workspaceId: 'ws-123',
          timestamp: new Date(),
          timezone: 'UTC',
        },
      });

      expect(result.pricingSignals).toBeUndefined();
      expect(result.grandTotal).toBeGreaterThan(0);
    });
  });

  describe('calculateTotalsFromCharges', () => {
    it('should calculate totals from charge array', () => {
      const charges = [
        { chargeType: ChargeType.BASE_DELIVERY_FEE, amount: 5, currency: 'USD', quantity: 1, unitPrice: 5 },
        { chargeType: ChargeType.DISTANCE_FEE, amount: 15, currency: 'USD', quantity: 10, unitPrice: 1.5 },
        { chargeType: ChargeType.DISCOUNT, amount: -5, currency: 'USD', quantity: 1, unitPrice: -5 },
        { chargeType: ChargeType.TAX, amount: 2.4, currency: 'USD', quantity: 1, unitPrice: 2.4 },
      ];

      const result = service.calculateTotalsFromCharges(charges);

      expect(result.subtotal).toBe(20);
      expect(result.totalDiscounts).toBe(5);
      expect(result.totalTax).toBe(2.4);
      expect(result.grandTotal).toBeCloseTo(17.4, 2);
    });

    it('should handle charges with no discounts', () => {
      const charges = [
        { chargeType: ChargeType.BASE_DELIVERY_FEE, amount: 10, currency: 'USD', quantity: 1, unitPrice: 10 },
        { chargeType: ChargeType.TAX, amount: 1.6, currency: 'USD', quantity: 1, unitPrice: 1.6 },
      ];

      const result = service.calculateTotalsFromCharges(charges);

      expect(result.subtotal).toBe(10);
      expect(result.totalDiscounts).toBe(0);
      expect(result.totalTax).toBe(1.6);
      expect(result.grandTotal).toBe(11.6);
    });

    it('should handle SUBSIDY same as DISCOUNT', () => {
      const charges = [
        { chargeType: ChargeType.BASE_DELIVERY_FEE, amount: 20, currency: 'USD', quantity: 1, unitPrice: 20 },
        { chargeType: ChargeType.SUBSIDY, amount: -8, currency: 'USD', quantity: 1, unitPrice: -8 },
      ];

      const result = service.calculateTotalsFromCharges(charges);

      expect(result.totalDiscounts).toBe(8);
      expect(result.subtotal).toBe(20);
      expect(result.grandTotal).toBe(12);
    });
  });
});
