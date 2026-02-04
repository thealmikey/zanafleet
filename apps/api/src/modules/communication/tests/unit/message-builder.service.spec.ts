import {
  buildDeliveryNarrative,
  DeliveryMessageInput,
  MessageBuilderService,
} from '../../services/message-builder.service';

describe('MessageBuilderService - Delivery Narrative', () => {
  const service = new MessageBuilderService();

  it('should format message with all fields present (Date input)', () => {
    const input: DeliveryMessageInput = {
      order: { itemSummary: '2x Burgers' },
      delivery: { scheduledDropoffTime: new Date('2024-01-05T12:34:56.000Z') },
      rider: { name: 'Alex Rider', phone: '+254700000000' },
      business: { businessName: 'Acme Eats', phone: '+111222333' },
    };

    const expected =
      'Your 2x Burgers from Acme Eats will be delivered at 2024-01-05 12:34 by Alex Rider (+254700000000). Contact +111222333 if needed.';

    expect(buildDeliveryNarrative(input)).toBe(expected);
    expect(service.buildDeliveryMessage(input)).toBe(expected);
  });

  it('should format message with time provided as ISO string', () => {
    const input: DeliveryMessageInput = {
      order: { itemSummary: 'Parcel' },
      delivery: { scheduledDropoffTime: '2024-04-04T08:15:00.000Z' },
      rider: { name: 'Taylor', phone: '+123456789' },
      business: { businessName: 'Zana Logistics', phone: '+987654321' },
    };

    const expected =
      'Your Parcel from Zana Logistics will be delivered at 2024-04-04 08:15 by Taylor (+123456789). Contact +987654321 if needed.';

    expect(buildDeliveryNarrative(input)).toBe(expected);
  });

  it('should fallback item to "order" when itemSummary is missing or empty', () => {
    const input1: DeliveryMessageInput = {
      order: {},
      delivery: { scheduledDropoffTime: '2024-02-01T10:00:00.000Z' },
      rider: { name: 'Sam', phone: '0700-000-000' },
      business: { businessName: 'Acme', phone: '123' },
    };

    const input2: DeliveryMessageInput = {
      order: { itemSummary: '   ' },
      delivery: { scheduledDropoffTime: '2024-02-01T10:00:00.000Z' },
      rider: { name: 'Sam', phone: '0700-000-000' },
      business: { businessName: 'Acme', phone: '123' },
    };

    const expected =
      'Your order from Acme will be delivered at 2024-02-01 10:00 by Sam (0700-000-000). Contact 123 if needed.';

    expect(buildDeliveryNarrative(input1)).toBe(expected);
    expect(buildDeliveryNarrative(input2)).toBe(expected);
  });

  it('should fallback rider name and phone when missing', () => {
    const input: DeliveryMessageInput = {
      order: { itemSummary: 'Documents' },
      delivery: { scheduledDropoffTime: '2024-02-10T15:45:00.000Z' },
      // rider omitted entirely
      business: { businessName: 'DocsRUs', phone: '+999' },
    };

    const expected =
      'Your Documents from DocsRUs will be delivered at 2024-02-10 15:45 by your rider (N/A). Contact +999 if needed.';

    expect(buildDeliveryNarrative(input)).toBe(expected);
  });

  it('should fallback business name and phone when missing', () => {
    const input: DeliveryMessageInput = {
      order: { itemSummary: 'Groceries' },
      delivery: { scheduledDropoffTime: '2024-03-01T08:00:00.000Z' },
      rider: { name: 'Riley', phone: '0700-111-222' },
      // business omitted entirely
    };

    const expected =
      'Your Groceries from your business will be delivered at 2024-03-01 08:00 by Riley (0700-111-222). Contact N/A if needed.';

    expect(buildDeliveryNarrative(input)).toBe(expected);
  });

  it('should use calculatedEta when scheduledDropoffTime is missing', () => {
    const input: DeliveryMessageInput = {
      order: { itemSummary: 'Meal' },
      delivery: { calculatedEta: '2024-05-20T20:10:00.000Z' },
      rider: { name: 'Casey', phone: '+254711111111' },
      business: { businessName: 'QuickBite', phone: '+0700000000' },
    };

    const expected =
      'Your Meal from QuickBite will be delivered at 2024-05-20 20:10 by Casey (+254711111111). Contact +0700000000 if needed.';

    expect(buildDeliveryNarrative(input)).toBe(expected);
  });

  it('should fallback time phrase when neither scheduledDropoffTime nor calculatedEta is provided', () => {
    const input: DeliveryMessageInput = {
      order: { itemSummary: 'Package' },
      delivery: {},
      rider: { name: 'Jordan', phone: 'N/A' },
      business: { businessName: 'ShipIt', phone: '555-000' },
    };

    const expected =
      'Your Package from ShipIt will be delivered at the scheduled time by Jordan (N/A). Contact 555-000 if needed.';

    expect(buildDeliveryNarrative(input)).toBe(expected);
  });

  it('should handle invalid date strings gracefully by falling back to time phrase', () => {
    const input: DeliveryMessageInput = {
      order: { itemSummary: 'Box' },
      delivery: { scheduledDropoffTime: 'not-a-date' },
      rider: { name: 'Lee', phone: '123' },
      business: { businessName: 'Boxes Inc.', phone: '456' },
    };

    const expected =
      'Your Box from Boxes Inc. will be delivered at the scheduled time by Lee (123). Contact 456 if needed.';

    expect(buildDeliveryNarrative(input)).toBe(expected);
  });
});
