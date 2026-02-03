import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';


/**
 * InitiateSignUpDto
 *
 * DTO for initiating a new multi-step sign-up process.
 * Validated using class-validator for incoming requests.
 */
export class InitiateSignUpDto {
  @ApiProperty({
    enum: ActorType as object,
    description: 'The type of actor account to be created',
    example: 'Rider',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment
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
