import {
  PaymentIntentStatus,
  PaymentFlowType,
  PaymentMethod,
} from '../../dto/payment.enums';
import { PaymentIntentEntity } from '../../entities/payment-intent.entity';

describe('PaymentIntentEntity', () => {
  const domainData = {
    paymentIntentId: '550e8400-e29b-41d4-a716-446655440000',
    payerAccountId: '660e8400-e29b-41d4-a716-446655440001',
    payeeAccountId: '770e8400-e29b-41d4-a716-446655440002',
    flowType: PaymentFlowType.C2B,
    amount: 150.5,
    currency: 'USD',
    status: PaymentIntentStatus.CREATED,
    paymentMethod: PaymentMethod.CARD,
    providerId: 'stripe',
    invoiceId: '880e8400-e29b-41d4-a716-446655440003',
    idempotencyKey: 'idem-key-123',
    metadata: { orderId: 'order-456' },
    expiresAt: new Date('2024-01-16T10:00:00.000Z'),
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = PaymentIntentEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.paymentIntentId);
      expect(entity.payerAccountId).toBe(domainData.payerAccountId);
      expect(entity.payeeAccountId).toBe(domainData.payeeAccountId);
      expect(entity.flowType).toBe(domainData.flowType);
      expect(entity.amount).toBe('150.50');
      expect(entity.currency).toBe(domainData.currency);
      expect(entity.status).toBe(domainData.status);
      expect(entity.paymentMethod).toBe(domainData.paymentMethod);
      expect(entity.providerId).toBe(domainData.providerId);
      expect(entity.invoiceId).toBe(domainData.invoiceId);
      expect(entity.idempotencyKey).toBe(domainData.idempotencyKey);
      expect(entity.metadata).toEqual(domainData.metadata);
      expect(entity.expiresAt).toBe(domainData.expiresAt);
      expect(entity.createdAt).toBe(domainData.createdAt);
    });

    it('should handle null optional fields', () => {
      const dataWithoutOptionals = {
        ...domainData,
        invoiceId: undefined,
        metadata: undefined,
        expiresAt: undefined,
      };

      const entity = PaymentIntentEntity.fromDomain(dataWithoutOptionals);

      expect(entity.invoiceId).toBeNull();
      expect(entity.metadata).toBeNull();
      expect(entity.expiresAt).toBeNull();
    });

    it('should format decimal amounts with 2 decimal places', () => {
      const dataWithWholeNumber = {
        ...domainData,
        amount: 100,
      };

      const entity = PaymentIntentEntity.fromDomain(dataWithWholeNumber);

      expect(entity.amount).toBe('100.00');
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new PaymentIntentEntity();
      entity.id = domainData.paymentIntentId;
      entity.payerAccountId = domainData.payerAccountId;
      entity.payeeAccountId = domainData.payeeAccountId;
      entity.flowType = domainData.flowType;
      entity.amount = '150.50';
      entity.currency = domainData.currency;
      entity.status = domainData.status;
      entity.paymentMethod = domainData.paymentMethod;
      entity.providerId = domainData.providerId;
      entity.invoiceId = domainData.invoiceId;
      entity.idempotencyKey = domainData.idempotencyKey;
      entity.metadata = domainData.metadata;
      entity.expiresAt = domainData.expiresAt;
      entity.createdAt = domainData.createdAt;
      entity.updatedAt = new Date('2024-01-15T12:00:00.000Z');

      const domain = entity.toDomain();

      expect(domain.paymentIntentId).toBe(domainData.paymentIntentId);
      expect(domain.payerAccountId).toBe(domainData.payerAccountId);
      expect(domain.payeeAccountId).toBe(domainData.payeeAccountId);
      expect(domain.flowType).toBe(domainData.flowType);
      expect(domain.amount).toBe(150.5);
      expect(domain.currency).toBe(domainData.currency);
      expect(domain.status).toBe(domainData.status);
      expect(domain.paymentMethod).toBe(domainData.paymentMethod);
      expect(domain.providerId).toBe(domainData.providerId);
      expect(domain.invoiceId).toBe(domainData.invoiceId);
      expect(domain.idempotencyKey).toBe(domainData.idempotencyKey);
      expect(domain.metadata).toEqual(domainData.metadata);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = PaymentIntentEntity.fromDomain(domainData);
      entity.updatedAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.paymentIntentId).toBe(domainData.paymentIntentId);
      expect(domain.amount).toBe(domainData.amount);
      expect(domain.idempotencyKey).toBe(domainData.idempotencyKey);
    });
  });
});
