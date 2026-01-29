import { z } from 'zod';

import { CreateTransactionCommand, CreateTransactionCommandSchema } from '../../commands/create-transaction.command';
import { TransactionType } from '../../dto/transaction.enums';

/**
 * Unit Tests: CreateTransactionCommand Zod Validation
 */
describe('CreateTransactionCommand Unit Tests', () => {
  describe('CreateTransactionCommandSchema', () => {
    describe('Valid Inputs', () => {
      it('should validate a complete valid input with linkedEventId', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100.50,
          type: TransactionType.Settlement,
          linkedEventId: '550e8400-e29b-41d4-a716-446655440002',
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sourceWalletId).toBe('550e8400-e29b-41d4-a716-446655440000');
          expect(result.data.destinationWalletId).toBe('550e8400-e29b-41d4-a716-446655440001');
          expect(result.data.amount).toBe(100.50);
          expect(result.data.type).toBe(TransactionType.Settlement);
          expect(result.data.linkedEventId).toBe('550e8400-e29b-41d4-a716-446655440002');
        }
      });

      it('should validate input without linkedEventId', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 50,
          type: TransactionType.Reward,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.linkedEventId).toBeUndefined();
        }
      });

      it('should accept all valid transaction types', () => {
        const types = [
          TransactionType.Settlement,
          TransactionType.Reward,
          TransactionType.Fee,
          TransactionType.Penalty,
        ];

        types.forEach((type) => {
          const input = {
            sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
            destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
            amount: 10,
            type,
          };
          const result = CreateTransactionCommandSchema.safeParse(input);
          expect(result.success).toBe(true);
        });
      });

      it('should accept small positive amounts', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 0.01,
          type: TransactionType.Fee,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it('should accept large amounts', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 999999999.99,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe('Invalid Inputs', () => {
      it('should reject missing sourceWalletId', () => {
        const input = {
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('sourceWalletId');
        }
      });

      it('should reject invalid sourceWalletId UUID', () => {
        const input = {
          sourceWalletId: 'not-a-uuid',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Source wallet ID must be a valid UUID');
        }
      });

      it('should reject missing destinationWalletId', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('destinationWalletId');
        }
      });

      it('should reject invalid destinationWalletId UUID', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: 'invalid-uuid',
          amount: 100,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Destination wallet ID must be a valid UUID');
        }
      });

      it('should reject missing amount', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('amount');
        }
      });

      it('should reject zero amount', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 0,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Amount must be a positive number');
        }
      });

      it('should reject negative amount', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: -50,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Amount must be a positive number');
        }
      });

      it('should reject Infinity', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: Infinity,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Amount must be a finite number');
        }
      });

      it('should reject missing type', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('type');
        }
      });

      it('should reject invalid type', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
          type: 'invalid-type',
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Transaction type must be one of');
        }
      });

      it('should reject invalid linkedEventId UUID', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
          type: TransactionType.Settlement,
          linkedEventId: 'not-a-uuid',
        };

        const result = CreateTransactionCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Linked event ID must be a valid UUID');
        }
      });
    });
  });

  describe('CreateTransactionCommand Class', () => {
    describe('Constructor', () => {
      it('should create command with all fields', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
          type: TransactionType.Settlement,
          linkedEventId: '550e8400-e29b-41d4-a716-446655440002',
        };

        const command = new CreateTransactionCommand(input);

        expect(command.sourceWalletId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(command.destinationWalletId).toBe('550e8400-e29b-41d4-a716-446655440001');
        expect(command.amount).toBe(100);
        expect(command.type).toBe(TransactionType.Settlement);
        expect(command.linkedEventId).toBe('550e8400-e29b-41d4-a716-446655440002');
      });

      it('should create command without linkedEventId', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 50,
          type: TransactionType.Reward,
        };

        const command = new CreateTransactionCommand(input);

        expect(command.linkedEventId).toBeUndefined();
      });
    });

    describe('Static validate()', () => {
      it('should return validated data for valid input', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 200,
          type: TransactionType.Fee,
        };

        const result = CreateTransactionCommand.validate(input);

        expect(result.sourceWalletId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.amount).toBe(200);
      });

      it('should throw ZodError for invalid input', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: -100,
          type: TransactionType.Settlement,
        };

        expect(() => CreateTransactionCommand.validate(input)).toThrow(z.ZodError);
      });
    });

    describe('Static safeValidate()', () => {
      it('should return success result for valid input', () => {
        const input = {
          sourceWalletId: '550e8400-e29b-41d4-a716-446655440000',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
          type: TransactionType.Penalty,
        };

        const result = CreateTransactionCommand.safeValidate(input);

        expect(result.success).toBe(true);
      });

      it('should return error result for invalid input', () => {
        const input = {
          sourceWalletId: 'invalid',
          destinationWalletId: '550e8400-e29b-41d4-a716-446655440001',
          amount: 100,
          type: TransactionType.Settlement,
        };

        const result = CreateTransactionCommand.safeValidate(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(z.ZodError);
        }
      });
    });
  });
});
