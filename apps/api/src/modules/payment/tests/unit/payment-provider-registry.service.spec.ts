import {
  ProviderCapability,
  PaymentStatus,
  PaymentIntentData,
  PaymentInitiationResult,
  PaymentCaptureResult,
  RefundResult,
  WebhookProcessingResult,
} from '../../providers/dto/payment-provider.types';
import { PaymentProviderRegistry } from '../../providers/payment-provider-registry.service';
import { PaymentProvider } from '../../providers/payment-provider.interface';

class MockPaymentProvider implements PaymentProvider {
  constructor(
    public readonly providerId: string,
    public readonly displayName: string,
    public readonly supportedCurrencies: string[],
    public readonly capabilities: ProviderCapability[],
  ) {}

  async initiatePayment(_intent: PaymentIntentData): Promise<PaymentInitiationResult> {
    return {
      success: true,
      transactionId: 'mock-tx-id',
      status: PaymentStatus.SUCCEEDED,
    };
  }

  async capturePayment(transactionId: string): Promise<PaymentCaptureResult> {
    return { success: true, transactionId, status: PaymentStatus.SUCCEEDED };
  }

  async refund(transactionId: string, amount: number): Promise<RefundResult> {
    return {
      success: true,
      refundId: 'mock-refund-id',
      transactionId,
      amount,
      status: PaymentStatus.SUCCEEDED,
    };
  }

  verifyWebhook(_payload: unknown, _signature: string): boolean {
    return true;
  }

  async handleWebhook(_payload: unknown): Promise<WebhookProcessingResult> {
    return { acknowledged: true, eventType: 'mock.event' };
  }
}

describe('PaymentProviderRegistry', () => {
  let registry: PaymentProviderRegistry;

  beforeEach(() => {
    registry = new PaymentProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider', () => {
      const provider = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);

      registry.register(provider);

      expect(registry.has('stripe')).toBe(true);
      expect(registry.get('stripe')).toBe(provider);
    });

    it('should set first registered provider as default', () => {
      const provider = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);

      registry.register(provider);

      expect(registry.getDefaultId()).toBe('stripe');
      expect(registry.getDefault()).toBe(provider);
    });

    it('should set provider as default when setAsDefault is true', () => {
      const provider1 = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);
      const provider2 = new MockPaymentProvider('mpesa', 'M-Pesa', ['KES'], ['MOBILE_MONEY']);

      registry.register(provider1);
      registry.register(provider2, true);

      expect(registry.getDefaultId()).toBe('mpesa');
    });

    it('should replace existing provider with same id', () => {
      const provider1 = new MockPaymentProvider('stripe', 'Stripe V1', ['USD'], ['CARD']);
      const provider2 = new MockPaymentProvider('stripe', 'Stripe V2', ['USD', 'EUR'], ['CARD']);

      registry.register(provider1);
      registry.register(provider2);

      expect(registry.get('stripe')?.displayName).toBe('Stripe V2');
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent provider', () => {
      expect(registry.get('nonexistent')).toBeUndefined();
    });

    it('should return registered provider', () => {
      const provider = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);
      registry.register(provider);

      expect(registry.get('stripe')).toBe(provider);
    });
  });

  describe('getDefault', () => {
    it('should return undefined when no providers registered', () => {
      expect(registry.getDefault()).toBeUndefined();
    });

    it('should return default provider', () => {
      const provider = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);
      registry.register(provider);

      expect(registry.getDefault()).toBe(provider);
    });
  });

  describe('setDefault', () => {
    it('should throw when provider does not exist', () => {
      expect(() => registry.setDefault('nonexistent')).toThrow(
        'Payment provider not found: nonexistent',
      );
    });

    it('should set default provider', () => {
      const provider1 = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);
      const provider2 = new MockPaymentProvider('mpesa', 'M-Pesa', ['KES'], ['MOBILE_MONEY']);

      registry.register(provider1);
      registry.register(provider2);
      registry.setDefault('mpesa');

      expect(registry.getDefaultId()).toBe('mpesa');
    });
  });

  describe('getByCapability', () => {
    it('should return empty array when no providers have capability', () => {
      const provider = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);
      registry.register(provider);

      const result = registry.getByCapability('MOBILE_MONEY');

      expect(result).toEqual([]);
    });

    it('should return only providers with specified capability', () => {
      const stripeProvider = new MockPaymentProvider('stripe', 'Stripe', ['USD'], [
        'CARD',
        'WALLET',
      ]);
      const mpesaProvider = new MockPaymentProvider('mpesa', 'M-Pesa', ['KES'], ['MOBILE_MONEY']);
      const multiProvider = new MockPaymentProvider('multi', 'Multi', ['USD', 'KES'], [
        'CARD',
        'MOBILE_MONEY',
      ]);

      registry.register(stripeProvider);
      registry.register(mpesaProvider);
      registry.register(multiProvider);

      const mobileMoneyProviders = registry.getByCapability('MOBILE_MONEY');

      expect(mobileMoneyProviders).toHaveLength(2);
      expect(mobileMoneyProviders).toContain(mpesaProvider);
      expect(mobileMoneyProviders).toContain(multiProvider);
      expect(mobileMoneyProviders).not.toContain(stripeProvider);
    });

    it('should return providers with CARD capability', () => {
      const stripeProvider = new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']);
      const mpesaProvider = new MockPaymentProvider('mpesa', 'M-Pesa', ['KES'], ['MOBILE_MONEY']);

      registry.register(stripeProvider);
      registry.register(mpesaProvider);

      const cardProviders = registry.getByCapability('CARD');

      expect(cardProviders).toHaveLength(1);
      expect(cardProviders[0]).toBe(stripeProvider);
    });
  });

  describe('getRegisteredIds', () => {
    it('should return empty array when no providers registered', () => {
      expect(registry.getRegisteredIds()).toEqual([]);
    });

    it('should return all registered provider ids', () => {
      registry.register(new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']));
      registry.register(new MockPaymentProvider('mpesa', 'M-Pesa', ['KES'], ['MOBILE_MONEY']));

      const ids = registry.getRegisteredIds();

      expect(ids).toHaveLength(2);
      expect(ids).toContain('stripe');
      expect(ids).toContain('mpesa');
    });
  });

  describe('has', () => {
    it('should return false for non-existent provider', () => {
      expect(registry.has('nonexistent')).toBe(false);
    });

    it('should return true for registered provider', () => {
      registry.register(new MockPaymentProvider('stripe', 'Stripe', ['USD'], ['CARD']));

      expect(registry.has('stripe')).toBe(true);
    });
  });

  describe('multiple providers', () => {
    it('should support multiple providers with one default', () => {
      const stripe = new MockPaymentProvider('stripe', 'Stripe', ['USD', 'EUR'], [
        'CARD',
        'WALLET',
      ]);
      const mpesa = new MockPaymentProvider('mpesa', 'M-Pesa', ['KES'], ['MOBILE_MONEY']);
      const paypal = new MockPaymentProvider('paypal', 'PayPal', ['USD', 'EUR', 'GBP'], [
        'CARD',
        'WALLET',
      ]);

      registry.register(stripe, true);
      registry.register(mpesa);
      registry.register(paypal);

      expect(registry.getRegisteredIds()).toHaveLength(3);
      expect(registry.getDefaultId()).toBe('stripe');
      expect(registry.getByCapability('MOBILE_MONEY')).toHaveLength(1);
      expect(registry.getByCapability('CARD')).toHaveLength(2);
      expect(registry.getByCapability('WALLET')).toHaveLength(2);
    });
  });
});
