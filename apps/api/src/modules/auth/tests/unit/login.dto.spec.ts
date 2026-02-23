import { LoginDto, LoginDtoSchema, LoginResponseDtoSchema } from '../../dto/login.dto';

// Valid actor type values (matching ActorType enum)
const ActorTypes = {
  Rider: 'Rider',
  Driver: 'Driver',
  Customer: 'Customer',
  Business: 'Business',
  Admin: 'Admin',
  Support: 'Support',
  SaccoAdmin: 'SaccoAdmin',
  BusinessOwner: 'BusinessOwner',
  Internal: 'Internal',
  AIService: 'AIService',
};

describe('LoginDto', () => {
  describe('LoginDtoSchema', () => {
    describe('valid inputs', () => {
      it('should accept valid email identifier', () => {
        const input = { identifier: 'user@example.com', password: 'password123' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.identifier).toBe('user@example.com');
        }
      });

      it('should accept valid UUID identifier', () => {
        const input = { identifier: '550e8400-e29b-41d4-a716-446655440000' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept wallet address identifier', () => {
        const input = { identifier: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept identifier with whitespace that gets trimmed', () => {
        const input = { identifier: '  user@example.com  ' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.identifier).toBe('user@example.com');
        }
      });

      it('should accept optional password', () => {
        const input = { identifier: 'user@example.com', password: 'myPassword' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept empty password for wallet-based auth', () => {
        const input = { identifier: '0x742d35Cc6634C0532925a3b844Bc9e7595f0eB1E', password: '' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept undefined password', () => {
        const input = { identifier: 'user@example.com', password: undefined };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('should reject empty identifier', () => {
        const input = { identifier: '' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject whitespace-only identifier', () => {
        const input = { identifier: '   ' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing identifier', () => {
        const input = { password: 'password123' };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject null identifier', () => {
        const input = { identifier: null };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject undefined identifier', () => {
        const input = { identifier: undefined };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject numeric identifier', () => {
        const input = { identifier: 12345 };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject object identifier', () => {
        const input = { identifier: { email: 'test@example.com' } };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject array identifier', () => {
        const input = { identifier: ['test@example.com'] };
        const result = LoginDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('LoginDto.validate()', () => {
    it('should return parsed data on valid input', () => {
      const input = { identifier: 'user@example.com', password: 'password' };
      const result = LoginDto.validate(input);
      expect(result.identifier).toBe('user@example.com');
      expect(result.password).toBe('password');
    });

    it('should throw on invalid input', () => {
      const input = { identifier: '' };
      expect(() => LoginDto.validate(input)).toThrow();
    });
  });

  describe('LoginDto.safeValidate()', () => {
    it('should return success result for valid input', () => {
      const input = { identifier: 'user@example.com' };
      const result = LoginDto.safeValidate(input);
      expect(result.success).toBe(true);
    });

    it('should return error result for invalid input', () => {
      const input = { identifier: '' };
      const result = LoginDto.safeValidate(input);
      expect(result.success).toBe(false);
    });
  });

  describe('LoginResponseDtoSchema', () => {
    describe('valid inputs', () => {
      it('should accept valid response with all fields', () => {
        const input = {
          actorId: '550e8400-e29b-41d4-a716-446655440000',
          workspaceId: '660e8400-e29b-41d4-a716-446655440001',
          type: ActorTypes.Rider,
          token: 'jwt-token-string',
          expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept string date for expiresAt', () => {
        const input = {
          actorId: '550e8400-e29b-41d4-a716-446655440000',
          workspaceId: 'workspace-1',
          type: ActorTypes.Customer,
          token: 'token',
          expiresAt: '2024-12-31T23:59:59.000Z',
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept Business actor type', () => {
        const input = {
          actorId: '550e8400-e29b-41d4-a716-446655440000',
          workspaceId: 'workspace-1',
          type: ActorTypes.Business,
          token: 'token',
          expiresAt: new Date(),
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept Admin actor type', () => {
        const input = {
          actorId: '550e8400-e29b-41d4-a716-446655440000',
          workspaceId: 'workspace-1',
          type: ActorTypes.Admin,
          token: 'token',
          expiresAt: new Date(),
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('should reject invalid UUID for actorId', () => {
        const input = {
          actorId: 'invalid-uuid',
          workspaceId: 'workspace-1',
          type: ActorTypes.Rider,
          token: 'token',
          expiresAt: new Date(),
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty token', () => {
        const input = {
          actorId: '550e8400-e29b-41d4-a716-446655440000',
          workspaceId: 'workspace-1',
          type: ActorTypes.Rider,
          token: '',
          expiresAt: new Date(),
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing token', () => {
        const input = {
          actorId: '550e8400-e29b-41d4-a716-446655440000',
          workspaceId: 'workspace-1',
          type: ActorTypes.Rider,
          expiresAt: new Date(),
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid actor type', () => {
        const input = {
          actorId: '550e8400-e29b-41d4-a716-446655440000',
          workspaceId: 'workspace-1',
          type: 'INVALID_TYPE',
          token: 'token',
          expiresAt: new Date(),
        };
        const result = LoginResponseDtoSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle very long identifier', () => {
      const longIdentifier = 'a'.repeat(1000) + '@example.com';
      const input = { identifier: longIdentifier };
      const result = LoginDtoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should handle special characters in identifier', () => {
      const input = { identifier: 'user+tag@example.com' };
      const result = LoginDtoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should handle domain with numbers', () => {
      const input = { identifier: 'user@123test.com' };
      const result = LoginDtoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should handle subdomain', () => {
      const input = { identifier: 'user@mail.example.com' };
      const result = LoginDtoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should handle plus addressing', () => {
      const input = { identifier: 'user+subtag@example.com' };
      const result = LoginDtoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject identifier with newlines', () => {
      const input = { identifier: 'user@\nexample.com' };
      const result = LoginDtoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should handle phone number identifier', () => {
      const input = { identifier: '+254712345678' };
      const result = LoginDtoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});