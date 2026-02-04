import { ActorType } from '@api/modules/actor/dto/actor.enums';
import { ApiProperty } from '@nestjs/swagger';


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
    enum: ActorType as object,
    description: 'The type of actor account being created',
    example: 'Rider',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  actorType!: ActorType;

  @ApiProperty({
    type: [String],
    description: 'The workspace IDs associated with the session',
    example: ['uuid-workspace-id'],
  })
  workspaceIds!: string[];

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
    description: 'Full name of the user',
    example: 'John Doe',
  })
  fullName?: string;

  @ApiProperty({
    description: 'National ID of the user',
    example: '12345678',
  })
  nationalId?: string;

  @ApiProperty({
    description: 'SACCO ID that the user is affiliated with',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  saccoId?: string;

  @ApiProperty({
    description: 'Business name associated with the user',
    example: 'John Doe Transporters',
  })
  businessName?: string;

  @ApiProperty({
    description: 'When the session was last updated',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;
}
