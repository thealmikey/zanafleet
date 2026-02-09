import { LedgerEntryRecordedEventV1 } from '../../events/ledger-entry-recorded.event';
import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../../dto/ledger.enums';

describe('LedgerEntryRecordedEventV1', () => {
  const validEventData = {
    eventId: '550e8400-e29b-41d4-a716-446655440000',
    referenceType: LedgerReferenceType.PAYMENT,
    referenceId: '660e8400-e29b-41d4-a716-446655440001',
    entries: [
      {
        ledgerEntryId: '770e8400-e29b-41d4-a716-446655440002',
        accountId: '880e8400-e29b-41d4-a716-446655440003',
        entryType: LedgerEntryType.DEBIT,
        category: LedgerCategory.DELIVERY_FEE,
        amount: 100,
        currency: 'USD',
        balanceAfter: -100,
      },
      {
        ledgerEntryId: '990e8400-e29b-41d4-a716-446655440004',
        accountId: 'aa0e8400-e29b-41d4-a716-446655440005',
        entryType: LedgerEntryType.CREDIT,
        category: LedgerCategory.RIDER_EARNING,
        amount: 100,
        currency: 'USD',
        balanceAfter: 100,
      },
    ],
    totalAmount: 100,
    currency: 'USD',
    correlationId: 'bb0e8400-e29b-41d4-a716-446655440006',
  };

  describe('constructor', () => {
    it('should create event with all properties', () => {
      const event = new LedgerEntryRecordedEventV1(validEventData);

      expect(event.eventId).toBe(validEventData.eventId);
      expect(event.eventType).toBe('LedgerEntryRecordedEvent-V1');
      expect(event.eventVersion).toBe('1.0.0');
      expect(event.aggregateType).toBe('Ledger');
      expect(event.aggregateId).toBe(validEventData.referenceId);
      expect(event.referenceType).toBe(validEventData.referenceType);
      expect(event.referenceId).toBe(validEventData.referenceId);
      expect(event.entries).toEqual(validEventData.entries);
      expect(event.totalAmount).toBe(validEventData.totalAmount);
      expect(event.currency).toBe(validEventData.currency);
      expect(event.correlationId).toBe(validEventData.correlationId);
    });

    it('should default occurredAt to now when not provided', () => {
      const before = new Date();
      const event = new LedgerEntryRecordedEventV1(validEventData);
      const after = new Date();

      expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should use provided occurredAt', () => {
      const occurredAt = new Date('2024-01-15T10:00:00.000Z');
      const event = new LedgerEntryRecordedEventV1({ ...validEventData, occurredAt });

      expect(event.occurredAt).toBe(occurredAt);
    });
  });

  describe('toJSON', () => {
    it('should serialize event correctly', () => {
      const occurredAt = new Date('2024-01-15T10:00:00.000Z');
      const event = new LedgerEntryRecordedEventV1({ ...validEventData, occurredAt });

      const json = event.toJSON();

      expect(json.eventId).toBe(validEventData.eventId);
      expect(json.eventType).toBe('LedgerEntryRecordedEvent-V1');
      expect(json.eventVersion).toBe('1.0.0');
      expect(json.occurredAt).toBe('2024-01-15T10:00:00.000Z');
      expect(json.aggregateId).toBe(validEventData.referenceId);
      expect(json.aggregateType).toBe('Ledger');
      expect(json.entries).toEqual(validEventData.entries);
      expect(json.totalAmount).toBe(100);
    });
  });

  describe('fromJSON', () => {
    it('should deserialize event correctly', () => {
      const occurredAt = new Date('2024-01-15T10:00:00.000Z');
      const event = new LedgerEntryRecordedEventV1({ ...validEventData, occurredAt });
      const json = event.toJSON();

      const restored = LedgerEntryRecordedEventV1.fromJSON({
        ...json,
        occurredAt: json.occurredAt,
      });

      expect(restored.eventId).toBe(event.eventId);
      expect(restored.referenceType).toBe(event.referenceType);
      expect(restored.referenceId).toBe(event.referenceId);
      expect(restored.entries).toEqual(event.entries);
      expect(restored.totalAmount).toBe(event.totalAmount);
      expect(restored.occurredAt).toEqual(occurredAt);
    });
  });

  describe('round-trip', () => {
    it('should preserve data through toJSON and fromJSON', () => {
      const occurredAt = new Date('2024-01-15T10:00:00.000Z');
      const original = new LedgerEntryRecordedEventV1({ ...validEventData, occurredAt });
      const json = original.toJSON();
      const restored = LedgerEntryRecordedEventV1.fromJSON({
        ...json,
        occurredAt: json.occurredAt,
      });

      expect(restored.eventId).toBe(original.eventId);
      expect(restored.eventType).toBe(original.eventType);
      expect(restored.eventVersion).toBe(original.eventVersion);
      expect(restored.referenceType).toBe(original.referenceType);
      expect(restored.referenceId).toBe(original.referenceId);
      expect(restored.entries).toEqual(original.entries);
      expect(restored.totalAmount).toBe(original.totalAmount);
      expect(restored.currency).toBe(original.currency);
      expect(restored.occurredAt).toEqual(original.occurredAt);
    });
  });
});
