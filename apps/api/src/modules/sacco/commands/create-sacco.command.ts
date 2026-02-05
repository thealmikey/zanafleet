import { LocationSchema, LocationInput } from '@api/core/location';
import { z } from 'zod';

/**
 * Zod validation schema for CreateSaccoCommand
 * Ensures type safety and input validation at command level
 */
export const CreateSaccoCommandSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters'),
  location: LocationSchema,
  contactPhone: z
    .string()
    .trim()
    .regex(/^[\d\-+\s()]+$/, 'Contact phone must contain only digits, spaces, and valid symbols')
    .min(5, 'Contact phone must be at least 5 characters')
    .max(20, 'Contact phone must not exceed 20 characters'),
});

export type CreateSaccoCommandInput = z.infer<typeof CreateSaccoCommandSchema>;

/**
 * CreateSaccoCommand
 * Command object representing the intent to create a new sacco
 * Part of the command pattern in the event-driven architecture
 */
export class CreateSaccoCommand {
  readonly name: string;
  readonly location: LocationInput;
  readonly contactPhone: string;

  constructor(input: CreateSaccoCommandInput) {
    this.name = input.name;
    this.location = input.location;
    this.contactPhone = input.contactPhone;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateSaccoCommandInput {
    return CreateSaccoCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateSaccoCommandInput> {
    return CreateSaccoCommandSchema.safeParse(input);
  }
}
