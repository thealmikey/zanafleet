// @ts-ignore
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

import { ActorType } from '../../actor/dto/actor.enums';

/**
 * InitiateSignUpDto
 *
 * DTO for initiating a new multi-step sign-up process.
 * Validated using class-validator for incoming requests.
 */
export class InitiateSignUpDto {
  @ApiProperty({
    enum: ActorType,
    description: 'The type of actor account to be created',
    example: ActorType.Rider,
  })
  @IsEnum(ActorType)
  actorType!: ActorType;

  @ApiPropertyOptional({
    description: 'Optional idempotency key to prevent duplicate initiations',
    example: 'uuid-idempotency-key',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
