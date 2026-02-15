import {
  PaymentIntentStatus,
  PaymentFlowType,
  PaymentMethod,
} from '../../dto/payment.enums';

describe('PaymentEnums', () => {
  describe('PaymentIntentStatus', () => {
    it('should have all expected statuses', () => {
      expect(PaymentIntentStatus.CREATED).toBe('CREATED');
      expect(PaymentIntentStatus.PROCESSING).toBe('PROCESSING');
      expect(PaymentIntentStatus.SUCCEEDED).toBe('SUCCEEDED');
      expect(PaymentIntentStatus.FAILED).toBe('FAILED');
      expect(PaymentIntentStatus.CANCELLED).toBe('CANCELLED');
    });

    it('should have exactly 6 statuses', () => {
      const values = Object.values(PaymentIntentStatus);
      expect(values).toHaveLength(6);
    });
  });

  describe('PaymentFlowType', () => {
    it('should have all expected flow types', () => {
      expect(PaymentFlowType.C2B).toBe('C2B');
      expect(PaymentFlowType.B2C).toBe('B2C');
      expect(PaymentFlowType.B2B).toBe('B2B');
      expect(PaymentFlowType.C2C).toBe('C2C');
      expect(PaymentFlowType.PLATFORM_PAYOUT).toBe('PLATFORM_PAYOUT');
    });

    it('should have exactly 5 flow types', () => {
      const values = Object.values(PaymentFlowType);
      expect(values).toHaveLength(5);
    });
  });

  describe('PaymentMethod', () => {
    it('should have all expected methods', () => {
      expect(PaymentMethod.CARD).toBe('CARD');
      expect(PaymentMethod.MOBILE_MONEY).toBe('MOBILE_MONEY');
      expect(PaymentMethod.BANK_TRANSFER).toBe('BANK_TRANSFER');
      expect(PaymentMethod.WALLET_BALANCE).toBe('WALLET_BALANCE');
    });

    it('should have exactly 4 methods', () => {
      const values = Object.values(PaymentMethod);
      expect(values).toHaveLength(4);
    });
  });
});
