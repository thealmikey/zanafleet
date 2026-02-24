import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from '../../validation/validation.service';
import { ValidationRule } from '../../schema/v1/types';

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('Basic Validation', () => {
    it('should validate required field', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'name',
          rules: [{ type: 'required', severity: 'error' }],
        },
      ];

      const result1 = service.validate({ name: 'John' }, rules);
      const result2 = service.validate({ name: '' }, rules);
      const result3 = service.validate({}, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('should validate string length', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'username',
          rules: [
            { type: 'minLength', value: 3, severity: 'error' },
            { type: 'maxLength', value: 20, severity: 'error' },
          ],
        },
      ];

      const result1 = service.validate({ username: 'ab' }, rules);
      const result2 = service.validate({ username: 'abc' }, rules);
      const result3 = service.validate({ username: 'a'.repeat(25) }, rules);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(false);
    });

    it('should validate number range', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'age',
          rules: [
            { type: 'min', value: 18, severity: 'error' },
            { type: 'max', value: 100, severity: 'error' },
          ],
        },
      ];

      const result1 = service.validate({ age: 15 }, rules);
      const result2 = service.validate({ age: 25 }, rules);
      const result3 = service.validate({ age: 150 }, rules);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(false);
    });

    it('should validate email format', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'email',
          rules: [{ type: 'email', severity: 'error' }],
        },
      ];

      const result1 = service.validate({ email: 'john@example.com' }, rules);
      const result2 = service.validate({ email: 'invalid-email' }, rules);
      const result3 = service.validate({ email: 'missing@domain' }, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('should validate URL format', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'website',
          rules: [{ type: 'url', severity: 'error' }],
        },
      ];

      const result1 = service.validate({ website: 'https://example.com' }, rules);
      const result2 = service.validate({ website: 'not-a-url' }, rules);
      const result3 = service.validate({ website: 'ftp://example.com' }, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('should validate phone number', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'phone',
          rules: [{ type: 'phone', severity: 'error' }],
        },
      ];

      const result1 = service.validate({ phone: '+1-234-567-8900' }, rules);
      const result2 = service.validate({ phone: '123' }, rules);
      const result3 = service.validate({ phone: 'invalid' }, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('should validate pattern (regex)', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'code',
          rules: [{ type: 'pattern', value: '^[A-Z]{3}$', severity: 'error' }],
        },
      ];

      const result1 = service.validate({ code: 'ABC' }, rules);
      const result2 = service.validate({ code: 'abc' }, rules);
      const result3 = service.validate({ code: 'AB12' }, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });
  });

  describe('Multiple Rules', () => {
    it('should validate multiple rules on same field', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'password',
          rules: [
            { type: 'minLength', value: 8, severity: 'error' },
            { type: 'maxLength', value: 32, severity: 'error' },
          ],
        },
      ];

      const result1 = service.validate({ password: 'short' }, rules);
      const result2 = service.validate({ password: 'validpassword' }, rules);

      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(true);
    });

    it('should validate multiple fields', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'name',
          rules: [{ type: 'required', severity: 'error' }],
        },
        {
          id: 'rule-2',
          field: 'email',
          rules: [
            { type: 'required', severity: 'error' },
            { type: 'email', severity: 'error' },
          ],
        },
      ];

      const result1 = service.validate({ name: 'John', email: 'john@example.com' }, rules);
      const result2 = service.validate({ name: 'John', email: 'invalid' }, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
    });
  });

  describe('Warnings', () => {
    it('should report warnings without failing validation', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'username',
          rules: [
            { type: 'required', severity: 'error' },
            { type: 'minLength', value: 3, severity: 'warning' },
          ],
        },
      ];

      const result = service.validate({ username: 'ab' }, rules);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.warnings.length).toBe(1);
    });
  });

  describe('Nested Field Validation', () => {
    it('should validate nested fields', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'user.name',
          rules: [{ type: 'required', severity: 'error' }],
        },
      ];

      const result1 = service.validate({ user: { name: 'John' } }, rules);
      const result2 = service.validate({ user: {} }, rules);
      const result3 = service.validate({}, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    it('should validate deeply nested fields', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'user.profile.bio',
          rules: [{ type: 'maxLength', value: 500, severity: 'error' }],
        },
      ];

      const result = service.validate({ user: { profile: { bio: 'a'.repeat(600) } } }, rules);

      expect(result.valid).toBe(false);
    });
  });

  describe('Custom Error Messages', () => {
    it('should use custom error messages', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'email',
          rules: [
            { type: 'required', severity: 'error', message: 'Email is mandatory' },
            { type: 'email', severity: 'error', message: 'Please enter a valid email' },
          ],
        },
      ];

      const result = service.validate({ email: '' }, rules);

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toBe('Email is mandatory');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data object', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'name',
          rules: [{ type: 'required', severity: 'error' }],
        },
      ];

      const result = service.validate({}, rules);

      expect(result.valid).toBe(false);
    });

    it('should handle null values', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'name',
          rules: [{ type: 'required', severity: 'error' }],
        },
      ];

      const result = service.validate({ name: null }, rules);

      expect(result.valid).toBe(false);
    });

    it('should handle undefined values', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'name',
          rules: [{ type: 'required', severity: 'error' }],
        },
      ];

      const result = service.validate({ name: undefined }, rules);

      expect(result.valid).toBe(false);
    });

    it('should handle empty rules array', () => {
      const result = service.validate({ name: 'John' }, []);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should handle empty rules on field', () => {
      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'name',
          rules: [],
        },
      ];

      const result = service.validate({ name: '' }, rules);

      expect(result.valid).toBe(true);
    });
  });

  describe('Custom Validators', () => {
    it('should register and use custom validator', () => {
      service.register('custom', (value: unknown) => {
        return { valid: value === 'expected', message: 'Value must be "expected"' };
      });

      const rules: ValidationRule[] = [
        {
          id: 'rule-1',
          field: 'field',
          rules: [{ type: 'custom', severity: 'error' }],
        },
      ];

      const result1 = service.validate({ field: 'expected' }, rules);
      const result2 = service.validate({ field: 'other' }, rules);

      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(false);
    });
  });
});
