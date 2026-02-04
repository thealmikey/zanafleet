import {
  CreateOrderCommand,
  CreateOrderCommandSchema,
} from '../../commands/create-order.command';

describe('CreateOrderCommand - Schema', () => {
  it('should validate minimal valid input', () => {
    const input = {
      businessId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = CreateOrderCommand.safeValidate(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.businessId).toBe(input.businessId);
    }
  });

  it('should validate full valid input with scheduledTime Date', () => {
    const input = {
      businessId: '550e8400-e29b-41d4-a716-446655440001',
      itemSummary: '2x Burgers',
      itemMetadata: { notes: 'no onions' },
      customerName: 'John Doe',
      customerPhone: '+254712345678',
      scheduledTime: new Date('2024-01-05T12:34:56.000Z'),
    };

    const result = CreateOrderCommand.safeValidate(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledTime).toBeInstanceOf(Date);
    }
  });

  it('should accept scheduledTime as ISO string and coerce to Date', () => {
    const input = {
      businessId: '550e8400-e29b-41d4-a716-446655440002',
      scheduledTime: '2024-01-05T12:34:56.000Z',
    };

    const parsed = CreateOrderCommandSchema.parse(input);
    expect(parsed.scheduledTime).toBeInstanceOf(Date);
  });

  it('should reject invalid businessId', () => {
    const input = {
      businessId: 'not-a-uuid',
    };

    const result = CreateOrderCommand.safeValidate(input);
    expect(result.success).toBe(false);
  });

  it('should reject invalid customerPhone', () => {
    const input = {
      businessId: '550e8400-e29b-41d4-a716-446655440003',
      customerPhone: 'abc',
    };

    const result = CreateOrderCommand.safeValidate(input);
    expect(result.success).toBe(false);
  });

  it('should reject too long itemSummary', () => {
    const input = {
      businessId: '550e8400-e29b-41d4-a716-446655440004',
      itemSummary: 'x'.repeat(256),
    };

    const result = CreateOrderCommand.safeValidate(input);
    expect(result.success).toBe(false);
  });
});
