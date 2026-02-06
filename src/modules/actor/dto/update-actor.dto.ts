import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * UpdateActorDto
 * Data transfer object for updating an actor's roles and linked wallets.
 * Used for HTTP request body validation.
 */
export class UpdateActorDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  linkedWallets?: string[];
}
