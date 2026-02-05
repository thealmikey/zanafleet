import { LocationSchema, LocationInput } from '@api/core/location';
import { BusinessType } from '@zanafleet/contracts';
import { z } from 'zod';


/**
 * Zod validation schema for CreateBusinessCommand
 * Ensures type safety and input validation at command level
 */
export const CreateBusinessCommandSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(255, 'Business name must not exceed 255 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\-\s()]+$/, 'Phone must be a valid phone number')
    .min(5, 'Phone must be at least 5 characters')
    .max(20, 'Phone must not exceed 20 characters'),
  location: LocationSchema,
  businessType: z.nativeEnum(BusinessType, {
    errorMap: () => ({
      message: `Business type must be one of: ${Object.values(BusinessType).join(', ')}`,
    }),
  }),
  email: z
    .string()
    .email('Email must be a valid email address')
    .trim()
    .toLowerCase()
    .optional()
    .or(z.null()),
});

export type CreateBusinessCommandInput = z.infer<typeof CreateBusinessCommandSchema>;

/**
 * CreateBusinessCommand
 * Command object representing the intent to create a new business
 * Part of the command pattern in the event-driven architecture
 */
export class CreateBusinessCommand {
  readonly businessName: string;
  readonly phone: string;
  readonly location: LocationInput;
  readonly businessType: BusinessType;
  readonly email: string | null;

  constructor(input: CreateBusinessCommandInput) {
    this.businessName = input.businessName;
    this.phone = input.phone;
    this.location = input.location;
    this.businessType = input.businessType;
    this.email = input.email ?? null;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateBusinessCommandInput {
    return CreateBusinessCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateBusinessCommandInput> {
    return CreateBusinessCommandSchema.safeParse(input);
  }
}
