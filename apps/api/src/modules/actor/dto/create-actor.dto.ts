import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ActorType } from './actor.enums';

/**
 * CreateActorDto
 *
 * Data transfer object for creating a new actor.
 */
export class CreateActorDto {
  @ApiProperty({
    description: 'Email address of the actor',
    example: 'actor@example.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Username of the actor',
    example: 'john_doe',
  })
  username!: string;

  @ApiProperty({
    enum: ActorType,
    description: 'Type of the actor',
    example: ActorType.HUMAN,
  })
  type!: ActorType;

  @ApiPropertyOptional({
    description: 'Workspace ID to associate with the actor',
    example: 'uuid-workspace-id',
  })
  workspaceId?: string | null;
}
