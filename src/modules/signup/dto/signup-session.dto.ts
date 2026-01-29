import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ActorType } from '../../actor/dto/actor.enums';

import { SignUpSessionStatus } from './signup.enums';

/**
 * SignUpSessionDto
 *
 * Data transfer object for representing a sign-up session.
 */
export class SignUpSessionDto {
  @ApiProperty({
    description: 'Unique identifier for the sign-up session',
    example: 'uuid-session-id',
  })
  sessionId!: string;

  @ApiProperty({
    enum: SignUpSessionStatus,
    description: 'Current status of the sign-up session',
    example: SignUpSessionStatus.PARTIAL,
  })
  status!: SignUpSessionStatus;

  @ApiProperty({
    enum: ActorType,
    description: 'The type of actor account being created',
    example: ActorType.Rider,
  })
  actorType!: ActorType;

  @ApiPropertyOptional({
    description: 'The workspace ID associated with the session',
    example: 'uuid-workspace-id',
  })
  workspaceId?: string | null;

  @ApiProperty({
    type: [String],
    description: 'Roles to be assigned to the actor',
    example: ['Rider'],
  })
  roles!: string[];

  @ApiProperty({
    type: [String],
    description: 'Wallets to be linked to the actor',
    example: ['0x123...'],
  })
  linkedWallets!: string[];

  @ApiProperty({
    type: [String],
    description: 'Names of steps already completed in the sign-up flow',
    example: ['init', 'identity-verification'],
  })
  completedSteps!: string[];

  @ApiProperty({
    description: 'When the session expires',
    example: '2024-01-01T00:00:00Z',
  })
  expiresAt!: Date;

  @ApiProperty({
    description: 'When the session was created',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the session was last updated',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;
}
