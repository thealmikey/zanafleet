import { z } from 'zod';

import { DebitWalletCommand, DebitWalletCommandSchema } from '../../commands/debit-wallet.command';

/**
 * Unit Tests: DebitWalletCommand Zod Validation
 */
describe('DebitWalletCommand Unit Tests', () => {
  describe('DebitWalletCommandSchema', () => {
    describe('Valid Inputs', () => {
      it('should validate a complete valid input with reference', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 75.25,
          reference: 'WITHDRAWAL-001',
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.walletId).toBe('550e8400-e29b-41d4-a716-446655440000');
          expect(result.data.amount).toBe(75.25);
          expect(result.data.reference).toBe('WITHDRAWAL-001');
        }
      });

      it('should validate input without reference', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 25,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.reference).toBeUndefined();
        }
      });

      it('should accept small positive amounts', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 0.01,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
      });

      it('should accept large amounts', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 999999999.99,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
      });
    });

    describe('Invalid Inputs', () => {
      it('should reject missing walletId', () => {
        const input = {
          amount: 100,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('walletId');
        }
      });

      it('should reject invalid walletId UUID', () => {
        const input = {
          walletId: 'not-a-uuid',
          amount: 100,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Wallet ID must be a valid UUID');
        }
      });

      it('should reject missing amount', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('amount');
        }
      });

      it('should reject zero amount', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 0,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Amount must be a positive number');
        }
      });

      it('should reject negative amount', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: -50,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Amount must be a positive number');
        }
      });

      it('should reject Infinity', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: Infinity,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Amount must be a finite number');
        }
      });

      it('should reject NaN', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: NaN,
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
      });

      it('should reject string amount', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: '100',
        };

        const result = DebitWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
      });
    });
  });

  describe('DebitWalletCommand Class', () => {
    describe('Constructor', () => {
      it('should create command with all fields', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
          reference: 'REF-001',
        };

        const command = new DebitWalletCommand(input);

        expect(command.walletId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(command.amount).toBe(100);
        expect(command.reference).toBe('REF-001');
      });

      it('should create command without reference', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 50,
        };

        const command = new DebitWalletCommand(input);

        expect(command.reference).toBeUndefined();
      });
    });

    describe('Static validate()', () => {
      it('should return validated data for valid input', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 200,
        };

        const result = DebitWalletCommand.validate(input);

        expect(result.walletId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.amount).toBe(200);
      });

      it('should throw ZodError for invalid input', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: -100,
        };

        expect(() => DebitWalletCommand.validate(input)).toThrow(z.ZodError);
      });
    });

    describe('Static safeValidate()', () => {
      it('should return success result for valid input', () => {
        const input = {
          walletId: '550e8400-e29b-41d4-a716-446655440000',
          amount: 100,
        };

        const result = DebitWalletCommand.safeValidate(input);

        expect(result.success).toBe(true);
      });

      it('should return error result for invalid input', () => {
        const input = {
          walletId: 'invalid',
          amount: 100,
        };

        const result = DebitWalletCommand.safeValidate(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(z.ZodError);
        }
      });
    });
  });
});
