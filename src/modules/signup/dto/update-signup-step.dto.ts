// @ts-ignore - Swagger decorators may not resolve in some IDE contexts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * UpdateSignUpStepDto
 *
 * DTO for updating a specific step in the sign-up process.
 * Validated using class-validator for incoming requests.
 */
export class UpdateSignUpStepDto {
  @ApiPropertyOptional({
    description: 'The name of the step being completed',
    example: 'work-details',
  })
  @IsString()
  @IsOptional()
  stepName?: string;

  @ApiPropertyOptional({
    description: 'Optional workspace ID to associate with the actor',
    example: 'uuid-workspace-id',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Roles to be assigned to the actor',
    example: ['Rider'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roles?: string[];

  @ApiPropertyOptional({
    description: 'Wallets to be linked to the actor',
    example: ['0x123...'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  linkedWallets?: string[];

  @ApiPropertyOptional({
    description: 'Optional idempotency key to prevent duplicate processing',
    example: 'uuid-idempotency-key',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
