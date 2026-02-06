import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

import { ActorType } from '../../actor/dto/actor.enums';

/**
 * AllowedWorkspaceTypesQueryDto
 *
 * Query parameters for getting allowed workspace types for an actor type.
 */
export class AllowedWorkspaceTypesQueryDto {
  @ApiProperty({
    enum: ActorType,
    description: 'The actor type to get allowed workspace types for',
    example: ActorType.Rider,
  })
  @IsEnum(ActorType)
  actorType!: ActorType;
}
