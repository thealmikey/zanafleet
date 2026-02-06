import { z } from 'zod';

import {
  CreateWalletCommand,
  CreateWalletCommandSchema,
} from '../../commands/create-wallet.command';
import { WalletType, OwnerType } from '../../dto/wallet.enums';

/**
 * Unit Tests: CreateWalletCommand Zod Validation
 */
describe('CreateWalletCommand Unit Tests', () => {
  describe('CreateWalletCommandSchema', () => {
    describe('Valid Inputs', () => {
      it('should validate a complete valid input', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
          currency: 'USD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ownerId).toBe('550e8400-e29b-41d4-a716-446655440000');
          expect(result.data.ownerType).toBe(OwnerType.Organization);
          expect(result.data.type).toBe(WalletType.Escrow);
          expect(result.data.currency).toBe('USD');
        }
      });

      it('should uppercase currency code', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Actor,
          type: WalletType.Incentive,
          currency: 'kes',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.currency).toBe('KES');
        }
      });

      it('should accept all valid owner types', () => {
        const ownerTypes = [OwnerType.Actor, OwnerType.Workspace, OwnerType.Organization];

        ownerTypes.forEach((ownerType) => {
          const input = {
            ownerId: '550e8400-e29b-41d4-a716-446655440000',
            ownerType,
            type: WalletType.Settlement,
            currency: 'EUR',
          };
          const result = CreateWalletCommandSchema.safeParse(input);
          expect(result.success).toBe(true);
        });
      });

      it('should accept all valid wallet types', () => {
        const walletTypes = [WalletType.Escrow, WalletType.Incentive, WalletType.Settlement];

        walletTypes.forEach((type) => {
          const input = {
            ownerId: '550e8400-e29b-41d4-a716-446655440000',
            ownerType: OwnerType.Organization,
            type,
            currency: 'GBP',
          };
          const result = CreateWalletCommandSchema.safeParse(input);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('Invalid Inputs', () => {
      it('should reject missing ownerId', () => {
        const input = {
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
          currency: 'USD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('ownerId');
        }
      });

      it('should reject invalid ownerId UUID', () => {
        const input = {
          ownerId: 'not-a-uuid',
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
          currency: 'USD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Owner ID must be a valid UUID');
        }
      });

      it('should reject missing ownerType', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          type: WalletType.Escrow,
          currency: 'USD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('ownerType');
        }
      });

      it('should reject invalid ownerType', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: 'InvalidType',
          type: WalletType.Escrow,
          currency: 'USD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Owner type must be one of');
        }
      });

      it('should reject missing type', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          currency: 'USD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('type');
        }
      });

      it('should reject invalid type', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          type: 'InvalidType',
          currency: 'USD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Wallet type must be one of');
        }
      });

      it('should reject missing currency', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('currency');
        }
      });

      it('should reject currency with less than 3 characters', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
          currency: 'US',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Currency must be exactly 3 characters');
        }
      });

      it('should reject currency with more than 3 characters', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
          currency: 'USDD',
        };

        const result = CreateWalletCommandSchema.safeParse(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Currency must be exactly 3 characters');
        }
      });
    });
  });

  describe('CreateWalletCommand Class', () => {
    describe('Constructor', () => {
      it('should create command with all fields', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Actor,
          type: WalletType.Incentive,
          currency: 'KES',
        };

        const command = new CreateWalletCommand(input);

        expect(command.ownerId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(command.ownerType).toBe(OwnerType.Actor);
        expect(command.type).toBe(WalletType.Incentive);
        expect(command.currency).toBe('KES');
      });
    });

    describe('Static validate()', () => {
      it('should return validated data for valid input', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Workspace,
          type: WalletType.Settlement,
          currency: 'ngn',
        };

        const result = CreateWalletCommand.validate(input);

        expect(result.ownerId).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(result.currency).toBe('NGN');
      });

      it('should throw ZodError for invalid input', () => {
        const input = {
          ownerId: 'invalid-uuid',
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
          currency: 'USD',
        };

        expect(() => CreateWalletCommand.validate(input)).toThrow(z.ZodError);
      });
    });

    describe('Static safeValidate()', () => {
      it('should return success result for valid input', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: OwnerType.Organization,
          type: WalletType.Escrow,
          currency: 'USD',
        };

        const result = CreateWalletCommand.safeValidate(input);

        expect(result.success).toBe(true);
      });

      it('should return error result for invalid input', () => {
        const input = {
          ownerId: '550e8400-e29b-41d4-a716-446655440000',
          ownerType: 'invalid',
          type: WalletType.Escrow,
          currency: 'USD',
        };

        const result = CreateWalletCommand.safeValidate(input);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(z.ZodError);
        }
      });
    });
  });
});
