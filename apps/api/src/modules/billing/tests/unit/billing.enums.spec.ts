import { ChargeType, InvoiceStatus } from '../../dto/billing.enums';

describe('BillingEnums', () => {
  describe('ChargeType', () => {
    it('should have all expected charge types', () => {
      expect(ChargeType.BASE_DELIVERY_FEE).toBe('BASE_DELIVERY_FEE');
      expect(ChargeType.DISTANCE_FEE).toBe('DISTANCE_FEE');
      expect(ChargeType.SURGE_FEE).toBe('SURGE_FEE');
      expect(ChargeType.SERVICE_FEE).toBe('SERVICE_FEE');
      expect(ChargeType.TAX).toBe('TAX');
      expect(ChargeType.TIP).toBe('TIP');
      expect(ChargeType.DISCOUNT).toBe('DISCOUNT');
      expect(ChargeType.SUBSIDY).toBe('SUBSIDY');
    });

    it('should have exactly 8 charge types', () => {
      const values = Object.values(ChargeType);
      expect(values).toHaveLength(8);
    });
  });

  describe('InvoiceStatus', () => {
    it('should have all expected statuses', () => {
      expect(InvoiceStatus.DRAFT).toBe('DRAFT');
      expect(InvoiceStatus.ISSUED).toBe('ISSUED');
      expect(InvoiceStatus.PAID).toBe('PAID');
      expect(InvoiceStatus.PARTIALLY_PAID).toBe('PARTIALLY_PAID');
      expect(InvoiceStatus.OVERDUE).toBe('OVERDUE');
      expect(InvoiceStatus.CANCELLED).toBe('CANCELLED');
      expect(InvoiceStatus.REFUNDED).toBe('REFUNDED');
    });

    it('should have exactly 7 statuses', () => {
      const values = Object.values(InvoiceStatus);
      expect(values).toHaveLength(7);
    });
  });
});
