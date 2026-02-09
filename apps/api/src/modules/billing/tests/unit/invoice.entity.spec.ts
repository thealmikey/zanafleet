import { InvoiceStatus } from '../../dto/billing.enums';
import { InvoiceEntity } from '../../entities/invoice.entity';

describe('InvoiceEntity', () => {
  const domainData = {
    invoiceId: '550e8400-e29b-41d4-a716-446655440000',
    payerAccountId: '660e8400-e29b-41d4-a716-446655440001',
    payeeAccountId: '770e8400-e29b-41d4-a716-446655440002',
    deliveryId: '880e8400-e29b-41d4-a716-446655440003',
    orderId: '990e8400-e29b-41d4-a716-446655440004',
    status: InvoiceStatus.DRAFT,
    subtotal: 100.0,
    totalDiscounts: 10.0,
    totalTax: 14.4,
    grandTotal: 104.4,
    currency: 'USD',
    dueDate: new Date('2024-01-22T10:00:00.000Z'),
    paidAt: null,
    metadata: { source: 'delivery' },
    createdAt: new Date('2024-01-15T10:00:00.000Z'),
  };

  describe('fromDomain', () => {
    it('should create entity with correct field mappings', () => {
      const entity = InvoiceEntity.fromDomain(domainData);

      expect(entity.id).toBe(domainData.invoiceId);
      expect(entity.payerAccountId).toBe(domainData.payerAccountId);
      expect(entity.payeeAccountId).toBe(domainData.payeeAccountId);
      expect(entity.deliveryId).toBe(domainData.deliveryId);
      expect(entity.orderId).toBe(domainData.orderId);
      expect(entity.status).toBe(domainData.status);
      expect(entity.subtotal).toBe('100.00');
      expect(entity.totalDiscounts).toBe('10.00');
      expect(entity.totalTax).toBe('14.40');
      expect(entity.grandTotal).toBe('104.40');
      expect(entity.currency).toBe(domainData.currency);
      expect(entity.dueDate).toBe(domainData.dueDate);
      expect(entity.paidAt).toBeNull();
      expect(entity.metadata).toEqual(domainData.metadata);
    });

    it('should handle null optional fields', () => {
      const minimalData = {
        invoiceId: domainData.invoiceId,
        payerAccountId: domainData.payerAccountId,
        payeeAccountId: domainData.payeeAccountId,
        status: InvoiceStatus.DRAFT,
        subtotal: 50,
        grandTotal: 50,
        currency: 'KES',
        createdAt: domainData.createdAt,
      };

      const entity = InvoiceEntity.fromDomain(minimalData);

      expect(entity.deliveryId).toBeNull();
      expect(entity.orderId).toBeNull();
      expect(entity.totalDiscounts).toBe('0.00');
      expect(entity.totalTax).toBe('0.00');
      expect(entity.dueDate).toBeNull();
      expect(entity.metadata).toBeNull();
    });

    it('should format decimal amounts with 2 decimal places', () => {
      const dataWithLongDecimals = {
        ...domainData,
        subtotal: 100.999,
        grandTotal: 104.444,
      };

      const entity = InvoiceEntity.fromDomain(dataWithLongDecimals);

      expect(entity.subtotal).toBe('101.00');
      expect(entity.grandTotal).toBe('104.44');
    });
  });

  describe('toDomain', () => {
    it('should return domain object with correct field mappings', () => {
      const entity = new InvoiceEntity();
      entity.id = domainData.invoiceId;
      entity.payerAccountId = domainData.payerAccountId;
      entity.payeeAccountId = domainData.payeeAccountId;
      entity.deliveryId = domainData.deliveryId;
      entity.orderId = domainData.orderId;
      entity.status = domainData.status;
      entity.subtotal = '100.00';
      entity.totalDiscounts = '10.00';
      entity.totalTax = '14.40';
      entity.grandTotal = '104.40';
      entity.currency = domainData.currency;
      entity.dueDate = domainData.dueDate;
      entity.paidAt = null;
      entity.metadata = domainData.metadata;
      entity.createdAt = domainData.createdAt;
      entity.updatedAt = new Date('2024-01-15T12:00:00.000Z');

      const domain = entity.toDomain();

      expect(domain.invoiceId).toBe(domainData.invoiceId);
      expect(domain.payerAccountId).toBe(domainData.payerAccountId);
      expect(domain.payeeAccountId).toBe(domainData.payeeAccountId);
      expect(domain.deliveryId).toBe(domainData.deliveryId);
      expect(domain.orderId).toBe(domainData.orderId);
      expect(domain.status).toBe(domainData.status);
      expect(domain.subtotal).toBe(100.0);
      expect(domain.totalDiscounts).toBe(10.0);
      expect(domain.totalTax).toBe(14.4);
      expect(domain.grandTotal).toBe(104.4);
    });
  });

  describe('round-trip', () => {
    it('should preserve data when converting fromDomain then toDomain', () => {
      const entity = InvoiceEntity.fromDomain(domainData);
      entity.updatedAt = domainData.createdAt;

      const domain = entity.toDomain();

      expect(domain.invoiceId).toBe(domainData.invoiceId);
      expect(domain.subtotal).toBe(domainData.subtotal);
      expect(domain.totalDiscounts).toBe(domainData.totalDiscounts);
      expect(domain.totalTax).toBe(domainData.totalTax);
      expect(domain.grandTotal).toBe(domainData.grandTotal);
    });
  });

  describe('grandTotal formula', () => {
    it('should verify grandTotal = subtotal - totalDiscounts + totalTax', () => {
      const entity = InvoiceEntity.fromDomain(domainData);
      const domain = entity.toDomain();

      const expectedGrandTotal = domain.subtotal - domain.totalDiscounts + domain.totalTax;

      expect(domain.grandTotal).toBeCloseTo(expectedGrandTotal, 2);
    });
  });
});
