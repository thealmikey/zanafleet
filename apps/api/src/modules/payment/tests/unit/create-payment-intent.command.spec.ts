import { ZodError } from 'zod';
import { CreatePaymentIntentCommand } from '../../commands/create-payment-intent.command';
import { PaymentFlowType, PaymentMethod } from '../../dto/payment.enums';

describe('CreatePaymentIntentCommand', () => {
  const validInput = {
    payerAccountId: '550e8400-e29b-41d4-a716-446655440000',
    payeeAccountId: '660e8400-e29b-41d4-a716-446655440001',
    flowType: PaymentFlowType.C2B,
    amount: 100.5,
    currency: 'USD',
    paymentMethod: PaymentMethod.CARD,
    providerId: 'stripe',
    idempotencyKey: 'idem-key-123',
    metadata: { orderId: 'order-456' },
  };

  describe('validate', () => {
    it('should pass validation with valid input', () => {
      const result = CreatePaymentIntentCommand.validate(validInput);

      expect(result).toEqual(validInput);
    });

    it('should pass validation without optional fields', () => {
      const minimalInput = {
        payerAccountId: '550e8400-e29b-41d4-a716-446655440000',
        payeeAccountId: '660e8400-e29b-41d4-a716-446655440001',
        flowType: PaymentFlowType.B2C,
        amount: 50,
        currency: 'KES',
        paymentMethod: PaymentMethod.MOBILE_MONEY,
        providerId: 'mpesa',
        idempotencyKey: 'idem-key-456',
      };

      const result = CreatePaymentIntentCommand.validate(minimalInput);

      expect(result.invoiceId).toBeUndefined();
      expect(result.metadata).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
    });

    it('should throw ZodError when payerAccountId is not a valid UUID', () => {
      const invalidInput = {
        ...validInput,
        payerAccountId: 'not-a-uuid',
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when amount is not positive', () => {
      const invalidInput = {
        ...validInput,
        amount: -10,
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when amount is zero', () => {
      const invalidInput = {
        ...validInput,
        amount: 0,
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when currency is not exactly 3 characters', () => {
      const invalidInput = {
        ...validInput,
        currency: 'US',
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when flowType is invalid', () => {
      const invalidInput = {
        ...validInput,
        flowType: 'INVALID_FLOW',
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when paymentMethod is invalid', () => {
      const invalidInput = {
        ...validInput,
        paymentMethod: 'INVALID_METHOD',
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when idempotencyKey is empty', () => {
      const invalidInput = {
        ...validInput,
        idempotencyKey: '',
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when idempotencyKey exceeds max length', () => {
      const invalidInput = {
        ...validInput,
        idempotencyKey: 'a'.repeat(129),
      };

      expect(() => CreatePaymentIntentCommand.validate(invalidInput)).toThrow(ZodError);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = CreatePaymentIntentCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should return success: false for invalid input', () => {
      const invalidInput = {
        ...validInput,
        amount: -5,
      };

      const result = CreatePaymentIntentCommand.safeValidate(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new CreatePaymentIntentCommand(validInput);

      expect(command.payerAccountId).toBe(validInput.payerAccountId);
      expect(command.payeeAccountId).toBe(validInput.payeeAccountId);
      expect(command.flowType).toBe(validInput.flowType);
      expect(command.amount).toBe(validInput.amount);
      expect(command.currency).toBe(validInput.currency);
      expect(command.paymentMethod).toBe(validInput.paymentMethod);
      expect(command.providerId).toBe(validInput.providerId);
      expect(command.idempotencyKey).toBe(validInput.idempotencyKey);
      expect(command.metadata).toEqual(validInput.metadata);
    });
  });
});
