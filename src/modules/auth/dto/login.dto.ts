// @ts-ignore - Swagger decorators may not resolve in some IDE contexts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * LoginDto
 *
 * Data transfer object for login request.
 * The identifier can be an actor ID (UUID) or a wallet address.
 */
export class LoginDto {
  @ApiProperty({
    description: 'Actor ID (UUID) or wallet address',
    example: '0x1234567890abcdef1234567890abcdef12345678',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;
}
