import { z } from 'zod';

/**
 * Zod validation schema for CreateOrderCommand
 * Mirrors CreateOrderInput contract and enforces input constraints.
 */
const ScheduledTimeSchema = z
  .preprocess((val) => {
    if (typeof val === 'string') {
      const d = new Date(val);
      return Number.isNaN(d.valueOf()) ? val : d;
    }
    return val;
  }, z.date())
  .optional();

export const CreateOrderCommandSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
  itemSummary: z
    .string()
    .trim()
    .min(1, 'Item summary must not be empty')
    .max(255, 'Item summary must not exceed 255 characters')
    .optional(),
  itemMetadata: z.record(z.string(), z.unknown()).optional(),
  customerName: z
    .string()
    .trim()
    .min(1, 'Customer name must not be empty')
    .max(255, 'Customer name must not exceed 255 characters')
    .optional(),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[\d\-\s()]+$/, 'Customer phone must be a valid phone number')
    .min(5, 'Customer phone must be at least 5 characters')
    .max(20, 'Customer phone must not exceed 20 characters')
    .optional(),
  scheduledTime: ScheduledTimeSchema,
});

export type CreateOrderCommandInput = z.infer<typeof CreateOrderCommandSchema>;

/**
 * CreateOrderCommand
 * Command object representing the intent to create a new order.
 */
export class CreateOrderCommand {
  readonly businessId: string;
  readonly itemSummary?: string;
  readonly itemMetadata?: Record<string, unknown>;
  readonly customerName?: string;
  readonly customerPhone?: string;
  readonly scheduledTime?: Date;

  constructor(input: CreateOrderCommandInput) {
    this.businessId = input.businessId;
    this.itemSummary = input.itemSummary;
    this.itemMetadata = input.itemMetadata;
    this.customerName = input.customerName;
    this.customerPhone = input.customerPhone;
    this.scheduledTime = input.scheduledTime;
  }

  /**
   * Validates command input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): CreateOrderCommandInput {
    return CreateOrderCommandSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, CreateOrderCommandInput> {
    return CreateOrderCommandSchema.safeParse(input);
  }
}
