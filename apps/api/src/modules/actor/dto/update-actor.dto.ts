import { ApiPropertyOptional } from '@nestjs/swagger';

import { ActorType } from './actor.enums';

/**
 * UpdateActorDto
 *
 * Data transfer object for updating an existing actor.
 */
export class UpdateActorDto {
  @ApiPropertyOptional({
    description: 'Email address of the actor',
    example: 'actor@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Username of the actor',
    example: 'john_doe',
  })
  username?: string;

  @ApiPropertyOptional({
    enum: ActorType,
    description: 'Type of the actor',
    example: ActorType.HUMAN,
  })
  type?: ActorType;

  @ApiPropertyOptional({
    description: 'Workspace ID to associate with the actor',
    example: 'uuid-workspace-id',
  })
  workspaceId?: string | null;
}
