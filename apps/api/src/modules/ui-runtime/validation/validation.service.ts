import { Injectable, Logger } from '@nestjs/common';

import {
  ValidationRule,
  ValidationRuleSet,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../schema/v1/types';

/**
 * Validation Service
 * Validates form data and action payloads against defined rules
 */
@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  
  // Built-in validators
  private readonly validators: Map<string, ValidatorFunction> = new Map();

  constructor() {
    this.registerBuiltInValidators();
  }

  /**
   * Register a validator
   */
  register(name: string, validator: ValidatorFunction): void {
    this.validators.set(name, validator);
  }

  /**
   * Validate data against rules
   */
  validate(data: Record<string, unknown>, rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);
      
      for (const ruleSet of rule.rules) {
        const result = this.validateValue(value, ruleSet);
        
        if (!result.valid) {
          const error: ValidationError = {
            field: rule.field,
            message: ruleSet.message ?? this.getDefaultMessage(ruleSet.type),
            code: ruleSet.type,
            severity: ruleSet.severity ?? 'error',
          };
          
          if (error.severity === 'error') {
            errors.push(error);
          } else {
            warnings.push(error as ValidationWarning);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate a single value against a rule set
   */
  private validateValue(value: unknown, ruleSet: ValidationRuleSet): { valid: boolean } {
    switch (ruleSet.type) {
      case 'required':
        return { valid: value !== null && value !== undefined && value !== '' };
      
      case 'min':
        if (typeof value === 'number') {
          return { valid: value >= (ruleSet.value as number) };
        }
        if (typeof value === 'string') {
          return { valid: value.length >= (ruleSet.value as number) };
        }
        return { valid: true };
      
      case 'max':
        if (typeof value === 'number') {
          return { valid: value <= (ruleSet.value as number) };
        }
        if (typeof value === 'string') {
          return { valid: value.length <= (ruleSet.value as number) };
        }
        return { valid: true };
      
      case 'minLength':
        if (typeof value === 'string') {
          return { valid: value.length >= (ruleSet.value as number) };
        }
        if (Array.isArray(value)) {
          return { valid: value.length >= (ruleSet.value as number) };
        }
        return { valid: true };
      
      case 'maxLength':
        if (typeof value === 'string') {
          return { valid: value.length <= (ruleSet.value as number) };
        }
        if (Array.isArray(value)) {
          return { valid: value.length <= (ruleSet.value as number) };
        }
        return { valid: true };
      
      case 'pattern':
        if (typeof value === 'string') {
          const regex = new RegExp(ruleSet.value as string);
          return { valid: regex.test(value) };
        }
        return { valid: true };
      
      case 'email':
        if (typeof value === 'string') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return { valid: emailRegex.test(value) };
        }
        return { valid: true };
      
      case 'url':
        if (typeof value === 'string') {
          try {
            new URL(value);
            return { valid: true };
          } catch {
            return { valid: false };
          }
        }
        return { valid: true };
      
      case 'phone':
        if (typeof value === 'string') {
          const phoneRegex = /^[\d\s\-+()]+$/;
          return { valid: phoneRegex.test(value) && value.replace(/\D/g, '').length >= 10 };
        }
        return { valid: true };
      
      case 'match':
        // Field must match another field
        return { valid: true }; // Handled separately

      default: {
        // Check custom validators
        const customValidator = this.validators.get(ruleSet.type);
        if (customValidator) {
          return customValidator(value, ruleSet.value);
        }
        return { valid: true };
      }
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const keys = path.split('.');
    let value: unknown = obj;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Get default error message
   */
  private getDefaultMessage(type: string): string {
    const messages: Record<string, string> = {
      required: 'This field is required',
      min: 'Value is too small',
      max: 'Value is too large',
      minLength: 'Value is too short',
      maxLength: 'Value is too long',
      pattern: 'Invalid format',
      email: 'Invalid email address',
      url: 'Invalid URL',
      phone: 'Invalid phone number',
    };
    
    return messages[type] ?? 'Validation failed';
  }

  /**
   * Register built-in validators
   */
  private registerBuiltInValidators(): void {
    // Custom validators can be added here
    this.logger.debug('Registered built-in validators');
  }
}

/**
 * Validator function type
 */
type ValidatorFunction = (value: unknown, config?: unknown) => { valid: boolean; message?: string };
