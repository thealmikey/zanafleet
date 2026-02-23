import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Zod validation schema for LoginDto
 */
export const LoginDtoSchema = z
  .object({
    identifier: z
      .string()
      .refine((val) => val.trim().length > 0, {
        message: 'Identifier is required',
      })
      .refine((val) => !val.includes('\n'), {
        message: 'Identifier cannot contain newlines',
      }),
    password: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    identifier: data.identifier.trim(),
  }));

export type LoginDtoInput = z.infer<typeof LoginDtoSchema>;

/**
 * LoginDto
 *
 * Request DTO for authentication login endpoint.
 * Validated using Zod schema.
 */
export class LoginDto {
  @ApiProperty({
    description: 'Actor identifier (UUID, email, or wallet address)',
    example: 'actor@example.com',
  })
  identifier!: string;

  @ApiPropertyOptional({
    description: 'Password for authentication (optional for wallet-based auth)',
    example: 'securePassword123',
  })
  password?: string;

  /**
   * Validates DTO input using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): LoginDtoInput {
    return LoginDtoSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, LoginDtoInput> {
    return LoginDtoSchema.safeParse(input);
  }
}

/**
 * Zod validation schema for LoginResponseDto
 */
export const LoginResponseDtoSchema = z.object({
  actorId: z.string().uuid(),
  workspaceId: z.string(),
  type: z.nativeEnum(ActorType),
  token: z.string().min(1),
  expiresAt: z.union([z.string(), z.date()]),
});

export type LoginResponseDtoInput = z.infer<typeof LoginResponseDtoSchema>;

/**
 * LoginResponseDto
 *
 * Response DTO for successful authentication.
 */
export class LoginResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the authenticated actor',
    example: 'uuid-actor-id',
  })
  actorId!: string;

  @ApiProperty({
    description: 'Workspace ID associated with the actor',
    example: 'uuid-workspace-id',
  })
  workspaceId!: string;

  @ApiProperty({
    enum: ActorType,
    description: 'Type of the authenticated actor',
    example: ActorType.HUMAN,
  })
  type!: ActorType;

  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token!: string;

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: '2024-01-01T01:00:00Z',
  })
  expiresAt!: Date;

  /**
   * Validates response output using Zod schema
   * Throws ZodError if validation fails
   */
  static validate(input: unknown): LoginResponseDtoInput {
    return LoginResponseDtoSchema.parse(input);
  }

  /**
   * Safe validation - returns result object instead of throwing
   */
  static safeValidate(input: unknown): z.SafeParseReturnType<unknown, LoginResponseDtoInput> {
    return LoginResponseDtoSchema.safeParse(input);
  }
}
