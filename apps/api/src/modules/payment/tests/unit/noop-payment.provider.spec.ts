import { NoOpPaymentProvider } from '../../providers/noop-payment.provider';
import { PaymentStatus } from '../../providers/dto/payment-provider.types';

describe('NoOpPaymentProvider', () => {
  let provider: NoOpPaymentProvider;

  beforeEach(() => {
    provider = new NoOpPaymentProvider();
  });

  describe('provider metadata', () => {
    it('should have correct providerId', () => {
      expect(provider.providerId).toBe('noop');
    });

    it('should have display name', () => {
      expect(provider.displayName).toBe('No-Op Payment Provider');
    });

    it('should support multiple currencies', () => {
      expect(provider.supportedCurrencies).toContain('USD');
      expect(provider.supportedCurrencies).toContain('KES');
    });

    it('should have multiple capabilities', () => {
      expect(provider.capabilities).toContain('CARD');
      expect(provider.capabilities).toContain('MOBILE_MONEY');
      expect(provider.capabilities).toContain('BANK_TRANSFER');
      expect(provider.capabilities).toContain('WALLET');
    });
  });

  describe('initiatePayment', () => {
    it('should return success with transaction id', async () => {
      const result = await provider.initiatePayment({
        amount: 100,
        currency: 'USD',
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    });

    it('should include provider reference', async () => {
      const result = await provider.initiatePayment({
        amount: 50,
        currency: 'KES',
      });

      expect(result.providerReference).toBeDefined();
      expect(result.providerReference).toMatch(/^noop_\d+$/);
    });

    it('should preserve metadata', async () => {
      const metadata = { orderId: 'order-123', customerId: 'cust-456' };

      const result = await provider.initiatePayment({
        amount: 100,
        currency: 'USD',
        metadata,
      });

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('capturePayment', () => {
    it('should return success for any transaction', async () => {
      const result = await provider.capturePayment('tx-123');

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('tx-123');
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    });
  });

  describe('refund', () => {
    it('should return success with refund details', async () => {
      const result = await provider.refund('tx-123', 50);

      expect(result.success).toBe(true);
      expect(result.refundId).toBeDefined();
      expect(result.transactionId).toBe('tx-123');
      expect(result.amount).toBe(50);
      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
    });
  });

  describe('verifyWebhook', () => {
    it('should always return true', () => {
      expect(provider.verifyWebhook({}, '')).toBe(true);
      expect(provider.verifyWebhook({ event: 'test' }, 'signature')).toBe(true);
    });
  });

  describe('handleWebhook', () => {
    it('should acknowledge webhook', async () => {
      const result = await provider.handleWebhook({ event: 'payment.completed' });

      expect(result.acknowledged).toBe(true);
      expect(result.eventType).toBe('noop.event');
    });
  });
});
