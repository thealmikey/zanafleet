import { PaymentTransactionEntity } from '../../entities/payment-transaction.entity';
import { PaymentStatus } from '../../providers/dto/payment-provider.types';

describe('PaymentTransactionEntity', () => {
  const domainData = {
    transactionId: '550e8400-e29b-41d4-a716-446655440000',
    paymentIntentId: '660e8400-e29b-41d4-a716-446655440001',
    providerId: 'stripe',
    providerTransactionId: 'pi_123456789',
    status: PaymentStatus.SUCCEEDED,
    amount: 100.5,
    providerFee: 2.95,
    errorCode: null,
    errorMessage: null,
    rawResponse: { stripe_id: 'pi_123' },
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = PaymentTransactionEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.transactionId);
      expect(entity.paymentIntentId).toBe(domainData.paymentIntentId);
      expect(entity.providerId).toBe(domainData.providerId);
      expect(entity.providerTransactionId).toBe(domainData.providerTransactionId);
      expect(entity.status).toBe(domainData.status);
      expect(entity.amount).toBe('100.50');
      expect(entity.providerFee).toBe('2.95');
      expect(entity.errorCode).toBeNull();
      expect(entity.errorMessage).toBeNull();
      expect(entity.rawResponse).toEqual(domainData.rawResponse);
      expect(entity.createdAt).toBe(domainData.createdAt);
    });

    it('should handle failed transaction with error details', () => {
      const failedData = {
        ...domainData,
        status: PaymentStatus.FAILED,
        providerFee: null,
        errorCode: 'card_declined',
        errorMessage: 'Your card was declined',
        rawResponse: { error: { code: 'card_declined' } },
      };

      const entity = PaymentTransactionEntity.fromDomain(failedData);

      expect(entity.status).toBe(PaymentStatus.FAILED);
      expect(entity.providerFee).toBeNull();
      expect(entity.errorCode).toBe('card_declined');
      expect(entity.errorMessage).toBe('Your card was declined');
    });

    it('should handle null optional fields', () => {
      const minimalData = {
        transactionId: domainData.transactionId,
        paymentIntentId: domainData.paymentIntentId,
        providerId: domainData.providerId,
        status: PaymentStatus.PENDING,
        amount: 50,
        createdAt: domainData.createdAt,
      };

      const entity = PaymentTransactionEntity.fromDomain(minimalData);

      expect(entity.providerTransactionId).toBeNull();
      expect(entity.providerFee).toBeNull();
      expect(entity.errorCode).toBeNull();
      expect(entity.errorMessage).toBeNull();
      expect(entity.rawResponse).toBeNull();
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new PaymentTransactionEntity();
      entity.id = domainData.transactionId;
      entity.paymentIntentId = domainData.paymentIntentId;
      entity.providerId = domainData.providerId;
      entity.providerTransactionId = domainData.providerTransactionId;
      entity.status = domainData.status;
      entity.amount = '100.50';
      entity.providerFee = '2.95';
      entity.errorCode = null;
      entity.errorMessage = null;
      entity.rawResponse = domainData.rawResponse;
      entity.createdAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.transactionId).toBe(domainData.transactionId);
      expect(domain.paymentIntentId).toBe(domainData.paymentIntentId);
      expect(domain.providerId).toBe(domainData.providerId);
      expect(domain.providerTransactionId).toBe(domainData.providerTransactionId);
      expect(domain.status).toBe(domainData.status);
      expect(domain.amount).toBe(100.5);
      expect(domain.providerFee).toBe(2.95);
      expect(domain.errorCode).toBeNull();
      expect(domain.errorMessage).toBeNull();
    });

    it('should parse null providerFee correctly', () => {
      const entity = new PaymentTransactionEntity();
      entity.id = domainData.transactionId;
      entity.paymentIntentId = domainData.paymentIntentId;
      entity.providerId = domainData.providerId;
      entity.providerTransactionId = null;
      entity.status = PaymentStatus.PENDING;
      entity.amount = '50.00';
      entity.providerFee = null;
      entity.errorCode = null;
      entity.errorMessage = null;
      entity.rawResponse = null;
      entity.createdAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.providerFee).toBeNull();
      expect(domain.providerTransactionId).toBeNull();
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = PaymentTransactionEntity.fromDomain(domainData);
      const domain = entity.toDomain();

      expect(domain.transactionId).toBe(domainData.transactionId);
      expect(domain.amount).toBe(domainData.amount);
      expect(domain.providerFee).toBe(domainData.providerFee);
    });
  });
});
