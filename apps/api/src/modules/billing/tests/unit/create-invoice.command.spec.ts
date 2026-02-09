import { ZodError } from 'zod';

import { CreateInvoiceCommand } from '../../commands/create-invoice.command';
import { ChargeType } from '../../dto/billing.enums';

describe('CreateInvoiceCommand', () => {
  const validInput = {
    payerAccountId: '550e8400-e29b-41d4-a716-446655440000',
    payeeAccountId: '660e8400-e29b-41d4-a716-446655440001',
    deliveryId: '770e8400-e29b-41d4-a716-446655440002',
    orderId: '880e8400-e29b-41d4-a716-446655440003',
    charges: [
      {
        chargeType: ChargeType.BASE_DELIVERY_FEE,
        description: 'Base delivery fee',
        amount: 5.0,
        currency: 'USD',
        quantity: 1,
        unitPrice: 5.0,
      },
      {
        chargeType: ChargeType.TAX,
        description: 'Tax',
        amount: 0.8,
        currency: 'USD',
        quantity: 1,
        unitPrice: 0.8,
      },
    ],
    currency: 'USD',
    metadata: { source: 'api' },
  };

  describe('validate', () => {
    it('should pass validation with valid input', () => {
      const result = CreateInvoiceCommand.validate(validInput);

      expect(result).toEqual(validInput);
    });

    it('should pass validation without optional fields', () => {
      const minimalInput = {
        payerAccountId: '550e8400-e29b-41d4-a716-446655440000',
        payeeAccountId: '660e8400-e29b-41d4-a716-446655440001',
        charges: [
          {
            chargeType: ChargeType.BASE_DELIVERY_FEE,
            amount: 5.0,
            currency: 'USD',
            quantity: 1,
            unitPrice: 5.0,
          },
        ],
        currency: 'USD',
      };

      const result = CreateInvoiceCommand.validate(minimalInput);

      expect(result.deliveryId).toBeUndefined();
      expect(result.orderId).toBeUndefined();
      expect(result.metadata).toBeUndefined();
    });

    it('should throw ZodError when payerAccountId is not a valid UUID', () => {
      const invalidInput = {
        ...validInput,
        payerAccountId: 'not-a-uuid',
      };

      expect(() => CreateInvoiceCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when charges array is empty', () => {
      const invalidInput = {
        ...validInput,
        charges: [],
      };

      expect(() => CreateInvoiceCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when currency is not exactly 3 characters', () => {
      const invalidInput = {
        ...validInput,
        currency: 'US',
      };

      expect(() => CreateInvoiceCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should throw ZodError when chargeType is invalid', () => {
      const invalidInput = {
        ...validInput,
        charges: [
          {
            chargeType: 'INVALID_TYPE',
            amount: 5.0,
            currency: 'USD',
            quantity: 1,
            unitPrice: 5.0,
          },
        ],
      };

      expect(() => CreateInvoiceCommand.validate(invalidInput)).toThrow(ZodError);
    });

    it('should allow negative amounts for discounts', () => {
      const inputWithDiscount = {
        ...validInput,
        charges: [
          {
            chargeType: ChargeType.DISCOUNT,
            amount: -10.0,
            currency: 'USD',
            quantity: 1,
            unitPrice: -10.0,
          },
        ],
      };

      const result = CreateInvoiceCommand.validate(inputWithDiscount);

      expect(result.charges[0].amount).toBe(-10.0);
    });
  });

  describe('safeValidate', () => {
    it('should return success: true for valid input', () => {
      const result = CreateInvoiceCommand.safeValidate(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should return success: false for invalid input', () => {
      const invalidInput = {
        ...validInput,
        charges: [],
      };

      const result = CreateInvoiceCommand.safeValidate(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create command instance with all properties', () => {
      const command = new CreateInvoiceCommand(validInput);

      expect(command.payerAccountId).toBe(validInput.payerAccountId);
      expect(command.payeeAccountId).toBe(validInput.payeeAccountId);
      expect(command.deliveryId).toBe(validInput.deliveryId);
      expect(command.orderId).toBe(validInput.orderId);
      expect(command.charges).toEqual(validInput.charges);
      expect(command.currency).toBe(validInput.currency);
      expect(command.metadata).toEqual(validInput.metadata);
    });
  });
});
