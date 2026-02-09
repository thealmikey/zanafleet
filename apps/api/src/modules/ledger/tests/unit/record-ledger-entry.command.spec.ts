import { ZodError } from 'zod';
import { RecordLedgerEntryCommand } from '../../commands/record-ledger-entry.command';
import { LedgerEntryType, LedgerCategory, LedgerReferenceType } from '../../dto/ledger.enums';

describe('RecordLedgerEntryCommand', () => {
  const validInput = {
    referenceType: LedgerReferenceType.PAYMENT,
    referenceId: '550e8400-e29b-41d4-a716-446655440000',
    entries: [
      {
        accountId: '660e8400-e29b-41d4-a716-446655440001',
        entryType: LedgerEntryType.DEBIT,
        category: LedgerCategory.DELIVERY_FEE,
        amount: 100,
        currency: 'USD',
        description: 'Customer payment',
      },
      {
        accountId: '770e8400-e29b-41d4-a716-446655440002',
        entryType: LedgerEntryType.CREDIT,
        category: LedgerCategory.RIDER_EARNING,
        amount: 100,
        currency: 'USD',
        description: 'Rider earning',
      },
    ],
    correlationId: '880e8400-e29b-41d4-a716-446655440003',
  };

  describe('validate', () => {
    it('should pass validation with valid balanced entries', () => {
      const result = RecordLedgerEntryCommand.validate(validInput);

      expect(result).toEqual(validInput);
    });

    it('should pass validation without optional correlationId', () => {
      const inputWithoutCorrelation = {
        ...validInput,
        correlationId: undefined,
      };

      const result = RecordLedgerEntryCommand.validate(inputWithoutCorrelation);

      expect(result.correlationId).toBeUndefined();
    });

    it('should pass validation with multiple entries that balance', () => {
      const multiEntryInput = {
        ...validInput,
        entries: [
          {
            accountId: '660e8400-e29b-41d4-a716-446655440001',
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.DELIVERY_FEE,
            amount: 100,
            currency: 'USD',
          },
          {
            accountId: '770e8400-e29b-41d4-a716-446655440002',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.RIDER_EARNING,
            amount: 90,
            currency: 'USD',
          },
          {
            accountId: '880e8400-e29b-41d4-a716-446655440003',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.PLATFORM_FEE,
            amount: 10,
            currency: 'USD',
          },
        ],
      };

      const result = RecordLedgerEntryCommand.validate(multiEntryInput);

      expect(result.entries).toHaveLength(3);
    });

    it('should throw ZodError when debits do not equal credits', () => {
      const unbalancedInput = {
        ...validInput,
        entries: [
          {
            accountId: '660e8400-e29b-41d4-a716-446655440001',
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.DELIVERY_FEE,
            amount: 100,
            currency: 'USD',
          },
          {
            accountId: '770e8400-e29b-41d4-a716-446655440002',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.RIDER_EARNING,
            amount: 90,
            currency: 'USD',
          },
        ],
      };

      expect(() => RecordLedgerEntryCommand.validate(unbalancedInput)).toThrow(ZodError);
    });

    it('should throw ZodError when entries has less than 2 items', () => {
      const singleEntryInput = {
        ...validInput,
        entries: [
          {
            accountId: '660e8400-e29b-41d4-a716-446655440001',
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.DELIVERY_FEE,
            amount: 100,
            currency: 'USD',
          },
        ],
      };

      expect(() => RecordLedgerEntryCommand.validate(singleEntryInput)).toThrow(ZodError);
    });

    it('should throw ZodError when referenceId is not a valid UUID', () => {
      const invalidInput = {
        ...validInput,
        referenceId: 'not-a-uuid',
      };

      expect(() => RecordLedgerEntryCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when amount is not positive', () => {
      const invalidInput = {
        ...validInput,
        entries: [
          {
            accountId: '660e8400-e29b-41d4-a716-446655440001',
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.DELIVERY_FEE,
            amount: -100,
            currency: 'USD',
          },
          {
            accountId: '770e8400-e29b-41d4-a716-446655440002',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.RIDER_EARNING,
            amount: -100,
            currency: 'USD',
          },
        ],
      };

      expect(() => RecordLedgerEntryCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when currency is not exactly 3 characters', () => {
      const invalidInput = {
        ...validInput,
        entries: [
          {
            accountId: '660e8400-e29b-41d4-a716-446655440001',
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.DELIVERY_FEE,
            amount: 100,
            currency: 'US',
          },
          {
            accountId: '770e8400-e29b-41d4-a716-446655440002',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.RIDER_EARNING,
            amount: 100,
            currency: 'US',
          },
        ],
      };

      expect(() => RecordLedgerEntryCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when referenceType is invalid', () => {
      const invalidInput = {
        ...validInput,
        referenceType: 'INVALID_TYPE',
      };

      expect(() => RecordLedgerEntryCommand.validate(invalidInput)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = RecordLedgerEntryCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should return success: false for unbalanced entries', () => {
      const unbalancedInput = {
        ...validInput,
        entries: [
          {
            accountId: '660e8400-e29b-41d4-a716-446655440001',
            entryType: LedgerEntryType.DEBIT,
            category: LedgerCategory.DELIVERY_FEE,
            amount: 100,
            currency: 'USD',
          },
          {
            accountId: '770e8400-e29b-41d4-a716-446655440002',
            entryType: LedgerEntryType.CREDIT,
            category: LedgerCategory.RIDER_EARNING,
            amount: 50,
            currency: 'USD',
          },
        ],
      };

      const result = RecordLedgerEntryCommand.safeValidate(unbalancedInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new RecordLedgerEntryCommand(validInput);

      expect(command.referenceType).toBe(validInput.referenceType);
      expect(command.referenceId).toBe(validInput.referenceId);
      expect(command.entries).toEqual(validInput.entries);
      expect(command.correlationId).toBe(validInput.correlationId);
    });
  });
});
