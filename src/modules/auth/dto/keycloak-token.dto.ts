import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class KeycloakTokenDto {
  @ApiProperty({ description: 'Keycloak access token' })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
