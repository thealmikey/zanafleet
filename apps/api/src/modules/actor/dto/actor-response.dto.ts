import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ActorType } from './actor.enums';

/**
 * ActorResponseDto
 *
 * Data transfer object for actor API responses.
 */
export class ActorResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the actor',
    example: 'uuid-actor-id',
  })
  actorId!: string;

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
    description: 'Workspace ID associated with the actor',
    example: 'uuid-workspace-id',
    nullable: true,
  })
  workspaceId!: string | null;

  @ApiProperty({
    description: 'When the actor was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the actor was last updated',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;
}
