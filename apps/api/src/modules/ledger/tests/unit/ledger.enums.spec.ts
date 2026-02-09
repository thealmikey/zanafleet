import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../../dto/ledger.enums';

describe('LedgerEnums', () => {
  describe('LedgerEntryType', () => {
    it('should have DEBIT and CREDIT values', () => {
      expect(LedgerEntryType.DEBIT).toBe('DEBIT');
      expect(LedgerEntryType.CREDIT).toBe('CREDIT');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(LedgerEntryType);
      expect(values).toHaveLength(2);
    });
  });

  describe('LedgerCategory', () => {
    it('should have all expected categories', () => {
      expect(LedgerCategory.DELIVERY_FEE).toBe('DELIVERY_FEE');
      expect(LedgerCategory.PLATFORM_FEE).toBe('PLATFORM_FEE');
      expect(LedgerCategory.RIDER_EARNING).toBe('RIDER_EARNING');
      expect(LedgerCategory.TIP).toBe('TIP');
      expect(LedgerCategory.SUBSIDY).toBe('SUBSIDY');
      expect(LedgerCategory.REFUND).toBe('REFUND');
      expect(LedgerCategory.PAYOUT).toBe('PAYOUT');
      expect(LedgerCategory.ADJUSTMENT).toBe('ADJUSTMENT');
    });

    it('should have exactly 8 categories', () => {
      const values = Object.values(LedgerCategory);
      expect(values).toHaveLength(8);
    });
  });

  describe('LedgerReferenceType', () => {
    it('should have all expected reference types', () => {
      expect(LedgerReferenceType.PAYMENT).toBe('PAYMENT');
      expect(LedgerReferenceType.INVOICE).toBe('INVOICE');
      expect(LedgerReferenceType.SETTLEMENT).toBe('SETTLEMENT');
    });

    it('should have exactly 3 reference types', () => {
      const values = Object.values(LedgerReferenceType);
      expect(values).toHaveLength(3);
    });
  });
});
