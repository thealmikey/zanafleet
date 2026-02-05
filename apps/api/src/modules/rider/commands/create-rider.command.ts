import { LocationSchema, LocationInput } from '@api/core/location';
import { VehicleType } from '@zanafleet/contracts';
import { z } from 'zod';


/**
 * Zod validation schema for CreateRiderCommand
 * Ensures type safety and input validation at command level
 */
export const CreateRiderCommandSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(255, 'Full name must not exceed 255 characters'),
  nationalId: z
    .string()
    .trim()
    .min(1, 'National ID is required')
    .max(20, 'National ID must not exceed 20 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\-\s()]+$/, 'Phone must be a valid phone number')
    .min(5, 'Phone must be at least 5 characters')
    .max(20, 'Phone must not exceed 20 characters'),
  location: LocationSchema.optional().or(z.null()),
  vehicleType: z.nativeEnum(VehicleType, {
    errorMap: () => ({
      message: `Vehicle type must be one of: ${Object.values(VehicleType).join(', ')}`,
    }),
  }),
  saccoId: z.string().uuid('Sacco ID must be a valid UUID').optional().or(z.null()),
  email: z
    .string()
    .email('Email must be a valid email address')
    .trim()
    .toLowerCase()
    .optional()
    .or(z.null()),
});

export type CreateRiderCommandInput = z.infer<typeof CreateRiderCommandSchema>;

/**
 * CreateRiderCommand
 * Command object representing the intent to create a new rider
 * Part of the command pattern in the event-driven architecture
 */
export class CreateRiderCommand {
  readonly fullName: string;
  readonly nationalId: string;
  readonly phone: string;
  readonly location: LocationInput | null;
  readonly vehicleType: VehicleType;
  readonly saccoId: string | null;
  readonly email: string | null;

  constructor(input: CreateRiderCommandInput) {
    this.fullName = input.fullName;
    this.nationalId = input.nationalId;
    this.phone = input.phone;
    this.location = input.location ?? null;
    this.vehicleType = input.vehicleType;
    this.saccoId = input.saccoId ?? null;
    this.email = input.email ?? null;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateRiderCommandInput {
    return CreateRiderCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateRiderCommandInput> {
    return CreateRiderCommandSchema.safeParse(input);
  }
}
