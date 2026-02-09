import { SettlementStatus, PayoutMethod } from '../../dto/settlement.enums';

describe('SettlementEnums', () => {
  describe('SettlementStatus', () => {
    it('should have all expected statuses', () => {
      expect(SettlementStatus.PENDING).toBe('PENDING');
      expect(SettlementStatus.PROCESSING).toBe('PROCESSING');
      expect(SettlementStatus.COMPLETED).toBe('COMPLETED');
      expect(SettlementStatus.FAILED).toBe('FAILED');
      expect(SettlementStatus.PARTIALLY_FAILED).toBe('PARTIALLY_FAILED');
    });

    it('should have exactly 5 statuses', () => {
      const values = Object.values(SettlementStatus);
      expect(values).toHaveLength(5);
    });
  });

  describe('PayoutMethod', () => {
    it('should have all expected methods', () => {
      expect(PayoutMethod.MOBILE_MONEY).toBe('MOBILE_MONEY');
      expect(PayoutMethod.BANK_TRANSFER).toBe('BANK_TRANSFER');
      expect(PayoutMethod.WALLET).toBe('WALLET');
    });

    it('should have exactly 3 methods', () => {
      const values = Object.values(PayoutMethod);
      expect(values).toHaveLength(3);
    });
  });
});
