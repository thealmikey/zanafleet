// @ts-ignore
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/**
 * FinalizeSignUpDto
 *
 * DTO for finalising a multi-step sign-up process.
 * Validated using class-validator for incoming requests.
 */
export class FinalizeSignUpDto {
  @ApiProperty({
    description: 'The unique identifier of the sign-up session to finalize',
    example: 'uuid-session-id',
  })
  @IsUUID()
  sessionId!: string;
}
